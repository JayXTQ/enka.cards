import { client } from '../s3';
import axios from 'axios';
import crypto from 'crypto';
import { RouteRespond } from './misc';

export async function getHash(
	key: string,
	username: string,
	hoyo: string,
	avatar: string,
	build: string,
): Promise<{ hashes: [string, string], hoyo_type: 0 | 1 }> {
	const settled = await Promise.allSettled([
		client.get(`${key.replace('.png', '')}.hash`),
		axios
			.get<Record<string, { id: number, avatarId: string, hoyo_type: 0 | 1 }[]>>(
				`https://enka.network/api/profile/${username}/hoyos/${hoyo}/builds/`,
			)
			.catch(() => null),
	]);

	const hash =
		settled[0].status === 'fulfilled' ? settled[0].value || '' : '';
	const api = settled[1].status === 'fulfilled' ? settled[1].value : null;
	const apiAvatar = api ? api.data[avatar] : null;
	const apiData = api
		? apiAvatar
			? apiAvatar.find((e: { id: number }) => e.id === parseInt(build)) ||
				null
			: null
		: null;
	const apiCall = apiData ? JSON.stringify(apiData) : '{}';
	const apiHash = crypto.createHash('md5').update(apiCall).digest('hex');
	return { hashes: [hash ? await hash.string() : '', apiHash], hoyo_type: apiData ? apiData.hoyo_type : 0 };
}

export async function getUidHash(
	key: string,
	apiHash: unknown,
): Promise<[string, string]> {
	const hash = await client
		.get(`${key.replace('.png', '')}.hash`)
		.catch(() => null);
	const apiCall = JSON.stringify(apiHash);
	const apiHash_ = crypto
		.createHash('md5')
		.update(apiCall || '')
		.digest('hex');
	return [(await hash?.string()) || '', apiHash_];
}

export function sameHash(hashes: [string, string]) {
	return hashes[0] === hashes[1];
}

export function imageIfSameHash(
	hashes: [string, string],
	params: { Key: string },
	locale: string,
	enkaUrl: string,
	result: string,
) {
	if (sameHash(hashes)) {
		return new RouteRespond(`<!DOCTYPE html>
		<html lang="${locale}">
			<head>
				<meta content="enka.cards" property="og:title" />
				<meta content="${enkaUrl}" property="og:url" />
				<meta name="twitter:card" content="summary_large_image">
				<meta property="twitter:domain" content="enka.cards">
				<meta property="twitter:url" content="${enkaUrl}">
				<meta name="twitter:title" content="enka.cards">
				<meta name="twitter:description" content="">
				<meta name="twitter:image" content="${client.getUrl(params.Key)}?${result}">
				<title>enka.cards</title>
			</head>
		</html>`);
	}
	return null;
}
