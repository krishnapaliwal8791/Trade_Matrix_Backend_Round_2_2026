import { Request, Response } from 'express';
import { eventService } from '../services/event.service';
import { successResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const getEvent = asyncHandler(async (req: Request, res: Response) => {
  const data = await eventService.getEvent();
  res.status(200).json(successResponse(data));
});

export const startEvent = asyncHandler(async (req: Request, res: Response) => {
  await eventService.startEvent();
  res.status(200).json(successResponse({}));
});

export const eventController = {
  getEvent,
  startEvent,
};
