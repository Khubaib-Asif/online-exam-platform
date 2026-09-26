import { Router } from 'express';
import { ExamBuilderController } from '../controllers/examBuilder.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { generalApiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// Exam Builder Routes - Rate limited, Authenticated, and Teacher-only
router.get('/teacher/exams', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.getTeacherExams);
router.post('/teacher/exams', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.createExam);
router.get('/teacher/exams/:id', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.getExamDetails);
router.put('/teacher/exams/:id/settings', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.updateExamSettings);

router.post('/teacher/exams/:id/sections', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.addSection);
router.put('/teacher/sections/:id', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.updateSection);
router.delete('/teacher/sections/:id', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.deleteSection);

router.post('/teacher/sections/:id/questions', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.addQuestionToSection);
router.put('/teacher/exam-questions/:id', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.updateSectionQuestion);
router.delete('/teacher/exam-questions/:id', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.removeQuestionFromSection);

router.post('/teacher/exams/:id/publish', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.publishExam);
router.post('/teacher/exams/:id/close', generalApiLimiter, authenticate, requireRole('TEACHER'), ExamBuilderController.closeExam);

export default router;
