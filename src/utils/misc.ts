import { Response } from 'express';

export function randomChars() {
	let result = '';
	const characters =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < 5) {
		result += characters.charAt(
			Math.floor(Math.random() * charactersLength),
		);
		counter += 1;
	}
	return result;
}

export class RouteError {
	message: string;
	code: number;
	constructor(message: string, code: number) {
		this.message = message;
		this.code = code;
	}
}

export class RouteRedirect {
	url: string;
	code: number;
	constructor(url: string, code = 302) {
		this.url = url;
		this.code = code;
	}
}

export class RouteRespond {
	message: string;
	code: number;
	constructor(message: string, code = 200) {
		this.message = message;
		this.code = code;
	}
}

export class RouteReturner {
	private readonly issue: RouteError | RouteRedirect;
	constructor(issue: RouteError | RouteRedirect) {
		this.issue = issue;
	}

	returner(res: Response) {
		if (this.issue instanceof RouteError || this.issue instanceof RouteRespond) {
			return res.status(this.issue.code).send(this.issue.message);
		}
		if (this.issue instanceof RouteRedirect) {
			return res.redirect(this.issue.code, this.issue.url);
		}
	}
}

export function isReturnable(returnable: unknown): returnable is RouteError | RouteRedirect | RouteRespond {
	return returnable instanceof RouteError || returnable instanceof RouteRedirect || returnable instanceof RouteRespond;
}

export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const defaultGlobalToggles = {
	"uid":true,
	"nickname":true,
	"dark":false,
	"saveImageToServer":false,
	"substats":false,
	"subsBreakdown":false,
	"userContent":true,
	"adaptiveColor":false,
	"profileCategory":0,
	"hideNames":false,
	"hoyo_type":0 as 0 | 1,
}

export function generateGlobalToggles(hoyo_type: 0 | 1, substats: boolean = false, subsBreakdown: boolean = true) {
	const globalToggles = {
		...defaultGlobalToggles,
		"substats":substats,
		"subsBreakdown":subsBreakdown,
		"hoyo_type":hoyo_type,
	}
	const jsonString = JSON.stringify(globalToggles);
	return Buffer.from(jsonString).toString('base64');
}
