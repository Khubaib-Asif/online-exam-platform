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
        lateEntryGraceMinutes: exam.lateEntryGraceMinutes ?? 15,
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
      lateEntryGraceMinutes: exam.lateEntryGraceMinutes ?? 15,
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
  static async redeemExamInvitation(userId: string, rawToken: string, expectedExamId?: string) {
    const cleanToken = rawToken.trim();
    const tokenUpper = cleanToken.toUpperCase();
    const tokenHash = sha256(cleanToken);
    const tokenUpperHash = sha256(tokenUpper);

    const invitation = await prisma.examInvitation.findFirst({
      where: {
        OR: [
          { code: cleanToken },
          { code: tokenUpper },
          { tokenHash: tokenHash },
          { tokenHash: tokenUpperHash },
        ],
      },
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

    if (!invitation) {
      throw new AppError(404, 'Invalid invitation code. Please verify the code and try again.', 'INVALID_INVITATION');
    }

    // Strict Cross-Exam Validation: If redeeming on a specific exam's details page, verify token belongs to this exam
    if (expectedExamId && invitation.examId !== expectedExamId) {
      throw new AppError(
        400,
        `This invitation code is for "${invitation.exam?.title || 'a different exam'}", not for this examination.`,
        'INVITATION_EXAM_MISMATCH'
      );
    }

    if (invitation.revokedAt) {
      throw new AppError(400, 'This invitation code has been revoked by the instructor.', 'INVITATION_REVOKED');
    }

    if (invitation.expiresAt < new Date()) {
      throw new AppError(400, 'This invitation code has expired.', 'INVITATION_EXPIRED');
    }

    if (invitation.usedCount >= invitation.maxUses) {
      throw new AppError(400, 'This invitation code has reached its maximum allowed redemptions.', 'INVITATION_MAX_USES_REACHED');
    }

    const exam = invitation.exam;
    if (!exam || exam.status !== 'PUBLISHED') {
      throw new AppError(400, 'The associated exam is not currently published or available.', 'EXAM_NOT_PUBLISHED');
    }

    const now = new Date();
    if (exam.registrationOpensAt && now < exam.registrationOpensAt) {
      throw new AppError(400, 'Registration for this exam has not opened yet.', 'REGISTRATION_NOT_OPEN');
    }
    if (exam.registrationClosesAt && now > exam.registrationClosesAt) {
      throw new AppError(400, 'The registration window for this exam has closed.', 'REGISTRATION_CLOSED');
    }
    if (exam.closesAt && now > exam.closesAt) {
      throw new AppError(400, 'The examination session has already closed.', 'EXAM_CLOSED');
    }

    // Dual-Mode Verification: If invitation was issued for a specific email or userId, verify matching recipient
    const studentUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!studentUser) {
      throw new AppError(404, 'User account not found', 'USER_NOT_FOUND');
    }

    if (invitation.recipientEmail) {
      if (invitation.recipientEmail.toLowerCase() !== studentUser.email.toLowerCase()) {
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
    if (exam.capacity) {
      const currentApprovedCount = await prisma.examRegistration.count({
        where: { examId: invitation.examId, status: 'APPROVED' },
      });
      if (currentApprovedCount >= exam.capacity) {
        throw new AppError(400, 'Exam registration capacity limit has been reached.', 'CAPACITY_REACHED');
      }
    }

    const publishedRevision = exam.revisions[0];
    if (!publishedRevision) {
      throw new AppError(400, 'Associated exam has no published revision available', 'REVISION_NOT_FOUND');
    }

    return prisma.$transaction(async (tx) => {
      // Check existing registration
      let registration = await tx.examRegistration.findUnique({
        where: {
          examId_userId: { examId: invitation.examId, userId },
        },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              startsAt: true,
              closesAt: true,
            },
          },
        },
      });

      if (registration) {
        if (registration.status === 'APPROVED') {
          return {
            ...registration,
            alreadyRegistered: true,
            message: 'You are already registered and approved for this examination.',
          };
        }
        registration = await tx.examRegistration.update({
          where: { id: registration.id },
          data: {
            status: 'APPROVED',
            decision: 'AUTO_APPROVED',
            approvedAt: new Date(),
            invitationId: invitation.id,
          },
          include: {
            exam: {
              select: {
                id: true,
                title: true,
                startsAt: true,
                closesAt: true,
              },
            },
          },
        });
      } else {
        registration = await tx.examRegistration.create({
          data: {
            examId: invitation.examId,
            userId,
            revisionId: publishedRevision.id,
            status: 'APPROVED',
            decision: 'AUTO_APPROVED',
            approvedAt: new Date(),
            invitationId: invitation.id,
          },
          include: {
            exam: {
              select: {
                id: true,
                title: true,
                startsAt: true,
                closesAt: true,
              },
            },
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

      return {
        ...registration,
        alreadyRegistered: false,
        message: 'Invitation code redeemed successfully. You are now registered!',
      };
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
            sessions: {
              where: { userId },
              select: { id: true, status: true },
            },
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
      sessionStatus: reg.exam.sessions[0]?.status || null,
      startsAt: reg.exam.startsAt,
      closesAt: reg.exam.closesAt,
      registrationOpensAt: reg.exam.registrationOpensAt,
      registrationClosesAt: reg.exam.registrationClosesAt,
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
        exam: {
          select: {
            id: true,
            title: true,
            accessPolicy: true,
            registrationOpensAt: true,
            registrationClosesAt: true,
            startsAt: true,
            closesAt: true,
          },
        },
      },
    });

    const now = new Date();

    return requests.map((req) => {
      const isRegistrationOpen =
        (!req.exam.registrationOpensAt || now >= req.exam.registrationOpensAt) &&
        (!req.exam.registrationClosesAt || now <= req.exam.registrationClosesAt);

      return {
        id: req.id,
        examId: req.exam.id,
        examTitle: req.exam.title,
        studentId: req.user.id,
        studentName: `${req.user.firstName} ${req.user.lastName}`,
        studentEmail: req.user.email,
        requestedAt: req.requestedAt,
        status: req.status,
        registrationOpensAt: req.exam.registrationOpensAt,
        registrationClosesAt: req.exam.registrationClosesAt,
        startsAt: req.exam.startsAt,
        closesAt: req.exam.closesAt,
        isRegistrationOpen,
      };
    });
  }

  // 7. Decide Teacher Registration Request (Approve or Reject)
  static async decideRegistrationRequest(teacherUserId: string, registrationId: string, decision: 'APPROVED' | 'REJECTED') {
    const registration = await prisma.examRegistration.findUnique({
      where: { id: registrationId },
      include: {
        exam: {
          select: {
            ownerId: true,
            registrationOpensAt: true,
            registrationClosesAt: true,
            startsAt: true,
            closesAt: true,
            capacity: true,
          },
        },
      },
    });

    if (!registration) {
      throw new AppError(404, 'Registration request not found', 'REGISTRATION_NOT_FOUND');
    }

    if (registration.exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    if (decision === 'APPROVED') {
      const now = new Date();
      if (registration.exam.registrationOpensAt && now < registration.exam.registrationOpensAt) {
        throw new AppError(400, 'Cannot approve request: Registration has not opened yet.', 'REGISTRATION_NOT_OPEN');
      }
      if (registration.exam.registrationClosesAt && now > registration.exam.registrationClosesAt) {
        throw new AppError(400, 'Cannot approve request: Registration window has closed.', 'REGISTRATION_CLOSED');
      }
      if (registration.exam.startsAt && now > registration.exam.startsAt) {
        throw new AppError(400, 'Cannot approve request: Exam has already started.', 'EXAM_ALREADY_STARTED');
      }
      if (registration.exam.closesAt && now > registration.exam.closesAt) {
        throw new AppError(400, 'Cannot approve request: Exam has already closed.', 'EXAM_CLOSED');
      }

      if (registration.exam.capacity) {
        const approvedCount = await prisma.examRegistration.count({
          where: { examId: registration.examId, status: 'APPROVED' },
        });
        if (approvedCount >= registration.exam.capacity) {
          throw new AppError(400, 'Exam registration capacity limit has been reached.', 'CAPACITY_REACHED');
        }
      }
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
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            code: true,
            tokenHash: true,
            recipientEmail: true,
            maxUses: true,
            usedCount: true,
            expiresAt: true,
            revokedAt: true,
            createdAt: true,
          },
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
    const isRegistrationOpen =
      (!exam.registrationOpensAt || now >= exam.registrationOpensAt) &&
      (!exam.registrationClosesAt || now <= exam.registrationClosesAt);

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

  // 8. Create Exam Invitation (Enforces Single Active Class Code per Exam & Emailed Invite Deduplication)
  static async createExamInvitation(teacherUserId: string, data: {
    examId: string;
    recipientEmail?: string;
    maxUses?: number;
    expiresInSeconds?: number;
    customCode?: string;
    regenerate?: boolean;
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

    if (exam.status === 'CLOSED' || exam.status === 'ARCHIVED') {
      throw new AppError(400, 'Cannot create or modify invitation codes for a closed or archived examination.', 'EXAM_CLOSED');
    }

    const recipientEmail = data.recipientEmail ? data.recipientEmail.trim().toLowerCase() : null;

    // 1. If sending a direct email invite, check if an active invite already exists for this student
    if (recipientEmail) {
      const existingEmailInvite = await prisma.examInvitation.findFirst({
        where: {
          examId: data.examId,
          recipientEmail,
          revokedAt: null,
        },
      });

      if (existingEmailInvite && !data.regenerate) {
        EmailService.sendExamInvitation(recipientEmail, existingEmailInvite.code || 'INV-CODE').catch(console.error);
        return {
          invitationId: existingEmailInvite.id,
          examId: existingEmailInvite.examId,
          code: existingEmailInvite.code,
          rawToken: existingEmailInvite.code,
          recipientEmail: existingEmailInvite.recipientEmail,
          maxUses: existingEmailInvite.maxUses,
          expiresAt: existingEmailInvite.expiresAt,
          createdAt: existingEmailInvite.createdAt,
          resent: true,
          message: `Active invitation code resent to ${recipientEmail}`,
        };
      }
    }

    // 2. If creating a Universal Class Code (recipientEmail is null), enforce Single Active Class Code per Exam
    if (!recipientEmail) {
      const existingClassCode = await prisma.examInvitation.findFirst({
        where: {
          examId: data.examId,
          recipientEmail: null,
          revokedAt: null,
        },
      });

      if (existingClassCode) {
        // If not explicitly regenerating and no new custom code provided
        const requestedCustomCode = data.customCode?.trim()
          ? `INV-${data.customCode.trim().replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase()}`
          : null;

        if (!data.regenerate && (!requestedCustomCode || requestedCustomCode === existingClassCode.code)) {
          // Update maxUses if teacher adjusted the capacity limit
          if (data.maxUses && data.maxUses !== existingClassCode.maxUses) {
            const updated = await prisma.examInvitation.update({
              where: { id: existingClassCode.id },
              data: { maxUses: data.maxUses },
            });
            existingClassCode.maxUses = updated.maxUses;
          }

          return {
            invitationId: existingClassCode.id,
            examId: existingClassCode.examId,
            code: existingClassCode.code,
            rawToken: existingClassCode.code,
            recipientEmail: null,
            maxUses: existingClassCode.maxUses,
            expiresAt: existingClassCode.expiresAt,
            createdAt: existingClassCode.createdAt,
            isExisting: true,
            message: 'Active class invitation code already exists for this exam.',
          };
        }

        // If regenerating or assigning a new custom code, automatically revoke previous active class code
        await prisma.examInvitation.update({
          where: { id: existingClassCode.id },
          data: { revokedAt: new Date() },
        });
      }
    }

    // Generate new code
    let rawToken: string;
    if (data.customCode && data.customCode.trim().length > 0) {
      const sanitized = data.customCode.trim().replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
      rawToken = sanitized.startsWith('INV-') ? sanitized : `INV-${sanitized}`;
    } else {
      rawToken = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    const tokenHash = sha256(rawToken);
    const expiresIn = data.expiresInSeconds || (7 * 24 * 60 * 60); // 7 days default
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const maxUses = recipientEmail ? 1 : (data.maxUses || 30);

    // Check if duplicate tokenHash exists across any active invite
    const existing = await prisma.examInvitation.findFirst({
      where: {
        OR: [
          { tokenHash },
          { code: rawToken },
        ],
        revokedAt: null,
      },
    });

    if (existing) {
      throw new AppError(409, 'An active invitation with this code already exists. Please choose another code.', 'DUPLICATE_INVITATION_CODE');
    }

    const invitation = await prisma.examInvitation.create({
      data: {
        examId: data.examId,
        tokenHash,
        code: rawToken,
        recipientEmail,
        maxUses,
        expiresAt,
      },
    });

    if (recipientEmail) {
      EmailService.sendExamInvitation(recipientEmail, rawToken).catch(console.error);
    }

    return {
      invitationId: invitation.id,
      examId: invitation.examId,
      code: invitation.code || rawToken,
      rawToken,
      recipientEmail: invitation.recipientEmail,
      maxUses: invitation.maxUses,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      message: recipientEmail ? `Invitation emailed to ${recipientEmail}` : 'Class invitation code created successfully.',
    };
  }

  // 10. Revoke Exam Invitation
  static async revokeExamInvitation(teacherUserId: string, examId: string, invitationId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new AppError(404, 'Exam not found', 'EXAM_NOT_FOUND');
    }

    if (exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    const invitation = await prisma.examInvitation.findFirst({
      where: { id: invitationId, examId },
    });

    if (!invitation) {
      throw new AppError(404, 'Invitation code not found', 'INVITATION_NOT_FOUND');
    }

    if (invitation.revokedAt) {
      throw new AppError(400, 'This invitation code is already revoked.', 'INVITATION_ALREADY_REVOKED');
    }

    const updated = await prisma.examInvitation.update({
      where: { id: invitationId },
      data: {
        revokedAt: new Date(),
      },
    });

    return updated;
  }
}
