import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { GateService } from '../services/gate.service';
import { z } from 'zod';

const EvaluateGatesSchema = z.object({
  launchTicket: z.string().min(1, 'Launch ticket is required'),
  deviceId: z.string().optional(),
  telemetry: z.object({
    cameraAllowed: z.boolean().default(false),
    microphoneAllowed: z.boolean().default(false),
    singleDisplay: z.boolean().default(true),
    displaysCount: z.number().optional(),
    kioskActive: z.boolean().default(false),
    virtualMachineDetected: z.boolean().default(false),
    blacklistedProcessesCount: z.number().default(0),
    candidateConsentGiven: z.boolean().default(false),
    platform: z.string().optional(),
    appVersion: z.string().optional(),
    faceSnapshot: z.string().optional(),
    cameraLuma: z.number().optional(),
    cameraVariance: z.number().optional(),
    audioLevelRms: z.number().optional(),
  }).passthrough(),
});

export class GateController {
  // POST /v1/exams/:id/launch-ticket
  static async createLaunchTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const result = await GateService.createLaunchTicket(req.user!.id, examId);
      res.status(201).json({ data: result, message: 'Launch ticket generated successfully' });
    } catch (error) {
      next(error);
    }
  }

  // GET /v1/exams/launch-ticket/verify?ticket=...
  static async verifyLaunchTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ticket = req.query.ticket as string;
      const result = await GateService.verifyLaunchTicket(ticket);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  // POST /v1/exams/:id/evaluate-gates
  static async evaluateGates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const validated = EvaluateGatesSchema.parse(req.body);
      const result = await GateService.evaluateAttemptGates(req.user!.id, examId, validated);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
}
