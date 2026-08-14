import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { AppError } from '../utils/AppError';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const message = error.issues.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return next(new AppError(message, 400, 'VALIDATION_ERROR', true));
      }
      return next(error);
    }
  };
};
