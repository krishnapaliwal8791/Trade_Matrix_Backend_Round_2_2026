import { Request, Response } from 'express';
import { importService } from '../services/import.service';
import { newsBundleService } from '../services/newsBundle.service';
import { marketService } from '../services/market.service';
import { sellRequestService } from '../services/sellRequest.service';
import { sellRequestRepository } from '../repositories/sellRequest.repository';
import { teamService } from '../services/team.service';
import { successResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const importRound1 = asyncHandler(async (req: Request, res: Response) => {
  const data = await importService.importRound1();

  res.status(200).json(
    successResponse({
      importedCompanies: data.importedCompanies,
      importedTeams: data.importedTeams,
      importedPortfolios: data.importedPortfolios,
      importedHoldings: data.importedHoldings,
      eventStatus: data.eventStatus,
    })
  );
});

export const getNewsBundles = asyncHandler(async (req: Request, res: Response) => {
  const data = await newsBundleService.getOrganizerNewsBundles();
  res.status(200).json(successResponse(data));
});

export const revealNewsBundle = asyncHandler(async (req: Request, res: Response) => {
  await newsBundleService.revealNewsBundle(req.params.id as string);
  res.status(200).json(successResponse({}));
});

export const getMarkets = asyncHandler(async (req: Request, res: Response) => {
  const data = await marketService.getMarkets();
  res.status(200).json(successResponse(data));
});

export const applyPrices = asyncHandler(async (req: Request, res: Response) => {
  await marketService.applyPrices();
  res.status(200).json(successResponse({}));
});

export const getSellRequests = asyncHandler(async (req: Request, res: Response) => {
  const data = await sellRequestRepository.findAllForOrganizer();
  res.status(200).json(successResponse(data));
});

export const getSellRequest = asyncHandler(async (req: Request, res: Response) => {
  const data = await sellRequestRepository.findById(req.params.id as string);
  if (!data) throw new AppError('SellRequest not found', 404, 'NOT_FOUND_ERROR');
  res.status(200).json(successResponse(data));
});

export const approveSellRequest = asyncHandler(async (req: Request, res: Response) => {
  const data = await sellRequestService.approveByOrganizer(req.params.id as string);
  res.status(200).json(successResponse(data));
});

export const rejectSellRequest = asyncHandler(async (req: Request, res: Response) => {
  const data = await sellRequestService.rejectByOrganizer(req.params.id as string);
  res.status(200).json(successResponse(data));
});

export const getTeams = asyncHandler(async (req: Request, res: Response) => {
  const data = await teamService.getOrganizerTeams();
  res.status(200).json(successResponse(data));
});

export const organizerController = {
  importRound1,
  getNewsBundles,
  revealNewsBundle,
  getMarkets,
  applyPrices,
  getSellRequests,
  getSellRequest,
  approveSellRequest,
  rejectSellRequest,
  getTeams,
};
