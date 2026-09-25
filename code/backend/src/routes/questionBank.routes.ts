import { Router } from 'express';
import { QuestionBankController } from '../controllers/questionBank.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { generalApiLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

// Question Bank Routes - Rate limited, Authenticated, and Teacher-only
router.get('/question-banks', generalApiLimiter, authenticate, requireRole('TEACHER'), QuestionBankController.getQuestionBanks);
router.post('/question-banks', generalApiLimiter, authenticate, requireRole('TEACHER'), QuestionBankController.createQuestionBank);
router.get('/question-banks/:id/questions', generalApiLimiter, authenticate, requireRole('TEACHER'), QuestionBankController.getBankQuestions);
router.post('/question-banks/:id/questions', generalApiLimiter, authenticate, requireRole('TEACHER'), QuestionBankController.createQuestion);
router.post('/question-banks/:id/import', generalApiLimiter, authenticate, requireRole('TEACHER'), QuestionBankController.importQuestions);

// Question Level & Version Routes
router.get('/questions/:id', generalApiLimiter, authenticate, requireRole('TEACHER'), QuestionBankController.getQuestionDetails);
router.put('/questions/:id', generalApiLimiter, authenticate, requireRole('TEACHER'), QuestionBankController.updateQuestion);
router.post('/questions/:id/toggle-active', generalApiLimiter, authenticate, requireRole('TEACHER'), QuestionBankController.toggleQuestionActive);
router.delete('/tags/:tagName', generalApiLimiter, authenticate, requireRole('TEACHER'), QuestionBankController.deleteTag);

export default router;
