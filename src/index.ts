// import * as cheerio from 'cheerio';
// import webshot from 'webshot-node'

export interface Env {
	BUCKET: R2Bucket;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		// if(!request.headers.get('User-Agent')?.includes('Discordbot')) return Response.redirect(url.href.replace(url.hostname, 'enka.network'));
		// if(!url.pathname.includes('/u/')) {
		// 	return Response.redirect('https://enka.network')
		// }
		// const path = url.pathname.split('/u/')[1];
		// let uid = false;
		// let image = false;
		// let lengths = {
		// 	negative: -3,
		// 	positive: 3
		// }
		// if(url.pathname.endsWith('/image') || url.pathname.endsWith('/image/')) image = true; lengths = { negative: -4, positive: 4 }
		// if(/^(18|[1-35-9])\d{8}$/.test(path.split('/')[0])) uid = true;
		// if(!uid && path.split('/').slice(lengths.negative).length !== lengths.positive) return Response.redirect(url.href.replace(url.hostname, 'enka.network'));
		// if(image) {
		// 	const page = await fetch(url.href.replace(url.hostname, 'enka.network'));
		// 	const html = await page.text();
		// 	const $ = cheerio.load(html);
		// 	const div = $('div.card-scroll')
		// 	const shot = webshot(String(div.html()), { siteType: 'html' })
		// 	request.headers.set('Content-Type', 'image/png');
		// 	return new Response(shot.read(), { headers: request.headers });
		// }
		return new Response(`<!DOCTYPE html>
<html>
	<head>
		<meta content="enka.cards" property="og:title" />
		<meta content="${url.href.replace('enka.cards', 'enka.network')}" property="og:url" />
	</head>
</html>`, { headers: { 'Content-Type': 'text/html' } })
	},
};

// <meta name="twitter:card" content="${url.href.endsWith('/') ? url.href + 'image' : url.href + '/image'}">
