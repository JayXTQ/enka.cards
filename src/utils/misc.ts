import { Response } from 'express';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getImage, getUidImage } from './puppeteer';
import { client } from '../s3';

export function randomChars(){
	let result = '';
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const charactersLength = characters.length;
	let counter = 0;
	while (counter < 5) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
		counter += 1;
	}
	return result
}