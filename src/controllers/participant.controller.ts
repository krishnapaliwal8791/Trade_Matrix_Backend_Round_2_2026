import { Request, Response } from 'express';
import { sellRequestRepository } from '../repositories/sellRequest.repository';
import { successResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await sellRequestRepository.findAllForTeam(req.user!.teamId!);
  res.status(200).json(successResponse(data));
});

export const participantController = {
  list,
};
