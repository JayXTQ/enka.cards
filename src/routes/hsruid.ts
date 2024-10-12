import { Request, Response, Router } from 'express';
import { HSR } from '../utils/route-handlers';

const router = Router();

router.get('/hsr/:uid/:character', async (req: Request, res: Response) => {
	return await HSR(req, res, false);
});

export default router;
