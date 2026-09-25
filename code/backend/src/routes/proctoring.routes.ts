import { Router } from 'express';
import { ProctoringController } from '../controllers/proctoring.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// 1. Ingest Telemetry (Student)
router.post(
  '/proctoring/telemetry',
  authenticate,
  requireRole('STUDENT'),
  ProctoringController.ingestTelemetry
);

// 2. Query Live Sessions (Teacher, Proctor, Owner)
router.get(
  '/proctoring/live-sessions',
  authenticate,
  requireRole('TEACHER', 'PROCTOR', 'OWNER'),
  ProctoringController.getLiveSessions
);

// 3. Query Session Integrity Detail (Teacher, Proctor, Owner)
router.get(
  '/proctoring/sessions/:sessionId',
  authenticate,
  requireRole('TEACHER', 'PROCTOR', 'OWNER'),
  ProctoringController.getSessionIntegrityDetail
);

// 4. Record Review Decision (Teacher, Proctor, Owner)
router.post(
  '/proctoring/sessions/:sessionId/review',
  authenticate,
  requireRole('TEACHER', 'PROCTOR', 'OWNER'),
  ProctoringController.recordReviewDecision
);

// 5. Reconnect Decision (Teacher, Proctor, Owner)
router.post(
  '/proctoring/sessions/:sessionId/reconnect-decision',
  authenticate,
  requireRole('TEACHER', 'PROCTOR', 'OWNER'),
  ProctoringController.recordReconnectDecision
);

export default router;
