import { Request, Response, Router } from 'express';
import axios from 'axios';
import { getGICharacters } from '../utils/enka-api';
import { generateUidParams } from '../utils/params';
import { getCardNumber, sendImage, UidAPIData } from '../utils/routes';
import { getUidHash, sameHash } from '../utils/hashes';
import { randomChars } from '../utils/misc';
import { client } from '../s3';

const router = Router();

router.get('/u/:uid/:character', async (req: Request, res: Response) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	console.log('uid')
	const url = new URL(req.url, `${req.protocol}://${req.headers.host}`);
	const locale = url.searchParams.get('lang') || 'en';
	const character = req.params.character;
	const enkaUrl = `https://enka.network/u/${req.params.uid}`;

	if (!req.headers['user-agent']?.includes('Discordbot')) {
		return res.redirect(enkaUrl);
	}

	const apiCall = await axios.get(`https://enka.network/api/uid/${req.params.uid}`).catch(() => null);
	if(!apiCall) return res.status(404).send('Not found');

	const apiData: UidAPIData = apiCall.data;

	const cardNumber = await getCardNumber(apiData, locale, character);

	const params = generateUidParams(req, locale, cardNumber);
	const hashes = await getUidHash(params.Key, apiData.avatarInfoList[cardNumber]);
	const result = randomChars();

	if(sameHash(hashes)) {
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

	const img = await sendImage(locale, enkaUrl, res, params, hashes[1], false, result, true, cardNumber).catch(() => null);
	if (!img) return res.status(500).send('Error');
	if (!(img instanceof Buffer)) return img;
	res.setHeader('Content-Type', 'image/png');
	return res.end(img, 'binary');
})

export default router;