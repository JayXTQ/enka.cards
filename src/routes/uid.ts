import { Request, Response, Router } from 'express';
import { GI } from '../utils/route-handlers';

const router = Router();

router.get('/u/:uid/:character', async (req: Request, res: Response) => {
	return await GI(req, res, false);
});

export default router;
