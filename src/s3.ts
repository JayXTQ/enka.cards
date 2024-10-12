import {
	S3Client,
	GetObjectCommand,
	DeleteObjectCommand,
	PutObjectCommand,
	PutObjectCommandInput, ListBucketsCommand, CreateBucketCommand
} from '@aws-sdk/client-s3';
import { Client as MinioClient } from 'minio';
import { Readable } from 'stream';

let S3: MinioClient | null = null;

function init() {
	const client = new MinioClient({
		endPoint: process.env.S3_ENDPOINT as string,
		useSSL: true,
		accessKey: process.env.ACCESS_KEY_ID as string,
		secretKey: process.env.SECRET_ACCESS_KEY as string,
	})

	S3 = client;
	return client;
}

function getClient() {
	if (!S3) {
		return init();
	}
	return S3 as MinioClient;
}

async function checkBucket(){
	const client = getClient();
	if(!await client.bucketExists('enkacards')) {
		await client.makeBucket('enkacards');
		await Promise.allSettled([
			client.setBucketPolicy('enkacards', JSON.stringify({
				"Version": "2012-10-17",
				"Statement": [
					{
						"Effect": "Allow",
						"Principal": {
							"AWS": [
								"*"
							]
						},
						"Action": [
							"s3:GetObject"
						],
						"Resource": [
							"arn:aws:s3:::enkacards/*"
						]
					}
				]
			})),
			client.setBucketLifecycle('enkacards', {
				Rule: [
					{
						ID: 'Delete images after 1 day',
						Status: 'Enabled',
						Expiration: {
							Days: 1
						}
					}
				]
			})
		])
	}
}

class Client {
	private readonly client: MinioClient;

	constructor() {
		this.client = getClient();
	}

	async get(Key: string) {
		await checkBucket();

		const obj = await this.client.getObject('enkacards', Key).catch((err) => {
			// console.error(err)
			return null;
		});

		if (!obj) return null;

		async function byteArray(){
			const chunks: Uint8Array[] = [];
			for await (const chunk of obj as NonNullable<typeof obj>) {
				chunks.push(chunk);
			}

			const byteArray = Buffer.concat(chunks);
			return byteArray;
		}

		async function string(){
			let str = '';
			for await (const chunk of obj as NonNullable<typeof obj>) {
				str += chunk.toString();
			}

			return str;
		}

		return {
			string,
			byteArray
		};
	}

	getUrl(Key: string) {
		return `https://${process.env.S3_ENDPOINT}/enkacards/${Key}`;
	}

	async delete(Key: string) {
		await checkBucket();
		return await this.client.removeObject('enkacards', Key).catch((err) => {
			console.error(err)
			return null;
		});
	}

	async put(Key: string, Body: NonNullable<PutObjectCommandInput['Body']>, ContentType: string = 'image/png') {
		await checkBucket();

		if (typeof Body === 'string') {
			Body = Readable.from(Body);
		}
		if(Body instanceof Uint8Array) Body = Readable.from(Body);
		if(Body instanceof Blob) Body = Readable.from(Buffer.from(await Body.arrayBuffer()));

		return await this.client.putObject('enkacards', Key, Body, undefined, {
			ContentType
		}).catch((err) => {
			console.error(err)
			return null;
		});
	}
}

export const client = new Client();