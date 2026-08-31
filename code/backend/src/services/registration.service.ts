import prisma from '../lib/prisma';
import { AppError } from '../utils/appError';
import { sha256 } from '../utils/security';
import { AccessPolicy, RegistrationStatus } from '@prisma/client';
import crypto from 'crypto';
import { EmailService } from './email.service';

export class RegistrationService {
  // 1. Get Exam Catalogue (Published exams with student registration state)
  static async getExamCatalogue(userId: string, search?: string, policyFilter?: string) {
    const whereClause: any = {
      status: 'PUBLISHED',
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (policyFilter && ['PUBLIC', 'INVITATION_ONLY', 'APPROVAL_REQUIRED'].includes(policyFilter)) {
      whereClause.accessPolicy = policyFilter as AccessPolicy;
    }

    const exams = await prisma.exam.findMany({
      where: whereClause,
      orderBy: { startsAt: 'asc' },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        registrations: {
          where: { userId },
          select: { id: true, status: true, requestedAt: true },
        },
        revisions: {
          where: { status: 'PUBLISHED' },
          take: 1,
          select: {
            id: true,
            paperDurationSeconds: true,
            timingMode: true,
            sections: {
              select: {
                questions: {
                  select: {
                    marksOverride: true,
                    questionVersion: {
                      select: { marks: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return exams.map((exam) => {
      const activeReg = exam.registrations[0];
      const activeRev = exam.revisions[0];

      let totalQuestions = 0;
      let totalMarks = 0;

      if (activeRev && activeRev.sections) {
        activeRev.sections.forEach((sec) => {
          totalQuestions += sec.questions.length;
          sec.questions.forEach((q) => {
            totalMarks += q.marksOverride ?? q.questionVersion.marks ?? 0;
          });
        });
      }

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        accessPolicy: exam.accessPolicy,
        startsAt: exam.startsAt,
        closesAt: exam.closesAt,
        registrationOpensAt: exam.registrationOpensAt,
        registrationClosesAt: exam.registrationClosesAt,
        teacherName: `${exam.owner.firstName} ${exam.owner.lastName}`,
        durationMinutes: activeRev ? Math.round(activeRev.paperDurationSeconds / 60) : 120,
        totalQuestions,
        totalMarks,
        registrationState: activeReg ? activeReg.status : 'NOT_REGISTERED',
        registrationId: activeReg ? activeReg.id : null,
      };
    });
  }

  // 2. Get Exam Details & Access Eligibility
  static async getExamDetails(userId: string, examId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        registrations: {
          where: { userId },
          select: { id: true, status: true, requestedAt: true, decidedAt: true },
        },
        revisions: {
          where: { status: 'PUBLISHED' },
          take: 1,
          select: {
            id: true,
            paperDurationSeconds: true,
            timingMode: true,
            sections: {
              select: {
                questions: {
                  select: {
                    marksOverride: true,
                    questionVersion: {
                      select: { marks: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!exam || exam.status !== 'PUBLISHED') {
      throw new AppError(404, 'Exam not found or not published', 'EXAM_NOT_FOUND');
    }

    const activeReg = exam.registrations[0];
    const activeRev = exam.revisions[0];

    let totalQuestions = 0;
    let totalMarks = 0;

    if (activeRev && activeRev.sections) {
      activeRev.sections.forEach((sec) => {
        totalQuestions += sec.questions.length;
        sec.questions.forEach((q) => {
          totalMarks += q.marksOverride ?? q.questionVersion.marks ?? 0;
        });
      });
    }

    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      accessPolicy: exam.accessPolicy,
      startsAt: exam.startsAt,
      closesAt: exam.closesAt,
      registrationOpensAt: exam.registrationOpensAt,
      registrationClosesAt: exam.registrationClosesAt,
      teacherName: `${exam.owner.firstName} ${exam.owner.lastName}`,
      durationMinutes: activeRev ? Math.round(activeRev.paperDurationSeconds / 60) : 120,
      totalQuestions,
      totalMarks,
      timingMode: activeRev?.timingMode || 'WHOLE_PAPER',
      registrationState: activeReg ? activeReg.status : 'NOT_REGISTERED',
      registrationId: activeReg ? activeReg.id : null,
      revisionId: activeRev?.id || null,
    };
  }

  // 3. Register for Exam (Handles PUBLIC & APPROVAL_REQUIRED)
  static async registerForExam(userId: string, examId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        revisions: {
          where: { status: 'PUBLISHED' },
          take: 1,
        },
      },
    });

    if (!exam || exam.status !== 'PUBLISHED') {
      throw new AppError(404, 'Exam not found or not currently available', 'EXAM_NOT_FOUND');
    }

    const publishedRevision = exam.revisions[0];
    if (!publishedRevision) {
      throw new AppError(400, 'Exam has no published revision available', 'REVISION_NOT_FOUND');
    }

    // Check existing registration
    const existingRegistration = await prisma.examRegistration.findUnique({
      where: {
        examId_userId: { examId, userId },
      },
    });

    if (existingRegistration) {
      throw new AppError(409, `Registration already exists with status: ${existingRegistration.status}`, 'ALREADY_REGISTERED');
    }

    if (exam.accessPolicy === 'INVITATION_ONLY') {
      throw new AppError(400, 'This exam requires a valid invitation code to register.', 'INVITATION_REQUIRED');
    }

    const isPublic = exam.accessPolicy === 'PUBLIC';
    const status: RegistrationStatus = isPublic ? 'APPROVED' : 'REQUESTED';

    // 1. Time Window Check
    const now = new Date();
    if (exam.registrationOpensAt && now < exam.registrationOpensAt) {
      throw new AppError(400, 'Registration for this exam has not opened yet.', 'REGISTRATION_NOT_OPEN');
    }
    if (exam.registrationClosesAt && now > exam.registrationClosesAt) {
      throw new AppError(400, 'Registration window for this exam is closed.', 'REGISTRATION_CLOSED');
    }

    // 2. Capacity Check
    if (exam.capacity) {
      const currentApprovedCount = await prisma.examRegistration.count({
        where: { examId, status: 'APPROVED' },
      });
      if (currentApprovedCount >= exam.capacity) {
        throw new AppError(400, 'Exam registration capacity limit has been reached.', 'CAPACITY_REACHED');
      }
    }

    const registration = await prisma.examRegistration.create({
      data: {
        examId,
        userId,
        revisionId: publishedRevision.id,
        status,
        decision: isPublic ? 'AUTO_APPROVED' : undefined,
        approvedAt: isPublic ? new Date() : undefined,
      },
      include: {
        exam: { select: { title: true } },
      },
    });

    return registration;
  }

  // 4. Redeem Exam Invitation Code
  static async redeemExamInvitation(userId: string, rawToken: string) {
    const tokenHash = sha256(rawToken.trim());

    const invitation = await prisma.examInvitation.findUnique({
      where: { tokenHash },
      include: {
        exam: {
          include: {
            revisions: {
              where: { status: 'PUBLISHED' },
              take: 1,
            },
          },
        },
      },
    });

    if (!invitation || invitation.expiresAt < new Date() || invitation.usedCount >= invitation.maxUses) {
      throw new AppError(400, 'Invitation code is invalid, expired, or already fully redeemed.', 'INVALID_INVITATION');
    }

    // Dual-Mode Verification: If invitation was issued for a specific email or userId, verify matching recipient
    if (invitation.recipientEmail) {
      const studentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (studentUser && invitation.recipientEmail.toLowerCase() !== studentUser.email.toLowerCase()) {
        throw new AppError(
          403,
          `This invitation code was issued specifically for ${invitation.recipientEmail}`,
          'INVITATION_RECIPIENT_MISMATCH'
        );
      }
    }

    if (invitation.recipientUserId && invitation.recipientUserId !== userId) {
      throw new AppError(
        403,
        'This invitation code was issued for a different user account.',
        'INVITATION_RECIPIENT_MISMATCH'
      );
    }

    // Capacity Check
    if (invitation.exam.capacity) {
      const currentApprovedCount = await prisma.examRegistration.count({
        where: { examId: invitation.examId, status: 'APPROVED' },
      });
      if (currentApprovedCount >= invitation.exam.capacity) {
        throw new AppError(400, 'Exam registration capacity limit has been reached.', 'CAPACITY_REACHED');
      }
    }

    const publishedRevision = invitation.exam.revisions[0];
    if (!publishedRevision) {
      throw new AppError(400, 'Associated exam has no published revision', 'REVISION_NOT_FOUND');
    }

    return prisma.$transaction(async (tx) => {
      // Check existing registration
      let registration = await tx.examRegistration.findUnique({
        where: {
          examId_userId: { examId: invitation.examId, userId },
        },
      });

      if (registration) {
        if (registration.status === 'APPROVED') {
          return registration;
        }
        registration = await tx.examRegistration.update({
          where: { id: registration.id },
          data: {
            status: 'APPROVED',
            approvedAt: new Date(),
            invitationId: invitation.id,
          },
        });
      } else {
        registration = await tx.examRegistration.create({
          data: {
            examId: invitation.examId,
            userId,
            revisionId: publishedRevision.id,
            status: 'APPROVED',
            approvedAt: new Date(),
            invitationId: invitation.id,
          },
        });
      }

      // Increment invitation used count
      await tx.examInvitation.update({
        where: { id: invitation.id },
        data: {
          usedCount: { increment: 1 },
        },
      });

      return registration;
    });
  }

  // 5. Get Student Registrations
  static async getStudentRegistrations(userId: string) {
    const registrations = await prisma.examRegistration.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
      include: {
        exam: {
          include: {
            owner: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return registrations.map((reg) => ({
      id: reg.id,
      examId: reg.examId,
      examTitle: reg.exam.title,
      teacherName: `${reg.exam.owner.firstName} ${reg.exam.owner.lastName}`,
      status: reg.status,
      startsAt: reg.exam.startsAt,
      closesAt: reg.exam.closesAt,
      requestedAt: reg.requestedAt,
      approvedAt: reg.approvedAt,
    }));
  }

  // 6. Get Teacher Pending Registration Requests Queue
  static async getTeacherPendingRequests(teacherUserId: string) {
    const requests = await prisma.examRegistration.findMany({
      where: {
        status: 'REQUESTED',
        exam: {
          ownerId: teacherUserId,
        },
      },
      orderBy: { requestedAt: 'asc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        exam: { select: { id: true, title: true, accessPolicy: true } },
      },
    });

    return requests.map((req) => ({
      id: req.id,
      examId: req.exam.id,
      examTitle: req.exam.title,
      studentId: req.user.id,
      studentName: `${req.user.firstName} ${req.user.lastName}`,
      studentEmail: req.user.email,
      requestedAt: req.requestedAt,
      status: req.status,
    }));
  }

  // 7. Decide Teacher Registration Request (Approve or Reject)
  static async decideRegistrationRequest(teacherUserId: string, registrationId: string, decision: 'APPROVED' | 'REJECTED') {
    const registration = await prisma.examRegistration.findUnique({
      where: { id: registrationId },
      include: {
        exam: { select: { ownerId: true } },
      },
    });

    if (!registration) {
      throw new AppError(404, 'Registration request not found', 'REGISTRATION_NOT_FOUND');
    }

    if (registration.exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    const updated = await prisma.examRegistration.update({
      where: { id: registrationId },
      data: {
        status: decision,
        decision: decision === 'APPROVED' ? 'TEACHER_APPROVED' : 'TEACHER_REJECTED',
        decidedBy: teacherUserId,
        decidedAt: new Date(),
        approvedAt: decision === 'APPROVED' ? new Date() : undefined,
        rejectedAt: decision === 'REJECTED' ? new Date() : undefined,
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        exam: { select: { title: true } },
      },
    });

    return updated;
  }

  // 9. Get Exam Distribution Metrics (Teacher View)
  static async getExamDistributionStatus(teacherUserId: string, examId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        invitations: {
          select: { id: true, tokenHash: true, recipientEmail: true, maxUses: true, usedCount: true, expiresAt: true },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    if (!exam) {
      throw new AppError(404, 'Exam not found', 'EXAM_NOT_FOUND');
    }

    if (exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    const approvedCount = await prisma.examRegistration.count({
      where: { examId, status: 'APPROVED' },
    });

    const pendingCount = await prisma.examRegistration.count({
      where: { examId, status: 'REQUESTED' },
    });

    const rejectedCount = await prisma.examRegistration.count({
      where: { examId, status: 'REJECTED' },
    });

    const now = new Date();
    const isRegistrationOpen = now >= exam.registrationOpensAt && now <= exam.registrationClosesAt;

    return {
      examId: exam.id,
      title: exam.title,
      accessPolicy: exam.accessPolicy,
      capacity: exam.capacity,
      approvedCount,
      pendingCount,
      rejectedCount,
      totalRegistrations: exam._count.registrations,
      registrationOpensAt: exam.registrationOpensAt,
      registrationClosesAt: exam.registrationClosesAt,
      isRegistrationOpen,
      invitationsCount: exam.invitations.length,
      invitations: exam.invitations,
    };
  }

  // 8. Create Exam Invitation (Teacher/Owner can issue Shared Class Code or Direct Emailed Invite)
  static async createExamInvitation(teacherUserId: string, data: {
    examId: string;
    recipientEmail?: string;
    maxUses?: number;
    expiresInSeconds?: number;
  }) {
    const exam = await prisma.exam.findUnique({
      where: { id: data.examId },
    });

    if (!exam) {
      throw new AppError(404, 'Exam not found', 'EXAM_NOT_FOUND');
    }

    if (exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    const rawToken = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const tokenHash = sha256(rawToken);
    const expiresIn = data.expiresInSeconds || (7 * 24 * 60 * 60); // 7 days default
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const maxUses = data.recipientEmail ? 1 : (data.maxUses || 30);

    const invitation = await prisma.examInvitation.create({
      data: {
        examId: data.examId,
        tokenHash,
        recipientEmail: data.recipientEmail ? data.recipientEmail.toLowerCase() : null,
        maxUses,
        expiresAt,
      },
    });

    if (data.recipientEmail) {
      EmailService.sendExamInvitation(data.recipientEmail, rawToken).catch(console.error);
    }

    return {
      invitationId: invitation.id,
      examId: invitation.examId,
      rawToken, // Displayed to teacher so they can copy/share it
      recipientEmail: invitation.recipientEmail,
      maxUses: invitation.maxUses,
      expiresAt: invitation.expiresAt,
    };
  }
}
