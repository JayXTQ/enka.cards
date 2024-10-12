import { Browser, launch } from 'puppeteer';

let browser: Browser | null = null;

async function init() {
	const puppeteerBrowser = await launch({
		args: [
			'--no-sandbox',
			'--font-render-hinting=none',
			'--force-color-profile=srgb',
			'--disable-web-security',
			'--disable-setuid-sandbox',
			'--disable-features=IsolateOrigins',
			'--disable-site-isolation-trials',
		],
	});

	browser = puppeteerBrowser;
	return puppeteerBrowser;
}

export async function getBrowser() {
	if (!browser) {
		return await init();
	}
	return browser as Browser;
}
