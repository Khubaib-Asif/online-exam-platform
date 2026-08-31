import { NextFunction, Response } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from '../utils/appError';

export const requireVerifiedEmail = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError(401, 'Authentication required', 'AUTH_REQUIRED'));
  }

  if (!req.user.isEmailVerified) {
    return next(new AppError(403, 'Email verification required', 'EMAIL_NOT_VERIFIED'));
  }

  next();
};
