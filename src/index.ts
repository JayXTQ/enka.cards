import express, { Request, Response } from 'express';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { client } from './s3';
import axios from 'axios';
import uid from './routes/uid';
import uidimage from './routes/uidimage';
import user from './routes/user';
import userimage from './routes/userimage';

dotenv.config();

const app = express();

// https://cards.enka.network/u/jxtq/488BWO/10000089/3018594
// http://localhost:3000/u/jxtq/488BWO/10000089/3018594

app.use('/', uidimage);
app.use('/', uid);
app.use('/', userimage);
app.use('/', user);

app.get('/', (_: Request, res: Response) => {
	return res.redirect('https://enka.network');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Server is running on port ${port}`);
});

app.use((_: Request, res: Response) => {
	res.redirect('https://enka.network')
})