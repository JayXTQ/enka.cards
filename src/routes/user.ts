import { Request, Response, Router } from 'express';
import { client } from '../s3';
import { generateParams } from '../utils/params';
import { sendImage, setupRoute } from '../utils/routes';
import { randomChars } from '../utils/misc';
import { getHash, sameHash } from '../utils/hashes';

const router = Router();

router.get('/u/:username/:hoyo/:avatar/:build', async (req: Request, res: Response) => {
	const { enkaUrl, locale } = await setupRoute(req, res);
	if (!req.headers['user-agent']?.includes('Discordbot')) {
		return res.redirect(enkaUrl);
	}
	const params = generateParams(req, locale);
	const result = randomChars();
	const hashes = await getHash(params.Key, req.params.username, req.params.hoyo, req.params.avatar, req.params.build);
	if (sameHash(hashes)) {
		return res.send(`<!DOCTYPE html>
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
	const img = await sendImage(locale, enkaUrl, res, params, hashes[1], false, result).catch(() => null);
	if (!img) return res.status(500).send('Error');
	if (!(img instanceof Buffer)) return img;
	res.setHeader('Content-Type', 'image/png');
	return res.end(img, 'binary');
});

export default router;