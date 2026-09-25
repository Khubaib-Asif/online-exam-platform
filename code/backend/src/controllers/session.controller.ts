import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { SessionService } from '../services/session.service';
import { z } from 'zod';

const StartSessionSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  entryToken: z.string().optional(),
});

const SubmitQuestionSchema = z.object({
  examQuestionId: z.string().min(1, 'Question ID is required'),
  answer: z.any().optional(),
  clientSequence: z.number().int().default(1),
  idempotencyKey: z.string().optional(),
});

const SkipQuestionSchema = z.object({
  examQuestionId: z.string().min(1, 'Question ID is required'),
  clientSequence: z.number().int().default(1),
});

export class SessionController {
  // POST /v1/exam/sessions/start
  static async startSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = StartSessionSchema.parse(req.body);
      const projection = await SessionService.startSession(req.user!.id, validated.examId, validated.entryToken);
      res.status(200).json({ data: projection });
    } catch (error) {
      next(error);
    }
  }

  // GET /v1/exam/sessions/:sessionId/current
  static async getCurrentQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const projection = await SessionService.getCurrentQuestion(req.user!.id, sessionId);
      res.status(200).json({ data: projection });
    } catch (error) {
      next(error);
    }
  }

  // POST /v1/exam/sessions/:sessionId/submit-question
  static async submitQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const validated = SubmitQuestionSchema.parse(req.body);
      const projection = await SessionService.submitQuestion(req.user!.id, sessionId, validated);
      res.status(200).json({ data: projection, message: 'Question submitted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // POST /v1/exam/sessions/:sessionId/skip-question
  static async skipQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const validated = SkipQuestionSchema.parse(req.body);
      const projection = await SessionService.skipQuestion(req.user!.id, sessionId, validated);
      res.status(200).json({ data: projection, message: 'Question skipped.' });
    } catch (error) {
      next(error);
    }
  }

  // POST /v1/exam/sessions/:sessionId/submit-exam
  static async submitExam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const projection = await SessionService.submitExam(req.user!.id, sessionId);
      res.status(200).json({ data: projection, message: 'Examination submitted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // POST /v1/exam/sessions/:sessionId/heartbeat
  static async heartbeat(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await SessionService.heartbeat(req.user!.id, sessionId);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /v1/exam/sessions/:sessionId/pause-reconnect
  static async pauseReconnect(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await SessionService.pauseReconnect(req.user!.id, sessionId);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /v1/exam/sessions/:sessionId/resume
  static async resumeSession(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const projection = await SessionService.resumeSession(req.user!.id, sessionId);
      res.status(200).json({ data: projection });
    } catch (error) {
      next(error);
    }
  }
}
