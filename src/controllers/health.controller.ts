import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../lib/prisma';
import { successResponse } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';

export const getHealth = asyncHandler(async (req: Request, res: Response) => {
  // Verify actual DB connectivity
  await prisma.$queryRaw`SELECT 1`.catch(() => {
    throw new AppError('Database connection failed', 503, 'SERVICE_UNAVAILABLE', true, 'Prisma query failed');
  });
  
  return res.status(200).json(
    successResponse({
      status: 'healthy',
      database: 'connected',
    })
  );
});
