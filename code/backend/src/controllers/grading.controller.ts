import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { GradingService } from '../services/grading.service';
import { AuditService } from '../services/audit.service';
import { AppError } from '../utils/appError';

export class GradingController {
  // 1. Teacher Grading Queue (M8-S01)
  static async getGradingQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.');
      }

      const examId = req.query.examId as string | undefined;
      const statusFilter = req.query.status as string | undefined;

      const queue = await GradingService.getGradingQueue(userId, examId, statusFilter);
      res.status(200).json({ data: queue });
    } catch (error) {
      next(error);
    }
  }

  // 2. Session Grade Review Detail (M8-S02)
  static async getSessionGradingDetail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.');
      }

      const sessionId = req.params.sessionId as string;
      const detail = await GradingService.getSessionGradingDetail(userId, sessionId);
      res.status(200).json({ data: detail });
    } catch (error) {
      next(error);
    }
  }

  // 3. Confirm Teacher Marks (M8-S03)
  static async confirmGrade(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.');
      }

      const sessionId = req.params.sessionId as string;
      const gradeId = req.params.gradeId as string;
      const { awardedMarks, feedback } = req.body;

      if (awardedMarks === undefined || isNaN(Number(awardedMarks))) {
        throw new AppError(400, 'INVALID_INPUT', 'awardedMarks is required and must be a number.');
      }

      const result = await GradingService.confirmGrade(
        userId,
        sessionId,
        gradeId,
        Number(awardedMarks),
        feedback
      );

      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  // 4. Publish Results (M8-S04)
  static async publishResults(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.');
      }

      const examId = (req.params.examId || req.body.examId) as string;
      const sessionId = req.body.sessionId as string | undefined;

      if (!examId) {
        throw new AppError(400, 'EXAM_ID_REQUIRED', 'examId is required to publish results.');
      }

      const result = await GradingService.publishExamResults(userId, examId, sessionId);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  // 5. Student Results Overview (M8-S05)
  static async getStudentResults(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.');
      }

      const results = await GradingService.getStudentResults(userId);
      res.status(200).json({ data: results });
    } catch (error) {
      next(error);
    }
  }

  // 6. Student Result Detail Projection (M8-S07)
  static async getStudentResultDetail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.');
      }

      const resultId = req.params.resultId as string;
      const detail = await GradingService.getStudentResultDetail(userId, resultId);
      res.status(200).json({ data: detail });
    } catch (error) {
      next(error);
    }
  }

  // 7. Audit Log Ledger (M8-S06)
  static async getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'AUTH_REQUIRED', 'Authentication required.');
      }

      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const resourceType = req.query.resourceType as string | undefined;
      const action = req.query.action as string | undefined;

      const logs = await AuditService.getAuditLogs({
        search,
        limit,
        offset,
        resourceType,
        action,
      });

      res.status(200).json({ data: logs });
    } catch (error) {
      next(error);
    }
  }

  // 8. Trigger/Re-run Auto-Grading on Session
  static async triggerGrading(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const result = await GradingService.gradeSession(sessionId);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}

