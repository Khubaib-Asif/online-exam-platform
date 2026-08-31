import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { QuestionBankService } from '../services/questionBank.service';
import { z } from 'zod';

const CreateQuestionBankSchema = z.object({
  name: z.string().trim().min(1, 'Question bank name is required'),
  description: z.string().trim().optional(),
});

const CreateQuestionSchema = z.object({
  type: z.enum(['MCQ', 'MSQ', 'TRUE_FALSE', 'SHORT', 'LONG']),
  content: z.string().trim().min(1, 'Question content is required'),
  options: z.array(z.string()).optional(),
  answerKey: z.union([z.string(), z.array(z.string())]).optional(),
  rubric: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  marks: z.number().int().positive('Marks must be a positive integer'),
  tags: z.array(z.string()).optional(),
});

export class QuestionBankController {
  // 1. GET /v1/question-banks
  static async getQuestionBanks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const banks = await QuestionBankService.getQuestionBanks(req.user!.id);
      res.json({ data: banks });
    } catch (error) {
      next(error);
    }
  }

  // 2. POST /v1/question-banks
  static async createQuestionBank(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = CreateQuestionBankSchema.parse(req.body);
      const bank = await QuestionBankService.createQuestionBank(req.user!.id, validated.name, validated.description);
      res.status(201).json({ data: bank, message: 'Question bank created successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 3. GET /v1/question-banks/:id/questions
  static async getBankQuestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bankId = req.params.id as string;
      const search = req.query.search as string | undefined;
      const type = req.query.type as string | undefined;
      const tag = req.query.tag as string | undefined;
      const activeOnly = req.query.activeOnly === 'false' ? false : true;

      const questions = await QuestionBankService.getBankQuestions(req.user!.id, bankId, search, type, tag, activeOnly);
      res.json({ data: questions });
    } catch (error) {
      next(error);
    }
  }

  // 4. POST /v1/question-banks/:id/questions
  static async createQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bankId = req.params.id as string;
      const validated = CreateQuestionSchema.parse(req.body);
      const question = await QuestionBankService.createQuestion(req.user!.id, bankId, validated);
      res.status(201).json({ data: question, message: 'Question created successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 5. PUT /v1/questions/:id
  static async updateQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.id as string;
      const validated = CreateQuestionSchema.parse(req.body);
      const version = await QuestionBankService.updateQuestion(req.user!.id, questionId, validated);
      res.json({ data: version, message: 'Question version created successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 6. GET /v1/questions/:id
  static async getQuestionDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.id as string;
      const details = await QuestionBankService.getQuestionDetails(req.user!.id, questionId);
      res.json({ data: details });
    } catch (error) {
      next(error);
    }
  }

  // 7. POST /v1/questions/:id/toggle-active
  static async toggleQuestionActive(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.id as string;
      const result = await QuestionBankService.toggleQuestionActive(req.user!.id, questionId);
      res.json({ data: result, message: 'Question active status toggled successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 8. POST /v1/question-banks/:id/import
  static async importQuestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bankId = req.params.id as string;
      const rawPayload = req.body.questions || req.body;
      const result = await QuestionBankService.importQuestions(req.user!.id, bankId, rawPayload);
      res.status(201).json({ data: result, message: 'Questions imported successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 9. DELETE /v1/question-banks/tags/:tagName
  static async deleteTag(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tagName = req.params.tagName as string;
      const result = await QuestionBankService.deleteTag(req.user!.id, tagName);
      res.json({ data: result, message: result.message });
    } catch (error) {
      next(error);
    }
  }
}
