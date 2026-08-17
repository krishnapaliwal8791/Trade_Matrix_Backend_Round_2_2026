import { Request, Response } from 'express';
import { sellRequestRepository } from '../repositories/sellRequest.repository';
import { sellRequestService } from '../services/sellRequest.service';
import { successResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const create = asyncHandler(async (req: Request, res: Response) => {
  const sellerTeamId = req.user!.teamId!;
  const data = await sellRequestService.create(sellerTeamId, req.body);
  res.status(200).json(successResponse(data));
});

export const listOutgoing = asyncHandler(async (req: Request, res: Response) => {
  const data = await sellRequestRepository.findOutgoingForTeam(req.user!.teamId!);
  res.status(200).json(successResponse(data));
});

export const listIncoming = asyncHandler(async (req: Request, res: Response) => {
  const data = await sellRequestRepository.findIncomingForTeam(req.user!.teamId!);
  res.status(200).json(successResponse(data));
});

export const accept = asyncHandler(async (req: Request, res: Response) => {
  const buyerTeamId = req.user!.teamId!;
  const data = await sellRequestService.accept(buyerTeamId, req.params.id as string);
  res.status(200).json(successResponse(data));
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  const buyerTeamId = req.user!.teamId!;
  const data = await sellRequestService.rejectByBuyer(buyerTeamId, req.params.id as string);
  res.status(200).json(successResponse(data));
});

export const teamCaptainController = {
  create,
  listOutgoing,
  listIncoming,
  accept,
  reject,
};
