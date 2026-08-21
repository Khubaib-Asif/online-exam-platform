import rateLimit from 'express-rate-limit';

// 1. Strict Auth Rate Limiter (For login, registration, password reset, verification)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// 2. Sensitive Action Limiter (For password resets & token redemption)
export const sensitiveActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many requests for sensitive operations, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// 3. General API Limiter (For protected resources)
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'API rate limit exceeded, please slow down.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});
