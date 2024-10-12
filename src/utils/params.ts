import { Request } from 'express';

export function generateUidParams(req: Request, locale: string, cardNumber: number) {
	return {
		Bucket: 'enkacards',
		Key: `${req.params.uid}-${cardNumber}-${locale}.png`,
		Body: '',
		ContentType: 'image/png',
		// ACL: 'public-read'
	};
}

export function generateParams(req: Request, locale: string){
	return {
		Bucket: 'enkacards',
		Key: `${req.params.username}-${req.params.hoyo}-${req.params.avatar}-${req.params.build}-${locale}.png`,
		Body: '',
		ContentType: 'image/png',
		// ACL: 'public-read'
	};
}