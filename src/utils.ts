import { client } from './s3';
import axios from 'axios';
import crypto from 'crypto';
import { Response } from 'express';
import { getBrowser } from './puppeteer';
import sharp, { Sharp } from 'sharp';

export function randomChars(){
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < 5) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result
}

export async function getHash(key: string, paths: string[]): Promise<[string, string]> {

	const settled = await Promise.allSettled([
		client.get(`${key.replace('.png', '')}.hash` ),
		axios.get(`https://enka.network/api/profile/${paths[0]}/hoyos/${paths[1]}/builds/`).catch(() => null)
	])

	const hash = settled[0].status === 'fulfilled' ? settled[0].value || "" : "";
	const api = settled[1].status === 'fulfilled' ? settled[1].value : null;
	const apiData: Record<string | number, unknown> = api ? api.data[paths[2]].find((e: { id: number }) => e.id === parseInt(paths[3])) : null;
	const apiCall = apiData ? JSON.stringify(apiData) : '{}';
	const apiHash = crypto.createHash('md5').update(apiCall).digest('hex');
	return [(hash && hash.Body) ? await hash.Body.transformToString() : "", apiHash];
}

export function sameHash(hashes: [string, string]){
	return hashes[0] === hashes[1];
}

export async function getImage(locale: string, url: URL, enkaurl: string, res: Response) {
	const page = await (await getBrowser()).newPage();
	page.on('pageerror,', (err) => console.log('PAGE ERROR:', err));
	page.on('error', (err) => console.log('ERROR:', err));
	page.on('requestfailed', (req) => console.log('REQUEST FAILED:', req.url()));
	try {
		const cookies = [
			{ name: 'locale', value: locale, domain: 'enka.network', path: '/', expires: -1 },
			{
				name: 'globalToggles',
				value: 'eyJ1aWQiOnRydWUsIm5pY2tuYW1lIjp0cnVlLCJkYXJrIjpmYWxzZSwic2F2ZUltYWdlVG9TZXJ2ZXIiOmZhbHNlLCJzdWJzdGF0cyI6ZmFsc2UsInN1YnNCcmVha2Rvd24iOmZhbHNlLCJ1c2VyQ29udGVudCI6dHJ1ZSwiYWRhcHRpdmVDb2xvciI6ZmFsc2UsInByb2ZpbGVDYXRlZ29yeSI6MCwiaGlkZU5hbWVzIjpmYWxzZSwiaG95b190eXBlIjowfQ',
				domain: 'enka.network',
				path: '/',
				expires: -1,
			},
		];
		await Promise.allSettled([
			page.setUserAgent('Mozilla/5.0 (compatible; enka.cards/1.0; +https://cards.enka.network)'),
			page.setViewport({ width: 1920, height: 1080 }),
			page.setCookie(...cookies)
		]);
		await page.goto(enkaurl, { waitUntil: 'networkidle0' });
	} catch (error) {
		res.status(500);
		return res.send('An error occurred');
	}
	await page.waitForFunction('document.fonts.ready').catch(() => null);
	const html = await page.waitForSelector('div.Card').catch(() => null);
	if (!html) return res.status(500).send('No card found');
	let img: Sharp | Buffer | null = await html.screenshot({ type: 'png' }).catch(() => null);
	if (!img) return res.status(500).send('No image found');
	img = sharp(img);
	const imgmeta = await img.metadata();
	img = await img
		.composite([
			{
				input: Buffer.from(`<svg><rect x="0" y="0" width="${imgmeta.width}" height="${imgmeta.height}" rx="10" ry="10"/></svg>`),
				blend: 'dest-in',
			},
		])
		.toBuffer();
	await page.close();
	return img;
}