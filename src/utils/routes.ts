import { Request, Response } from 'express';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getImage, getUidImage } from './puppeteer';
import { client } from '../s3';
import { Characters, getGICharacters, getHSRCharacters } from './enka-api';
import axios from 'axios';
import { generateUidParams } from './params';
import { getUidHash } from './hashes';
import { randomChars, RouteError, RouteRedirect } from './misc';

export async function setupRoute(req: Request, res: Response) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
	const paramsPath =
		req.params.username +
		'/' +
		req.params.hoyo +
		'/' +
		req.params.avatar +
		'/' +
		req.params.build;
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
	cardNumber?: number,
) {
	const img =
		!uid || cardNumber === undefined
			? await getImage(locale, enkaurl, res)
			: await getUidImage(locale, enkaurl, res, cardNumber);
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

export type GIUidAPIData = {
	[k: string]: unknown;
	avatarInfoList: {
		avatarId: number;
		[k: string]: unknown;
	}[];
};

function getCardNumber(
	avIdToIndex: (id: number) => number | null,
	characterList: Characters[],
	character: string,
) {
	const avatarId = avIdToIndex(parseInt(character));
	const cardNoOrName =
		character.length === 1
			? parseInt(character) - 1
			: avIdToIndex(
					parseInt(
						characterList.find((e) => e.name === character)
							?.characterId || '0',
					),
				);
	let cardNumber = avatarId !== null ? avatarId : cardNoOrName;
	if (!cardNumber) cardNumber = 0;
	if (cardNumber === -1) cardNumber = 0;
	return cardNumber;
}

export async function getGICardNumber(
	apiData: GIUidAPIData,
	locale: string,
	character: string,
) {
	const GICharacters = await getGICharacters(locale);
	function avIdToIndex(id: number) {
		const index = apiData.avatarInfoList.findIndex(
			(e) => e.avatarId === id,
		);
		const ret = index === -1 ? null : index;
		return ret;
	}
	return getCardNumber(avIdToIndex, GICharacters, character);
}

export type HSRUidAPIData = {
	detailInfo: {
		avatarDetailList: {
			avatarId: number;
			[k: string]: unknown;
		}[];
	};
	[k: string]: unknown;
};

export async function getHSRCardNumber(
	apiData: HSRUidAPIData,
	locale: string,
	character: string,
) {
	const HSRCharacters = await getHSRCharacters(locale);
	function avIdToIndex(id: number) {
		const index = apiData.detailInfo.avatarDetailList.findIndex(
			(e) => e.avatarId === id,
		);
		const ret = index === -1 ? null : index;
		return ret;
	}
	return getCardNumber(avIdToIndex, HSRCharacters, character);
}

async function uidRoute(
	req: Request,
	res: Response,
	image: boolean,
	hoyo_type: 0 | 1,
) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
	const locale = url.searchParams.get('lang') || 'en';
	const character = req.params.character;
	const enkaUrl = `https://enka.network/${hoyo_type === 0 ? 'u' : 'hsr'}/${req.params.uid}`;

	if (!image && !req.headers['user-agent']?.includes('Discordbot')) {
		return new RouteRedirect(enkaUrl);
	}

	const apiUrl = hoyo_type === 0 ? 'uid' : 'hsr/uid';

	const apiCall = await axios
		.get(`https://enka.network/api/${apiUrl}/${req.params.uid}`)
		.catch(() => null);
	if (!apiCall) return new RouteError('Not found', 404);
	const result = randomChars();
	return { locale, character, enkaUrl, apiCall, result };
}

export type SetupRouteReturn = {
	enkaUrl: string;
	locale: string;
	cardNumber: number;
	params: {Bucket: string; Key: string; Body: string; ContentType: string};
	hashes: [string, string];
	result: string;
} | RouteError | RouteRedirect;

export async function setupGIUidRoute(
	req: Request,
	res: Response,
	image: boolean
): Promise<SetupRouteReturn> {
	const route = await uidRoute(req, res, image, 0);

	if (route instanceof RouteError || route instanceof RouteRedirect) return route;
	const { locale, character, enkaUrl, apiCall, result } = route;

	const apiData: GIUidAPIData = apiCall.data;

	const cardNumber = await getGICardNumber(apiData, locale, character);

	const params = generateUidParams(req, locale, cardNumber);
	const hashes = await getUidHash(
		params.Key,
		apiData.avatarInfoList[cardNumber],
	);
	return { enkaUrl, locale, cardNumber, params, hashes, result };
}

export async function setupHSRUidRoute(
	req: Request,
	res: Response,
	image: boolean
): Promise<SetupRouteReturn> {
	const route = await uidRoute(req, res, image, 1);

	if (route instanceof RouteError || route instanceof RouteRedirect) return route;
	const { locale, character, enkaUrl, apiCall, result } = route;

	const apiData: HSRUidAPIData = apiCall.data;

	const cardNumber = await getHSRCardNumber(apiData, locale, character);

	const params = generateUidParams(req, locale, cardNumber);
	const hashes = await getUidHash(
		params.Key,
		apiData.detailInfo.avatarDetailList[cardNumber],
	);
	return { enkaUrl, locale, cardNumber, params, hashes, result };
}
