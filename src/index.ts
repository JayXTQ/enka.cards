import express, { Request, Response } from 'express';
import puppeteer from 'puppeteer';
import { S3Client, PutObjectCommand, GetObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
dotenv.config();

const app = express();

app.get('/u/:path*', async (req: Request, res: Response) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
	const path = url.pathname
		.split('/')
		.filter((e) => e !== '')
		.join('/');
    const splitPaths = path.split('/');
	const enkaurl = url.href.replace(url.host, 'enka.network').replace('http://', 'https://');
	if (!req.headers['user-agent']?.includes('Discordbot')) {
		return res.redirect(enkaurl);
	}
	// https://enkacards-53395edefde1.herokuapp.com/u/jxtq/488BWO/10000089/3018594
	// http://localhost:3000/u/jxtq/488BWO/10000089/3018594
	if (/^(18|[1-35-9])\d{8}$/.test(splitPaths[1])) {
		return res.redirect(enkaurl);
	}
	if (splitPaths.slice(-3).length !== 3) {
		return res.redirect(enkaurl);
	}
	const S3 = new S3Client({
		region: 'eu-west-2',
		credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID as string, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string },
	});
	const params = {
		Bucket: 'enkacards',
		Key: `${splitPaths.slice(-4).join('-')}.png`,
		Body: '',
		ContentType: 'image/png',
		// ACL: 'public-read'
	};
	const hash = await S3.send(new GetObjectCommand({ Bucket: 'enkacards', Key: `${params.Key.replace('.png', '')}.hash` })).catch(
		() => null
	);
	let apicall = await axios
		.get(`https://enka.network/api/profile/${splitPaths[1]}/hoyos/${splitPaths[2]}/builds/`)
		.then((res) => { 
            return res.data[splitPaths[3]].find((e: { id: number }) => e.id === parseInt(splitPaths[4]))
        })
		.catch(() => { return null });
	if (!apicall) apicall = {}
	const apihash = crypto.createHash('md5').update(JSON.stringify(apicall)).digest('hex');
	if (hash && hash.Body && (await hash.Body.transformToString()) === apihash) {
		return res.send(`<!DOCTYPE html>
        <html>
            <head>
                <meta content="enka.cards" property="og:title" />
                <meta content="${enkaurl}" property="og:url" />
                <meta name="twitter:card" content="summary_large_image">
                <meta property="twitter:domain" content="enka.cards">
                <meta property="twitter:url" content="${enkaurl}">
                <meta name="twitter:title" content="enka.cards">
                <meta name="twitter:description" content="">
                <meta name="twitter:image" content="https://${params.Bucket}.s3.eu-west-2.amazonaws.com/${params.Key}">
            </head>
        </html>`);
	}
	const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
	const page = await browser.newPage();
	await page.setViewport({ width: 1920, height: 1080 });
	await page.goto(enkaurl);
	await page.waitForSelector('div.Card');
	const buttons = await page.$$('button.Button');
	for (let button of buttons) {
		const content = await (await button.$('span'))?.getProperty('textContent')?.then((e) => e.jsonValue());
		if (content === 'Allow user images') {
			await button.click();
		}
	}
	await page.$$eval('button.Button', async (buttons) => {
		for (let button of buttons) {
			await button.remove();
		}
	});
	const html = await page.$('div.Card');
	if (!html) return res.send('No card found');
	const img = await html.screenshot({ type: 'png' });
	await browser.close();
	await S3.send(new PutObjectCommand({ ...params, Body: img }));
	await S3.send(
		new PutObjectCommand({ ...params, Key: `${params.Key.replace('.png', '')}.hash`, Body: apihash, ContentType: 'text/plain' })
	);
	return res.send(`<!DOCTYPE html>
<html>
    <head>
        <meta content="enka.cards" property="og:title" />
        <meta content="${enkaurl}" property="og:url" />
        <meta name="twitter:card" content="summary_large_image">
        <meta property="twitter:domain" content="enka.cards">
        <meta property="twitter:url" content="${enkaurl}">
        <meta name="twitter:title" content="enka.cards">
        <meta name="twitter:description" content="">
        <meta name="twitter:image" content="https://${params.Bucket}.s3.eu-west-2.amazonaws.com/${params.Key}">
    </head>
</html>`);
});

app.get('/', (req: Request, res: Response) => {
	return res.redirect('https://enka.network');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
