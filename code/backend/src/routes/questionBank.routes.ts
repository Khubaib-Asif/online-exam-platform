import { Router } from 'express';
import { QuestionBankController } from '../controllers/questionBank.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// All M3 routes require authentication and TEACHER role
router.use(authenticate);
router.use(requireRole('TEACHER'));

// Question Bank Routes
router.get('/question-banks', QuestionBankController.getQuestionBanks);
router.post('/question-banks', QuestionBankController.createQuestionBank);
router.get('/question-banks/:id/questions', QuestionBankController.getBankQuestions);
router.post('/question-banks/:id/questions', QuestionBankController.createQuestion);
router.post('/question-banks/:id/import', QuestionBankController.importQuestions);

// Question Level & Version Routes
router.get('/questions/:id', QuestionBankController.getQuestionDetails);
router.put('/questions/:id', QuestionBankController.updateQuestion);
router.post('/questions/:id/toggle-active', QuestionBankController.toggleQuestionActive);
router.delete('/tags/:tagName', QuestionBankController.deleteTag);

export default router;
