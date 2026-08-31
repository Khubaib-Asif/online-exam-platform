import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { RegistrationService } from '../services/registration.service';
import { z } from 'zod';

const RedeemInvitationSchema = z.object({
  token: z.string().trim().min(1, 'Invitation code is required'),
});

const DecideRequestSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
});

const CreateExamInvitationSchema = z.object({
  recipientEmail: z.string().email().optional(),
  maxUses: z.number().int().positive().optional(),
  expiresInSeconds: z.number().int().positive().optional(),
});

export class RegistrationController {
  // 1. GET /v1/exams/catalogue
  static async getExamCatalogue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const policy = req.query.policy as string | undefined;
      const catalogue = await RegistrationService.getExamCatalogue(req.user!.id, search, policy);
      res.json({ data: catalogue });
    } catch (error) {
      next(error);
    }
  }

  // 2. GET /v1/exams/:id/details
  static async getExamDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const examDetails = await RegistrationService.getExamDetails(req.user!.id, examId);
      res.json({ data: examDetails });
    } catch (error) {
      next(error);
    }
  }

  // 3. POST /v1/exams/:id/register
  static async registerForExam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const registration = await RegistrationService.registerForExam(req.user!.id, examId);
      res.status(201).json({ data: registration, message: 'Registration request processed successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 4. POST /v1/exams/invitations/redeem
  static async redeemExamInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = RedeemInvitationSchema.parse(req.body);
      const registration = await RegistrationService.redeemExamInvitation(req.user!.id, validated.token);
      res.json({ data: registration, message: 'Invitation code redeemed successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 5. GET /v1/student/registrations
  static async getStudentRegistrations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const registrations = await RegistrationService.getStudentRegistrations(req.user!.id);
      res.json({ data: registrations });
    } catch (error) {
      next(error);
    }
  }

  // 6. GET /v1/teacher/registrations/requests
  static async getTeacherPendingRequests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const requests = await RegistrationService.getTeacherPendingRequests(req.user!.id);
      res.json({ data: requests });
    } catch (error) {
      next(error);
    }
  }

  // 7. POST /v1/teacher/registrations/:id/decide
  static async decideRegistrationRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const registrationId = req.params.id as string;
      const validated = DecideRequestSchema.parse(req.body);
      const result = await RegistrationService.decideRegistrationRequest(req.user!.id, registrationId, validated.decision);
      res.json({ data: result, message: `Registration request ${validated.decision.toLowerCase()} successfully` });
    } catch (error) {
      next(error);
    }
  }

  // 8. POST /v1/teacher/exams/:id/invitations
  static async createExamInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const validated = CreateExamInvitationSchema.parse(req.body);
      const result = await RegistrationService.createExamInvitation(req.user!.id, {
        examId,
        ...validated,
      });
      res.status(201).json({ data: result, message: 'Exam invitation created successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 9. GET /v1/teacher/exams/:id/distribution
  static async getExamDistributionStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const status = await RegistrationService.getExamDistributionStatus(req.user!.id, examId);
      res.json({ data: status });
    } catch (error) {
      next(error);
    }
  }
}
