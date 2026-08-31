import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { authRateLimiter, sensitiveActionLimiter, generalApiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// Public Routes with Rate Limiting
router.post('/bootstrap/owner', sensitiveActionLimiter, AuthController.bootstrapOwner);
router.post('/auth/register', authRateLimiter, AuthController.registerStudent);
router.post('/auth/login', authRateLimiter, AuthController.login);
router.post('/teacher-invitations/redeem', sensitiveActionLimiter, AuthController.redeemTeacherInvitation);
router.post('/auth/forgot-password', sensitiveActionLimiter, AuthController.forgotPassword);
router.post('/auth/reset-password', sensitiveActionLimiter, AuthController.resetPassword);
router.post('/auth/request-verification', sensitiveActionLimiter, AuthController.requestEmailVerification);
router.post('/auth/verify-email', sensitiveActionLimiter, AuthController.verifyEmail);

// Protected Routes
router.get('/auth/me', generalApiLimiter, authenticate, AuthController.getMe);
router.post('/auth/profile-photo', generalApiLimiter, authenticate, AuthController.uploadProfilePhoto);
router.post('/auth/verify-email-direct', generalApiLimiter, authenticate, AuthController.verifyEmailDirect);

// Owner-Only Routes
router.post(
  '/owner/teacher-invitations',
  generalApiLimiter,
  authenticate,
  requireRole('OWNER'),
  AuthController.issueTeacherInvitation
);

export default router;