import { Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { newsBundleService } from '../services/newsBundle.service';
import { sellRequestRepository } from '../repositories/sellRequest.repository';
import { AppError } from '../utils/AppError';
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

export const getSellRequest = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const data = await sellRequestRepository.findById(id);
  if (!data) throw new AppError('SellRequest not found', 404, 'NOT_FOUND_ERROR');
  
  if (data.sellerTeamId !== req.user!.teamId && data.buyerTeamId !== req.user!.teamId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN_ERROR');
  }
  
  res.status(200).json(successResponse(data));
});

export const usersController = {
  getActiveNewsBundle,
  getNewsBundle,
  getSellRequest,
};
