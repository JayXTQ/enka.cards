import { Request, Response, Router } from 'express';
import { client } from '../s3';
import { sendImage, setupRoute } from '../utils/routes';
import { generateParams } from '../utils/params';
import { getHash, sameHash } from '../utils/hashes';
import { randomChars } from '../utils/misc';

const router = Router();

router.get(
	'/u/:username/:hoyo/:avatar/:build/image',
	async (req: Request, res: Response) => {
		const { enkaUrl, locale } = await setupRoute(req, res);

		const params = generateParams(req, locale);

		const hashes = await getHash(
			params.Key,
			req.params.username,
			req.params.hoyo,
			req.params.avatar,
			req.params.build,
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
			).catch(() => null);
			if (!img) return res.status(500).send('Error');
			if (!(img instanceof Buffer)) return img;
			return res.end(img, 'binary');
		}
		return res.end(imgBody, 'binary');
	},
);

export default router;
