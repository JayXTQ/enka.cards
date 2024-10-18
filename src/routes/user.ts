import { Request, Response, Router } from 'express';
import { client } from '../s3';
import { generateParams } from '../utils/params';
import { sendImage, setupRoute } from '../utils/routes';
import { isReturnable, randomChars, RouteReturner } from '../utils/misc';
import { getHash, imageIfSameHash, sameHash } from '../utils/hashes';

const router = Router();

router.get(
	'/u/:username/:hoyo/:avatar/:build',
	async (req: Request, res: Response) => {
		const { enkaUrl, locale } = await setupRoute(req, res);
		if (!req.headers['user-agent']?.includes('Discordbot')) {
			return res.redirect(enkaUrl);
		}
		const params = generateParams(req, locale);
		const result = randomChars();
		const hashes = await getHash(
			params.Key,
			req.params.username,
			req.params.hoyo,
			req.params.avatar,
			req.params.build,
		);

		const imgCache = imageIfSameHash(hashes.hashes, params, locale, enkaUrl, result)

		if(isReturnable(imgCache)) return new RouteReturner(imgCache).returner(res);

		const img = await sendImage(
			locale,
			enkaUrl,
			res,
			params,
			hashes.hashes[1],
			false,
			result,
			hashes.hoyo_type,
		).catch(() => null);
		if (!img) return res.status(500).send('Error');
		if (!(img instanceof Buffer)) return img;
		res.setHeader('Content-Type', 'image/png');
		return res.end(img, 'binary');
	},
);

export default router;
