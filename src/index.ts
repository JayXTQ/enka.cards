import express, { Request, Response } from 'express';
import puppeteer, { Browser } from 'puppeteer';
import { S3Client, PutObjectCommand, GetObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
dotenv.config();

const app = express();

let browser: Promise<Browser> | Browser = puppeteer.launch({
	args: [
		'--no-sandbox',
		'--font-render-hinting=none',
		'--force-color-profile=srgb',
		'--disable-web-security',
		'--disable-setuid-sandbox',
		'--disable-features=IsolateOrigins',
		'--disable-site-isolation-trials',
	]
});

app.get('/u/:path*', async (req: Request, res: Response) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
	const path = url.pathname
		.split('/')
		.filter((e) => e !== '')
		.join('/');
	const splitPaths = path.split('/');
	const enkaurl = url.href.replace(url.host, 'enka.network').replace('http://', 'https://').replace('/image', '');
	const image = splitPaths.slice(-1)[0] === 'image';
	const locale = url.searchParams.get('lang') || 'en';
	if (!req.headers['user-agent']?.includes('Discordbot') && !image) {
		return res.redirect(enkaurl);
	}
	// https://cards.enka.network/u/jxtq/488BWO/10000089/3018594
	// http://localhost:3000/u/jxtq/488BWO/10000089/3018594
	if (/^(18|[1-35-9])\d{8}$/.test(splitPaths[1])) {
		return res.redirect(enkaurl);
	}
	if (splitPaths.filter((i) => i !== 'image').slice(-3).length !== 3) {
		return res.redirect(enkaurl);
	}
	const S3 = new S3Client({
		region: 'eu-west-2',
		credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID as string, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string },
	});
	const params = {
		Bucket: 'enkacards',
		Key: `${splitPaths
			.filter((i) => i !== 'image')
			.slice(-4)
			.join('-')}-${locale}.png`,
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
			return JSON.stringify(res.data[splitPaths[3]].find((e: { id: number }) => e.id === parseInt(splitPaths[4])));
		})
		.catch(() => {
			return '{}';
		});
	const apihash = crypto.createHash('md5').update(apicall).digest('hex');
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < 5) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	if (hash && hash.Body && (await hash.Body.transformToString()) === apihash) {
		if (image) {
			const img = await S3.send(new GetObjectCommand({ Bucket: 'enkacards', Key: params.Key }));
			res.setHeader('Content-Type', 'image/png');
			return res.end(await img.Body?.transformToByteArray(), 'binary');
		}
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
                <meta name="twitter:image" content="https://${params.Bucket}.s3.eu-west-2.amazonaws.com/${params.Key}?${result}">
            </head>
        </html>`);
	}
	browser = await browser;
	const page = await browser.newPage();
	page.on('console', (msg) => console.log(`PAGE ${msg.type().substring(0, 3).toUpperCase()} (${url.pathname}):`, msg.text()));
	page.on('pageerror,', (err) => console.log('PAGE ERROR:', err));
	page.on('error', (err) => console.log('ERROR:', err));
	page.on('requestfailed', (req) => console.log('REQUEST FAILED:', req.url()));
	await page.setUserAgent('Mozilla/5.0 (compatible; enka.cards/1.0; +https://cards.enka.network)');
	await page.setViewport({ width: 1920, height: 1080 });
	const cookies = [
		{ name: 'locale', value: locale, domain: 'enka.network', path: '/', expires: -1 },
		{
			name: 'globalToggles',
			value:
				'eyJ1aWQiOnRydWUsIm5pY2tuYW1lIjp0cnVlLCJkYXJrIjp0cnVlLCJzYXZlSW1hZ2VUb1NlcnZlciI6MCwic3Vic3RhdHMiOmZhbHNlLCJzdWJzQnJlYWtkb3duIjpmYWxzZSwidXNlckNvbnRlbnQiOnRydWUsImFkYXB0aXZlQ29sb3IiOmZhbHNlLCJob3lvX3R5cGUiOjAsInNub3ciOmZhbHNlfQ',
			domain: 'enka.network',
			path: '/',
			expires: -1,
		},
	];
	await page.setCookie(...cookies);
	await page.goto(enkaurl, { waitUntil: 'networkidle0' });
	await page.waitForFunction('document.fonts.ready');
	await page.waitForSelector('div.Card');
	const html = await page.$('div.Card');
	if (!html) return res.send('No card found');
	const img = await html.screenshot({ type: 'png' });
	await page.close();
	await S3.send(new PutObjectCommand({ ...params, Body: img }));
	await S3.send(
		new PutObjectCommand({ ...params, Key: `${params.Key.replace('.png', '')}.hash`, Body: apihash, ContentType: 'text/plain' })
	);
	if (!image)
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
			<meta name="twitter:image" content="https://${params.Bucket}.s3.eu-west-2.amazonaws.com/${params.Key}?${result}">
		</head>
	</html>`);
	res.setHeader('Content-Type', 'image/png');
	return res.end(img, 'binary');
});

app.get('/', (req: Request, res: Response) => {
	return res.redirect('https://enka.network');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});
