import { Router } from 'express';
import { ExamBuilderController } from '../controllers/examBuilder.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { generalApiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// All M4 routes require rate limiting, login authentication and strict TEACHER role
router.use(generalApiLimiter);
router.use(authenticate);
router.use(requireRole('TEACHER'));

// Exam Builder Routes
router.get('/teacher/exams', ExamBuilderController.getTeacherExams);
router.post('/teacher/exams', ExamBuilderController.createExam);
router.get('/teacher/exams/:id', ExamBuilderController.getExamDetails);
router.put('/teacher/exams/:id/settings', ExamBuilderController.updateExamSettings);

router.post('/teacher/exams/:id/sections', ExamBuilderController.addSection);
router.put('/teacher/sections/:id', ExamBuilderController.updateSection);
router.delete('/teacher/sections/:id', ExamBuilderController.deleteSection);

router.post('/teacher/sections/:id/questions', ExamBuilderController.addQuestionToSection);
router.put('/teacher/exam-questions/:id', ExamBuilderController.updateSectionQuestion);
router.delete('/teacher/exam-questions/:id', ExamBuilderController.removeQuestionFromSection);

router.post('/teacher/exams/:id/publish', ExamBuilderController.publishExam);
router.post('/teacher/exams/:id/close', ExamBuilderController.closeExam);

export default router;
