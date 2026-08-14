import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';
import { successResponse } from '../utils/apiResponse';

export const authRoutes = Router();

authRoutes.get('/me', authenticate, (req: Request, res: Response) => {
  return res.status(200).json(successResponse(req.user));
});
