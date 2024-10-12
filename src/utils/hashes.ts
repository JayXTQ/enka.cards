import { client } from '../s3';
import axios from 'axios';
import crypto from 'crypto';

export async function getHash(
	key: string,
	username: string,
	hoyo: string,
	avatar: string,
	build: string,
): Promise<[string, string]> {
	const settled = await Promise.allSettled([
		client.get(`${key.replace('.png', '')}.hash`),
		axios
			.get(
				`https://enka.network/api/profile/${username}/hoyos/${hoyo}/builds/`,
			)
			.catch(() => null),
	]);

	const hash =
		settled[0].status === 'fulfilled' ? settled[0].value || '' : '';
	const api = settled[1].status === 'fulfilled' ? settled[1].value : null;
	const apiAvatar = api ? api.data[avatar] : null;
	const apiData: Record<string | number, unknown> | null = api
		? apiAvatar
			? apiAvatar.find((e: { id: number }) => e.id === parseInt(build)) ||
				null
			: null
		: null;
	const apiCall = apiData ? JSON.stringify(apiData) : '{}';
	const apiHash = crypto.createHash('md5').update(apiCall).digest('hex');
	return [hash ? await hash.string() : '', apiHash];
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
