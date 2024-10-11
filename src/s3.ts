import { S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { StreamingBlobPayloadInputTypes } from '@smithy/types';

let S3: S3Client | null = null;

function init() {
	const client = new S3Client({
		region: 'eu-west-2',
		credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID as string, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string },
	});

	S3 = client;
	return client;
}

function getClient() {
	if (!S3) {
		return init();
	}
	return S3 as S3Client;
}

class Client {
	private readonly client: S3Client;

	constructor() {
		this.client = getClient();
	}

	async get(Key: string) {
		return await this.client.send(new GetObjectCommand({ Bucket: 'enkacards', Key })).catch(() => null);
	}

	async delete(Key: string) {
		return await this.client.send(new DeleteObjectCommand({ Bucket: 'enkacards', Key })).catch(() => null);
	}

	async put(Key: string, Body: StreamingBlobPayloadInputTypes, ContentType: string = 'image/png') {
		return await this.client.send(new PutObjectCommand({ Bucket: 'enkacards', Key, Body, ContentType })).catch(() => null);
	}
}

export const client = new Client();