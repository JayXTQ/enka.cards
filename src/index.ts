import express, { Request, Response } from 'express';
import puppeteer from 'puppeteer';
import { S3Client, PutObjectCommand, GetObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.get('/u/:path*', async (req: Request, res: Response) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
    const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
    // if (!req.headers['user-agent']?.includes('Discordbot')) {
    //     return res.redirect(url.href.replace(url.host, 'enka.network').replace('http://', 'https://'));
    // }
    // https://enkacards-53395edefde1.herokuapp.com/u/jxtq/488BWO/10000089/3018594
    let uid = false;
    let lengths = {
        negative: -3,
        positive: 3
    };
    if (/^(18|[1-35-9])\d{8}$/.test(url.pathname.split('/')[0])) {
        uid = true;
    }
    if (!uid && url.pathname.split('/').slice(lengths.negative).length !== lengths.positive) {
        return res.redirect(url.href.replace(url.host, 'enka.network').replace('http://', 'https://'));
    }
    const browser = await puppeteer.launch({ args: ['--no-sandbox']});
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    const enkaurl = url.href.replace(url.host, 'enka.network').replace('http://', 'https://');
    await page.goto(enkaurl);
    await page.setCookie({ name: 'globalToggles', value: 'eyJ1aWQiOnRydWUsIm5pY2tuYW1lIjp0cnVlLCJkYXJrIjpmYWxzZSwic2F2ZUltYWdlVG9TZXJ2ZXIiOmZhbHNlLCJzdWJzdGF0cyI6ZmFsc2UsInN1YnNCcmVha2Rvd24iOmZhbHNlLCJ1c2VyQ29udGVudCI6dHJ1ZSwiYWRhcHRpdmVDb2xvciI6ZmFsc2UsImhveW9fdHlwZSI6MH0' }) // this is a base64 json file, not a real cookie
    await page.waitForSelector('div.Card');
    // const buttons = await page.$$('button.Button');
    const html = await page.$('div.Card')
    if(!html) return res.send('No card found');
    const img = await html.screenshot({ type: 'png' });
    await browser.close();
    const params: PutObjectCommandInput = {
        Bucket: 'enkacards',
        Key: `${url.pathname.split("/").slice(-4).join("-")}.png`,
        Body: img,
        ContentType: 'image/png',
        // ACL: 'public-read'
    };
    const S3 = new S3Client({ region: 'eu-west-2', credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID as string, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string } });
    await S3.send(new PutObjectCommand(params));
    return res.send(`<!DOCTYPE html>
<html>
    <head>
        <meta content="enka.cards" property="og:title" />
        <meta content="${url.href.replace(url.host, 'enka.network').replace('http://', 'https://')}" property="og:url" />
        <meta content="https://${params.Bucket}.s3.eu-west-2.amazonaws.com/${params.Key}" property="og:image" />
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