import express, { Request, Response } from 'express';
import * as cheerio from 'cheerio';
import nodeHtmlToImage from 'node-html-to-image';
import axios from 'axios';
import puppeteer from 'puppeteer';

const app = express();

app.get('/u/:path*', async (req: Request, res: Response) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
    const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
    // if (!req.headers['user-agent']?.includes('Discordbot')) {
    //     return res.redirect(url.replace(req.hostname, 'enka.network'));
    // }
    let uid = false;
    let image = false;
    let lengths = {
        negative: -3,
        positive: 3
    };
    if (url.href.endsWith('/image') || url.href.endsWith('/image/')) {
        image = true;
        lengths = { negative: -4, positive: 4 };
    }
    // if (/^(18|[1-35-9])\d{8}$/.test(url.pathname.split('/')[0])) {
    //     uid = true;
    // }
    if (!uid && url.pathname.split('/').slice(lengths.negative).length !== lengths.positive) {
        return res.redirect(url.href.replace(url.host, 'enka.network'));
    }
    if (image) {
        const browser = await puppeteer.launch();
		const page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080 });
		const enkaurl = url.href.replace(url.host, 'enka.network').replace('/image', '').replace('http://', 'https://');
		await page.goto(enkaurl);
		await page.waitForSelector('div.Card');
		const buttons = await page.$$('button.Button');
		for(let button of buttons) {
			const content = await (await button.$('span'))?.getProperty('textContent')?.then((e) => e.jsonValue());
			if(content === 'Allow user images'){
				await button.click();
			}
		}
		await page.$$eval('button.Button', async (buttons) => {
			for(let button of buttons){
				await button.remove();
			}
		})
		const html = await page.$('div.Card')
		if(!html) return res.send('No card found');
		const img = await html.screenshot({ type: 'png' });
		await browser.close();
		res.writeHead(200, { 'Content-Type': 'image/png' });
		return res.end(img, 'binary');
    }
    return res.send(`<!DOCTYPE html>
<html>
    <head>
        <meta content="enka.cards" property="og:title" />
        <meta content="${url.href.replace(url.host, 'enka.network')}" property="og:url" />
        <meta name="twitter:card" content="${url.href.endsWith('/') ? url.href + 'image' : url.href + '/image'}">
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