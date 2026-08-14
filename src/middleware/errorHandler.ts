import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { errorResponse } from '../utils/apiResponse';
import { logger } from '../lib/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err }, 'Unexpected AppError');
    }
    return res.status(err.statusCode).json(
      errorResponse(err.message, err.code, err.reason, err.suggestedFix)
    );
  }

  // Unexpected errors
  logger.error({ err }, 'Unhandled Exception');

  const message = env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  
  return res.status(500).json(errorResponse(message, 'INTERNAL_ERROR'));
};
