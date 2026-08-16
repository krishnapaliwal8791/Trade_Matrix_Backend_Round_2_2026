import { Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { newsBundleService } from '../services/newsBundle.service';
import { successResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const getActiveNewsBundle = asyncHandler(async (req: Request, res: Response) => {
  const data = await eventService.getActiveNewsBundle();
  res.status(200).json(successResponse(data));
});

export const getNewsBundle = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const data = await newsBundleService.getNewsBundle(id);
  res.status(200).json(successResponse(data));
});

export const usersController = {
  getActiveNewsBundle,
  getNewsBundle,
};
