import { Request, Response, Router } from 'express';
import {
	sendImage,
	setupHSRUidRoute
} from '../utils/routes';
import { sameHash } from '../utils/hashes';
import { isReturnable, RouteError, RouteRedirect, RouteReturner } from '../utils/misc';
import { client } from '../s3';

const router = Router();

router.get(
	'/hsr/:uid/:character/image',
	async (req: Request, res: Response) => {
		const route = await setupHSRUidRoute(req, res, true);
		if(isReturnable(route)) return new RouteReturner(route).returner(res);
		const { locale, enkaUrl, result, params, hashes, cardNumber } = route;

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
