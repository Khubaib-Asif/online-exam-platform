import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireVerifiedEmail } from '../middlewares/requireVerifiedEmail';
import { generalApiLimiter, sensitiveActionLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.use(generalApiLimiter);
router.use(authenticate);
router.use(requireVerifiedEmail);

// 1. Start or resume exam session (consumes entry token from M5 Gate 6)
router.post('/sessions/start', sensitiveActionLimiter, SessionController.startSession);

// 2. Fetch current question and authoritative timer projection
router.get('/sessions/:sessionId/current', SessionController.getCurrentQuestion);

// 3. Submit question answer & advance forward
router.post('/sessions/:sessionId/submit-question', SessionController.submitQuestion);

// 4. Skip question & lock permanently
router.post('/sessions/:sessionId/skip-question', SessionController.skipQuestion);

// 5. Explicit exam submission
router.post('/sessions/:sessionId/submit-exam', sensitiveActionLimiter, SessionController.submitExam);

// 6. Liveness heartbeat & clock synchronization
router.post('/sessions/:sessionId/heartbeat', SessionController.heartbeat);

// 7. Pause session for network reconnect
router.post('/sessions/:sessionId/pause-reconnect', SessionController.pauseReconnect);

// 8. Resume reconnected session
router.post('/sessions/:sessionId/resume', SessionController.resumeSession);

export default router;
