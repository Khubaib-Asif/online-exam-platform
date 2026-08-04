import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { z } from 'zod';

// Input Validation Schemas
const BootstrapSchema = z.object({
  bootstrapSecret: z.string().min(1),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const TeacherInvitationSchema = z.object({
  email: z.string().email(),
  expiresInSeconds: z.number().int().positive().optional(),
});

const RedeemInvitationSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
});

export class AuthController {
  static async bootstrapOwner(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = BootstrapSchema.parse(req.body);
      const owner = await AuthService.bootstrapOwner(validated);
      res.status(201).json({ data: owner, message: 'Platform bootstrapped successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async issueTeacherInvitation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = TeacherInvitationSchema.parse(req.body);
      const invitation = await AuthService.issueTeacherInvitation(
        req.user!.id,
        validated.email,
        validated.expiresInSeconds
      );
      res.status(201).json({ data: invitation, message: 'Teacher invitation created' });
    } catch (error) {
      next(error);
    }
  }

  static async redeemTeacherInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = RedeemInvitationSchema.parse(req.body);
      const teacher = await AuthService.redeemTeacherInvitation(validated);
      res.status(201).json({ data: teacher, message: 'Teacher account activated' });
    } catch (error) {
      next(error);
    }
  }

  static async registerStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = RegisterSchema.parse(req.body);
      const student = await AuthService.registerStudent(validated);
      res.status(201).json({ data: student, message: 'Student registered successfully' });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = LoginSchema.parse(req.body);
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;

      const result = await AuthService.login(validated.email, validated.password, userAgent, ipAddress);

      // Set httpOnly cookie for refresh token
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.getMe(req.user!.id);
      res.json({ data: user });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await AuthService.requestPasswordReset(email);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;
      const result = await AuthService.resetPassword(token, password);
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
  
}