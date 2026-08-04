import prisma from '../lib/prisma';
import { hashPassword, comparePassword, generateAccessToken, sha256 } from '../utils/security';
import { AppError } from '../utils/appError';
import { env } from '../config/env';
import { Role } from '@prisma/client';
import crypto from 'crypto';
import { EmailService } from './email.service';

export class AuthService {
  // 1. System Bootstrap (First-time Owner Creation)
  static async bootstrapOwner(data: {
    bootstrapSecret: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
  }) {
    if (data.bootstrapSecret !== env.BOOTSTRAP_SECRET) {
      throw new AppError(403, 'Invalid bootstrap secret', 'INVALID_BOOTSTRAP_SECRET');
    }

    return prisma.$transaction(async (tx) => {
      // Check or create platform state
      let platformState = await tx.platformState.findFirst();
      if (!platformState) {
        platformState = await tx.platformState.create({
          data: { bootstrapStatus: 'UNINITIALISED' },
        });
      }

      if (platformState.bootstrapStatus === 'INITIALISED') {
        throw new AppError(409, 'Platform is already initialised', 'ALREADY_INITIALISED');
      }

      const existingOwner = await tx.user.findFirst({ where: { role: 'OWNER' } });
      if (existingOwner) {
        throw new AppError(409, 'An Owner account already exists', 'OWNER_EXISTS');
      }

      const passwordHash = await hashPassword(data.password);

      const owner = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'OWNER',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
      });

      await tx.platformState.update({
        where: { id: platformState.id },
        data: {
          bootstrapStatus: 'INITIALISED',
          bootstrapConsumedAt: new Date(),
        },
      });

      // Audit record
      await tx.auditEvent.create({
        data: {
          actorId: owner.id,
          action: 'PLATFORM_BOOTSTRAPPED',
          resourceType: 'PLATFORM',
          resourceId: owner.id,
          recordHash: sha256(`BOOTSTRAP_${owner.id}_${Date.now()}`),
        },
      });

      return owner;
    });
  }

  // 2. Issue Teacher Invitation (Owner Only)
  static async issueTeacherInvitation(issuedByUserId: string, email: string, expiresInSeconds: number = 86400) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = sha256(rawToken);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const invitation = await prisma.teacherInvitation.create({
      data: {
        email: email.toLowerCase(),
        tokenHash,
        issuedBy: issuedByUserId,
        expiresAt,
        status: 'ISSUED',
      },
    });

    EmailService.sendTeacherInvitation(invitation.email, rawToken).catch(console.error);

    return {
      invitationId: invitation.id,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      invitationToken: rawToken, // Displayed once to the owner
    };
  }

  // 3. Redeem Teacher Invitation
  static async redeemTeacherInvitation(data: {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
  }) {
    const tokenHash = sha256(data.token);

    return prisma.$transaction(async (tx) => {
      const invitation = await tx.teacherInvitation.findUnique({
        where: { tokenHash },
      });

      if (!invitation || invitation.status !== 'ISSUED' || invitation.expiresAt < new Date()) {
        throw new AppError(400, 'Invalid or expired invitation token', 'INVALID_INVITATION');
      }

      const existingUser = await tx.user.findUnique({ where: { email: invitation.email } });
      if (existingUser) {
        throw new AppError(409, 'Email address is already in use', 'EMAIL_IN_USE');
      }

      const passwordHash = await hashPassword(data.password);

      const teacher = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'TEACHER',
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });

      await tx.teacherInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'REDEEMED',
          redeemedAt: new Date(),
          redeemedUserId: teacher.id,
        },
      });

      return teacher;
    });
  }

  // 4. Student Self-Registration
  static async registerStudent(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existingUser) {
      throw new AppError(409, 'Email address is already in use', 'EMAIL_IN_USE');
    }

    const passwordHash = await hashPassword(data.password);

    const student = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });

    return student;
  }

  // 5. Login
  static async login(email: string, password: string, userAgent?: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Update login timestamps
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0 },
    });

    const { token, tokenId } = generateAccessToken(user.id, user.role);

    // Save refresh token family in DB
    const refreshTokenRaw = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = sha256(refreshTokenRaw);
    const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        familyId: tokenId,
        expiresAt: refreshExpiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken: token,
      refreshToken: refreshTokenRaw,
    };
  }

  // 6. Get Current Safe Profile
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    return user;
  }

  // 7. Forgot Password Request
  static async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { message: 'If an account exists, a reset link has been sent.' };
    }

    // Generate a 32-byte secure reset token
    const resetTokenRaw = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = sha256(resetTokenRaw);

    // Save token hash to user record or refresh token table
    // For password reset, we can store resetTokenHash in RefreshToken table or user reset token
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: resetTokenHash,
        familyId: 'PASSWORD_RESET',
        expiresAt,
      },
    });

    // Send real email in background
    EmailService.sendPasswordReset(user.email, resetTokenRaw).catch(console.error);

    return {
      message: 'If an account exists, a reset link has been sent.',
      resetToken: resetTokenRaw, // Useful for testing in dev mode
    };
  }

  // 8. Real Reset Password (Updates DB)
  static async resetPassword(token: string, newPassword: string) {
    const tokenHash = sha256(token);

    const resetRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord || resetRecord.familyId !== 'PASSWORD_RESET' || resetRecord.expiresAt < new Date() || resetRecord.revokedAt) {
      throw new AppError(400, 'Invalid or expired password reset token', 'INVALID_RESET_TOKEN');
    }

    const passwordHash = await hashPassword(newPassword);

    // Transactionally update password and revoke reset token
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
        },
      });

      // Mark reset token as used (revoked)
      await tx.refreshToken.update({
        where: { id: resetRecord.id },
        data: { revokedAt: new Date() },
      });
    });

    return { message: 'Password has been set successfully.' };
  }

}