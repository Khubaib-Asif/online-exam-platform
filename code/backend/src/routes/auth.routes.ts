import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public Routes
router.post('/bootstrap/owner', AuthController.bootstrapOwner);
router.post('/auth/register', AuthController.registerStudent);
router.post('/auth/login', AuthController.login);
router.post('/teacher-invitations/redeem', AuthController.redeemTeacherInvitation);
router.post('/auth/forgot-password', AuthController.forgotPassword);
router.post('/auth/reset-password', AuthController.resetPassword);

// Protected Routes
router.get('/auth/me', authenticate, AuthController.getMe);

// Owner-Only Routes
router.post(
  '/owner/teacher-invitations',
  authenticate,
  requireRole('OWNER'),
  AuthController.issueTeacherInvitation
);

export default router;