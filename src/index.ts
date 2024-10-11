import express, { Request, Response } from 'express';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { client } from './s3';
import { getHash, getImage, randomChars, sameHash } from './utils';

dotenv.config();

const app = express();


// https://cards.enka.network/u/jxtq/488BWO/10000089/3018594
// http://localhost:3000/u/jxtq/488BWO/10000089/3018594

async function setupRoute(req: Request, res: Response) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
	const paramsPath = req.params.path + req.params['0'];
	const path = paramsPath
		.split('/')
		.filter((e) => e !== '')
		.join('/');
	const splitPaths = path.split('/');
	const enkaurl = `https://enka.network/u/${paramsPath}`;
	const locale = url.searchParams.get('lang') || 'en';
	return { url, splitPaths, enkaurl, locale };
}

app.get('/u/:path*/image', async (req: Request, res: Response) => {
	const { url, splitPaths, enkaurl, locale } = await setupRoute(req, res);

	const params = {
		Bucket: 'enkacards',
		Key: `${splitPaths.join('-')}-${locale}.png`,
		Body: '',
		ContentType: 'image/png',
		// ACL: 'public-read'
	};

	const hashes = await getHash(params.Key, splitPaths);
	const result = randomChars();

	let img = await client.get(params.Key).catch(() => null);
	if (!img) {
		await client.delete(`${params.Key.replace('.png', '')}.hash`);
		const img = await sendImage(locale, url, enkaurl, res, params, hashes[1], true, result).catch(() => null);
		if (!img) return res.status(500).send('Error');
		if (!(img instanceof Buffer)) return img;
		res.setHeader('Content-Type', 'image/png');
		return res.end(img, 'binary');
	}
	res.setHeader('Content-Type', 'image/png');
	const imgBody = await img.Body?.transformToByteArray();
	if (!imgBody) {
		await client.delete(`${params.Key.replace('.png', '')}.hash`);
		await client.delete(params.Key);
		const img = await sendImage(locale, url, enkaurl, res, params, hashes[1], true, result).catch(() => null);
		if (!img) return res.status(500).send('Error');
		if (!(img instanceof Buffer)) return img;
		return res.end(img, 'binary');
	}
	return res.end(imgBody, 'binary');
});

app.get('/u/:path*', async (req: Request, res: Response) => {
	const { url, splitPaths, enkaurl, locale } = await setupRoute(req, res);
	if (!req.headers['user-agent']?.includes('Discordbot')) {
		return res.redirect(enkaurl);
	}
	if (splitPaths.length !== 4) {
		return res.redirect(enkaurl);
	}
	const params = {
		Bucket: 'enkacards',
		Key: `${splitPaths.join('-')}-${locale}.png`,
		Body: '',
		ContentType: 'image/png',
		// ACL: 'public-read'
	};
	const result = randomChars();
	const hashes = await getHash(params.Key, splitPaths);
	if (sameHash(hashes)) {
		return res.send(`<!DOCTYPE html>
        <html lang="${locale}">
            <head>
                <meta content="enka.cards" property="og:title" />
                <meta content="${enkaurl}" property="og:url" />
                <meta name="twitter:card" content="summary_large_image">
                <meta property="twitter:domain" content="enka.cards">
                <meta property="twitter:url" content="${enkaurl}">
                <meta name="twitter:title" content="enka.cards">
                <meta name="twitter:description" content="">
                <meta name="twitter:image" content="https://${params.Bucket}.s3.eu-west-2.amazonaws.com/${params.Key}?${result}">
                <title>enka.cards</title>
            </head>
        </html>`);
	}
	const img = await sendImage(locale, url, enkaurl, res, params, hashes[1], false, result).catch(() => null);
	if (!img) return res.status(500).send('Error');
	if (!(img instanceof Buffer)) return img;
	res.setHeader('Content-Type', 'image/png');
	return res.end(img, 'binary');
});

app.get('/', (_: Request, res: Response) => {
	return res.redirect('https://enka.network');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});

async function sendImage(
	locale: string,
	url: URL,
	enkaurl: string,
	res: Response,
	params: PutObjectCommandInput & { Key: string },
	apihash: string,
	image: boolean,
	result: string,
) {
	const img = await getImage(locale, url, enkaurl, res);
	if (!(img instanceof Buffer)) return img;
	try {
		await Promise.allSettled([
			client.put(`${params.Key.replace('.png', '')}.hash`, apihash),
			client.put(params.Key, img),
		]);
	} catch (e) {
		console.error(e);
	}
	if (!image)
		return res.send(`<!DOCTYPE html>
	<html lang="${locale}">
		<head>
			<meta content="enka.cards" property="og:title" />
			<meta content="${enkaurl}" property="og:url" />
			<meta name="twitter:card" content="summary_large_image">
			<meta property="twitter:domain" content="enka.cards">
			<meta property="twitter:url" content="${enkaurl}">
			<meta name="twitter:title" content="enka.cards">
			<meta name="twitter:description" content="">
			<meta name="twitter:image" content="https://${params.Bucket}.s3.eu-west-2.amazonaws.com/${params.Key}?${result}">
			<title>enka.cards</title>
		</head>
	</html>`);
	return img;
}