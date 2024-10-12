import { Request, Response } from 'express';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getImage, getUidImage } from './puppeteer';
import { client } from '../s3';

export async function setupRoute(req: Request, res: Response) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
	const paramsPath = req.params.username + '/' + req.params.hoyo + '/' + req.params.avatar + '/' + req.params.build;
	const enkaUrl = `https://enka.network/u/${paramsPath}`;
	const locale = url.searchParams.get('lang') || 'en';
	return { enkaUrl, locale };
}

export async function sendImage(
	locale: string,
	enkaurl: string,
	res: Response,
	params: PutObjectCommandInput & { Key: string },
	apihash: string,
	image: boolean,
	result: string,
	uid = false,
	cardNumber?: number
) {
	const img = !uid || !cardNumber ? await getImage(locale, enkaurl, res) : await getUidImage(locale, enkaurl, res, cardNumber);
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
			<meta name="twitter:image" content="${client.getUrl(params.Key)}?${result}">
			<title>enka.cards</title>
		</head>
	</html>`);
	return img;
}