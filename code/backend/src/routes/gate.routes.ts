import { Router } from 'express';
import { GateController } from '../controllers/gate.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireVerifiedEmail } from '../middlewares/requireVerifiedEmail';
import { generalApiLimiter, sensitiveActionLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// Rate limiting & Authentication applied to all M5 gate routes
router.use(generalApiLimiter);
router.use(authenticate);

// 1. Request one-time launch ticket
router.post('/exams/:id/launch-ticket', sensitiveActionLimiter, GateController.createLaunchTicket);

// 2. Verify launch ticket
router.get('/exams/launch-ticket/verify', GateController.verifyLaunchTicket);

// 3. Evaluate the 6 Security Gates and generate entry authorization token
router.post('/exams/:id/evaluate-gates', sensitiveActionLimiter, GateController.evaluateGates);

export default router;
