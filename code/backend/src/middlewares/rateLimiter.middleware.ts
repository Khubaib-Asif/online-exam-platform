import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const store: RateLimitStore = {};
  const { windowMs, max, message = 'Too many requests, please try again later.' } = options;

  // Cleanup expired entries periodically
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const key in store) {
      if (store[key] && store[key].resetTime < now) {
        delete store[key];
      }
    }
  }, 5 * 60 * 1000);
  
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const clientIp = options.keyGenerator
      ? options.keyGenerator(req)
      : (req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1');

    const now = Date.now();

    if (!store[clientIp] || store[clientIp].resetTime < now) {
      store[clientIp] = {
        count: 1,
        resetTime: now + windowMs,
      };
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    store[clientIp].count += 1;
    const remaining = Math.max(0, max - store[clientIp].count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(store[clientIp].resetTime / 1000));

    if (store[clientIp].count > max) {
      res.setHeader('Retry-After', Math.ceil((store[clientIp].resetTime - now) / 1000));
      return next(new AppError(429, message, 'RATE_LIMIT_EXCEEDED'));
    }

    next();
  };
}

// 1. Strict Auth Rate Limiter (For login, registration, password reset, verification)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts, please try again after 15 minutes.',
});

// 2. Sensitive Action Limiter (For password resets & token redemption)
export const sensitiveActionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many requests for sensitive operations, please try again later.',
});

// 3. General API Limiter (For protected resources)
export const generalApiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'API rate limit exceeded, please slow down.',
});
