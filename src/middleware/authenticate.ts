import { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';
import { authService } from '../services/auth.service';
import { AppError } from '../utils/AppError';

// First, apply Clerk's middleware which verifies the JWT and attaches req.auth
export const clerkAuth = clerkMiddleware();

// Ensure the request actually has a valid token
export const ensureClerk = requireAuth();

// Finally, our custom middleware to load the database user
export const loadDbUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    
    if (!auth || !auth.userId) {
      throw new AppError('Unauthenticated', 401, 'UNAUTHENTICATED', true);
    }

    const clerkId = auth.userId;
    const user = await authService.authenticate(clerkId);
    
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Combine them into an easy-to-use array for routes
export const authenticate = [clerkAuth, ensureClerk, loadDbUser];
