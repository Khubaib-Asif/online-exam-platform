import { Router } from 'express';
import { GradingController } from '../controllers/grading.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// 1. Teacher Grading Queue (M8-S01)
router.get(
  '/grading/queue',
  authenticate,
  requireRole('TEACHER', 'OWNER'),
  GradingController.getGradingQueue
);

// 2. Session Grade Review Detail (M8-S02)
router.get(
  '/grading/sessions/:sessionId',
  authenticate,
  requireRole('TEACHER', 'OWNER'),
  GradingController.getSessionGradingDetail
);

// 3. Confirm Teacher Marks (M8-S03)
router.post(
  '/grading/sessions/:sessionId/grades/:gradeId/confirm',
  authenticate,
  requireRole('TEACHER', 'OWNER'),
  GradingController.confirmGrade
);

// 4. Publish Results (M8-S04)
router.post(
  '/grading/exams/:examId/publish',
  authenticate,
  requireRole('TEACHER', 'OWNER'),
  GradingController.publishResults
);

// 5. Trigger / Re-run Auto-Grading
router.post(
  '/grading/sessions/:sessionId/auto-grade',
  authenticate,
  requireRole('TEACHER', 'OWNER'),
  GradingController.triggerGrading
);

// 6. Student Results Overview (M8-S05)
router.get(
  '/grading/student/results',
  authenticate,
  GradingController.getStudentResults
);

// 7. Student Result Detail Projection (M8-S07)
router.get(
  '/grading/student/results/:resultId',
  authenticate,
  GradingController.getStudentResultDetail
);

// 8. Audit Log Ledger (M8-S06)
router.get(
  '/audit/events',
  authenticate,
  requireRole('TEACHER', 'OWNER', 'PROCTOR'),
  GradingController.getAuditLogs
);

export default router;
