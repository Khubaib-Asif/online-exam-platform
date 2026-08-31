import { Router } from 'express';
import { RegistrationController } from '../controllers/registration.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { requireVerifiedEmail } from '../middlewares/requireVerifiedEmail';
import { generalApiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// All M2 routes require rate limiting & login authentication
router.use(generalApiLimiter);
router.use(authenticate);

// Student & General Discovery Routes
router.get('/exams/catalogue', RegistrationController.getExamCatalogue);
router.get('/exams/:id/details', RegistrationController.getExamDetails);
// Student actions that require verified email
router.post('/exams/:id/register', requireVerifiedEmail, RegistrationController.registerForExam);
router.post('/exams/invitations/redeem', requireVerifiedEmail, RegistrationController.redeemExamInvitation);
router.get('/student/registrations', requireVerifiedEmail, RegistrationController.getStudentRegistrations);

// Teacher Approval & Management Routes
router.get('/teacher/registrations/requests', requireRole('TEACHER'), RegistrationController.getTeacherPendingRequests);
router.post('/teacher/registrations/:id/decide', requireRole('TEACHER'), RegistrationController.decideRegistrationRequest);
router.post('/teacher/exams/:id/invitations', requireRole('TEACHER'), RegistrationController.createExamInvitation);
router.get('/teacher/exams/:id/distribution', requireRole('TEACHER'), RegistrationController.getExamDistributionStatus);

export default router;
