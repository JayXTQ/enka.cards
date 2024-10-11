import {
	S3Client,
	GetObjectCommand,
	DeleteObjectCommand,
	PutObjectCommand,
	PutObjectCommandInput, ListBucketsCommand, CreateBucketCommand
} from '@aws-sdk/client-s3';

let S3: S3Client | null = null;

function init() {
	const client = new S3Client({
		endpoint: process.env.S3_ENDPOINT,
		credentials: { accessKeyId: process.env.ACCESS_KEY_ID as string, secretAccessKey: process.env.SECRET_ACCESS_KEY as string },
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

async function checkBucket(){
	const client = getClient();
	const buckets = await client.send(new ListBucketsCommand({}));
	console.log(buckets)
	if (!buckets.Buckets?.find(e => e.Name === 'enkacards')){
		await client.send(new CreateBucketCommand({ Bucket: 'enkacards', ACL: 'public-read' }));
	}
}

class Client {
	private readonly client: S3Client;

	constructor() {
		this.client = getClient();
	}

	async get(Key: string) {
		await checkBucket();
		return await this.client.send(new GetObjectCommand({ Bucket: 'enkacards', Key })).catch((err) => {
			console.error(err)
			return null;
		});
	}

	getUrl(Key: string) {
		return `${process.env.S3_ENDPOINT}/enkacards/${Key}`;
	}

	async delete(Key: string) {
		await checkBucket();
		return await this.client.send(new DeleteObjectCommand({ Bucket: 'enkacards', Key })).catch((err) => {
			console.error(err)
			return null;
		});
	}

	async put(Key: string, Body: PutObjectCommandInput['Body'], ContentType: string = 'image/png') {
		await checkBucket();
		return await this.client.send(new PutObjectCommand({ Bucket: 'enkacards', Key, Body, ContentType })).catch((err) => {
			console.error(err)
			return null;
		});
	}
}

export const client = new Client();