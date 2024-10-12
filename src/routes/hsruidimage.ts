import { Request, Response, Router } from 'express';
import axios from 'axios';
import { getGICharacters } from '../utils/enka-api';
import { generateUidParams } from '../utils/params';
import {
	getGICardNumber,
	sendImage,
	HSRUidAPIData,
	getHSRCardNumber,
} from '../utils/routes';
import { getUidHash, sameHash } from '../utils/hashes';
import { randomChars } from '../utils/misc';
import { client } from '../s3';

const router = Router();

router.get(
	'/hsr/:uid/:character/image',
	async (req: Request, res: Response) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
		const locale = url.searchParams.get('lang') || 'en';
		const character = req.params.character;
		const enkaUrl = `https://enka.network/hsr/${req.params.uid}`;
		const apiCall = await axios
			.get(`https://enka.network/api/hsr/uid/${req.params.uid}`)
			.catch(() => null);
		if (!apiCall) return res.status(404).send('Not found');

		const apiData: HSRUidAPIData = apiCall.data;

		const cardNumber = await getHSRCardNumber(apiData, locale, character);

		const params = generateUidParams(req, locale, cardNumber);
		const hashes = await getUidHash(
			params.Key,
			apiData.detailInfo.avatarDetailList[cardNumber],
		);
		const result = randomChars();

		let img = await client.get(params.Key).catch(() => null);

		if (!img || !sameHash(hashes)) {
			const img = await sendImage(
				locale,
				enkaUrl,
				res,
				params,
				hashes[1],
				true,
				result,
				true,
				cardNumber,
			).catch(() => null);
			if (!img) return res.status(500).send('Error');
			if (!(img instanceof Buffer)) return img;
			res.setHeader('Content-Type', 'image/png');
			return res.end(img, 'binary');
		}
		res.setHeader('Content-Type', 'image/png');
		const imgBody = await img.byteArray();
		if (!imgBody) {
			const img = await sendImage(
				locale,
				enkaUrl,
				res,
				params,
				hashes[1],
				true,
				result,
				true,
				cardNumber,
			).catch(() => null);
			if (!img) return res.status(500).send('Error');
			if (!(img instanceof Buffer)) return img;
			return res.end(img, 'binary');
		}
		return res.end(imgBody, 'binary');
	},
);

export default router;
