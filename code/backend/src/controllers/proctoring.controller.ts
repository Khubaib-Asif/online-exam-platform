import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ProctoringService } from '../services/proctoring.service';
import { AppError } from '../utils/appError';

export class ProctoringController {
  // 1. Ingest Telemetry (Student)
  static async ingestTelemetry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      const { sessionId, events, clientSequence } = req.body;
      const result = await ProctoringService.ingestTelemetry(userId, {
        sessionId,
        events,
        clientSequence,
      });

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 2. Query Live Sessions (Teacher / Proctor / Owner)
  static async getLiveSessions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;
      if (!userId || !role) {
        throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      const examId = req.query.examId as string | undefined;
      const search = req.query.search as string | undefined;
      const riskFilter = req.query.riskFilter as string | undefined;

      const result = await ProctoringService.getLiveSessions(userId, role, {
        examId,
        search,
        riskFilter,
      });

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 3. Query Session Integrity Detail (Teacher / Proctor / Owner)
  static async getSessionIntegrityDetail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;
      if (!userId || !role) {
        throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
      const result = await ProctoringService.getSessionIntegrityDetail(userId, role, sessionId);

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 4. Record Review Decision (Teacher / Proctor / Owner)
  static async recordReviewDecision(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;
      if (!userId || !role) {
        throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
      const { decision, reviewNote } = req.body;

      if (!decision || !['CLEARED', 'FLAGGED', 'INCONCLUSIVE'].includes(decision)) {
        throw new AppError(400, 'Valid decision (CLEARED, FLAGGED, INCONCLUSIVE) is required', 'INVALID_DECISION');
      }

      const result = await ProctoringService.recordReviewDecision(userId, role, sessionId, {
        decision,
        reviewNote,
      });

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // 5. Reconnect Decision (Teacher / Proctor / Owner)
  static async recordReconnectDecision(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const role = req.user?.role;
      if (!userId || !role) {
        throw new AppError(401, 'Authentication required', 'AUTH_REQUIRED');
      }

      const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
      const { granted, extensionSeconds, reasonNote } = req.body;

      if (typeof granted !== 'boolean') {
        throw new AppError(400, 'Parameter "granted" must be boolean', 'INVALID_PARAM');
      }

      const result = await ProctoringService.recordReconnectDecision(userId, role, sessionId, {
        granted,
        extensionSeconds,
        reasonNote,
      });

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
