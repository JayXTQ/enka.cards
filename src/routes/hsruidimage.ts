import { Request, Response, Router } from 'express';
import { HSR } from '../utils/route-handlers';

const router = Router();

router.get(
	'/hsr/:uid/:character/image',
	async (req: Request, res: Response) => {
		return await HSR(req, res, true);
	},
);

export default router;
