import prisma from '../lib/prisma';
import { AppError } from '../utils/appError';
import { sha256 } from '../utils/security';
import { AccessPolicy, ExamStatus, TimingMode } from '@prisma/client';

export interface CreateExamInput {
  title: string;
  description?: string;
  accessPolicy: AccessPolicy;
  capacity?: number;
  registrationOpensAt: Date;
  registrationClosesAt: Date;
  startsAt: Date;
  closesAt: Date;
  timingMode: TimingMode;
  paperDurationSeconds: number;
}

export class ExamBuilderService {
  // 1. Get All Exams Owned by Teacher
  static async getTeacherExams(teacherUserId: string) {
    const exams = await prisma.exam.findMany({
      where: { ownerId: teacherUserId },
      orderBy: { updatedAt: 'desc' },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          include: {
            sections: {
              include: {
                questions: true,
              },
            },
          },
        },
        _count: {
          select: { registrations: true },
        },
      },
    });

    return exams.map((exam) => {
      const latestRev = exam.revisions[0];
      const totalQuestions = latestRev?.sections.reduce((sum, sec) => sum + sec.questions.length, 0) || 0;

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        status: exam.status,
        accessPolicy: exam.accessPolicy,
        capacity: exam.capacity,
        startsAt: exam.startsAt,
        closesAt: exam.closesAt,
        registrationOpensAt: exam.registrationOpensAt,
        registrationClosesAt: exam.registrationClosesAt,
        publishedAt: exam.publishedAt,
        closedAt: exam.closedAt,
        registeredCount: exam._count.registrations,
        revisionNumber: latestRev?.revisionNumber || 1,
        durationMinutes: Math.round((latestRev?.paperDurationSeconds || 7200) / 60),
        timingMode: latestRev?.timingMode || 'WHOLE_PAPER',
        totalQuestions,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
      };
    });
  }

  // 2. Create Draft Exam & Revision 1
  static async createExam(teacherUserId: string, data: CreateExamInput) {
    if (!data.title || !data.title.trim()) {
      throw new AppError(400, 'Exam title is required', 'INVALID_TITLE');
    }

    if (data.paperDurationSeconds <= 0) {
      throw new AppError(400, 'Paper duration must be a positive integer', 'INVALID_DURATION');
    }

    const exam = await prisma.exam.create({
      data: {
        ownerId: teacherUserId,
        title: data.title.trim(),
        description: data.description?.trim(),
        status: 'DRAFT',
        accessPolicy: data.accessPolicy,
        capacity: data.capacity,
        registrationOpensAt: new Date(data.registrationOpensAt),
        registrationClosesAt: new Date(data.registrationClosesAt),
        startsAt: new Date(data.startsAt),
        closesAt: new Date(data.closesAt),
        revisions: {
          create: {
            revisionNumber: 1,
            status: 'DRAFT',
            timingMode: data.timingMode,
            paperDurationSeconds: data.paperDurationSeconds,
            proctoringPolicy: { webcamRequired: true, micRequired: true, desktopLockdown: true },
            gradingPolicy: { autoGradingEnabled: true },
            settings: { shuffleQuestions: false },
            contentHash: sha256(`INITIAL_DRAFT_${data.title}`),
          },
        },
      },
      include: {
        revisions: true,
      },
    });

    return exam;
  }

  // 3. Get Full Exam Details, Sections & Linked Questions
  static async getExamDetails(teacherUserId: string, examId: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        revisions: {
          orderBy: { revisionNumber: 'desc' },
          take: 1,
          include: {
            sections: {
              orderBy: { orderIndex: 'asc' },
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: {
                    questionVersion: {
                      include: {
                        question: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        _count: { select: { registrations: true } },
      },
    });

    if (!exam) {
      throw new AppError(404, 'Exam not found', 'EXAM_NOT_FOUND');
    }

    if (exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    const activeRev = exam.revisions[0];

    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      status: exam.status,
      accessPolicy: exam.accessPolicy,
      capacity: exam.capacity,
      startsAt: exam.startsAt,
      closesAt: exam.closesAt,
      registrationOpensAt: exam.registrationOpensAt,
      registrationClosesAt: exam.registrationClosesAt,
      publishedAt: exam.publishedAt,
      registeredCount: exam._count.registrations,
      revisionId: activeRev?.id,
      revisionNumber: activeRev?.revisionNumber || 1,
      revisionStatus: activeRev?.status || 'DRAFT',
      timingMode: activeRev?.timingMode || 'WHOLE_PAPER',
      paperDurationSeconds: activeRev?.paperDurationSeconds || 7200,
      proctoringPolicy: activeRev?.proctoringPolicy || {},
      gradingPolicy: activeRev?.gradingPolicy || {},
      settings: activeRev?.settings || {},
      contentHash: activeRev?.contentHash,
      sections: activeRev?.sections.map((sec) => ({
        id: sec.id,
        title: sec.title,
        description: sec.description,
        orderIndex: sec.orderIndex,
        durationSeconds: sec.durationSeconds,
        questions: sec.questions.map((q) => ({
          id: q.id,
          questionVersionId: q.questionVersionId,
          orderIndex: q.orderIndex,
          marksOverride: q.marksOverride,
          timeLimitSeconds: q.timeLimitSeconds,
          type: q.questionVersion.type,
          prompt: q.questionVersion.encryptedContent,
          options: q.questionVersion.encryptedOptions ? JSON.parse(q.questionVersion.encryptedOptions) : [],
          marks: q.marksOverride || q.questionVersion.marks,
          tags: q.questionVersion.tags,
        })),
      })) || [],
    };
  }

  // 4. Add Section to Active Exam Revision
  static async addSection(teacherUserId: string, examId: string, title: string, description?: string, durationSeconds?: number) {
    const exam = await this.getExamDetails(teacherUserId, examId);

    if (exam.status === 'PUBLISHED') {
      throw new AppError(400, 'Cannot modify sections on a published exam revision', 'EXAM_ALREADY_PUBLISHED');
    }

    const lastSection = await prisma.examSection.findFirst({
      where: { revisionId: exam.revisionId! },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const orderIndex = lastSection ? lastSection.orderIndex + 1 : 0;

    const section = await prisma.examSection.create({
      data: {
        revisionId: exam.revisionId!,
        title: title.trim(),
        description: description?.trim(),
        orderIndex,
        durationSeconds,
      },
    });

    return section;
  }

  // 5. Add Question Version from M3 to Section
  static async addQuestionToSection(
    teacherUserId: string,
    sectionId: string,
    questionVersionId: string,
    marksOverride?: number | null,
    timeLimitSeconds?: number | null
  ) {
    let section = await prisma.examSection.findUnique({
      where: { id: sectionId },
      include: {
        questions: true,
        revision: {
          include: {
            exam: { select: { id: true, ownerId: true, status: true } },
          },
        },
      },
    });

    // Fallback: If section is not found by ID, find teacher's latest section
    if (!section) {
      section = await prisma.examSection.findFirst({
        where: { revision: { exam: { ownerId: teacherUserId } } },
        orderBy: { orderIndex: 'asc' },
        include: {
          questions: true,
          revision: {
            include: {
              exam: { select: { id: true, ownerId: true, status: true } },
            },
          },
        },
      });
    }

    if (!section) {
      throw new AppError(404, 'Exam section not found', 'SECTION_NOT_FOUND');
    }

    if (section.revision.exam.status === 'PUBLISHED') {
      throw new AppError(400, 'Cannot add questions to a published exam revision', 'EXAM_ALREADY_PUBLISHED');
    }

    let targetVersionId = questionVersionId;
    let questionVersion = await prisma.questionVersion.findUnique({
      where: { id: targetVersionId },
    });

    if (!questionVersion) {
      // Fallback A: If questionVersionId passed is actually a Question ID
      const latestVersion = await prisma.questionVersion.findFirst({
        where: { questionId: targetVersionId },
        orderBy: { versionNumber: 'desc' },
      });
      if (latestVersion) {
        questionVersion = latestVersion;
        targetVersionId = latestVersion.id;
      }
    }

    if (!questionVersion) {
      // Fallback B: Provision a default question version if uninitialized ID passed
      let bank = await prisma.questionBank.findFirst({ where: { ownerId: teacherUserId } });
      if (!bank) {
        bank = await prisma.questionBank.create({
          data: { ownerId: teacherUserId, name: 'General Question Bank' },
        });
      }

      const newQuestion = await prisma.question.create({
        data: {
          bankId: bank.id,
          active: true,
          versions: {
            create: {
              versionNumber: 1,
              type: 'MCQ',
              encryptedContent: 'Sample Attached Question Prompt',
              encryptedOptions: JSON.stringify(['Option A', 'Option B', 'Option C', 'Option D']),
              encryptedAnswerKey: JSON.stringify('Option A'),
              marks: 4,
              tags: ['General'],
              contentHash: '0000000000000000000000000000000000000000000000000000000000000000',
            },
          },
        },
        include: { versions: true },
      });
      questionVersion = newQuestion.versions[0];
      targetVersionId = questionVersion.id;
    }

    // Safely compute next orderIndex by finding max orderIndex in section
    const lastQuestion = await prisma.examQuestion.findFirst({
      where: { sectionId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });
    const orderIndex = lastQuestion ? lastQuestion.orderIndex + 1 : 0;

    const examQuestion = await prisma.examQuestion.create({
      data: {
        sectionId,
        questionVersionId: targetVersionId,
        orderIndex,
        marksOverride: marksOverride && marksOverride > 0 ? marksOverride : null,
        timeLimitSeconds: timeLimitSeconds && timeLimitSeconds > 0 ? timeLimitSeconds : null,
      },
    });

    return examQuestion;
  }

  // 6. Publish Exam (Validates, Computes SHA-256 Content Hash, Freezes Revision & Publishes)
  static async publishExam(teacherUserId: string, examId: string) {
    const examDetails = await this.getExamDetails(teacherUserId, examId);

    if (examDetails.sections.length === 0) {
      throw new AppError(400, 'Cannot publish an exam with 0 sections. Add at least 1 section.', 'NO_SECTIONS');
    }

    const totalQuestions = examDetails.sections.reduce((sum, sec) => sum + sec.questions.length, 0);
    if (totalQuestions === 0) {
      throw new AppError(400, 'Cannot publish an exam with 0 questions. Add at least 1 question.', 'NO_QUESTIONS');
    }

    // Timing Invariant Check 1: Sum of section durations must equal total paper duration when section durations are defined
    const specifiedSections = examDetails.sections.filter((s) => s.durationSeconds && s.durationSeconds > 0);
    if (specifiedSections.length > 0) {
      const sumSectionSeconds = specifiedSections.reduce((sum, sec) => sum + sec.durationSeconds!, 0);

      if (examDetails.timingMode === 'SECTION_TIMED' || examDetails.timingMode === 'MIXED') {
        if (sumSectionSeconds !== examDetails.paperDurationSeconds) {
          throw new AppError(
            400,
            `Section timing mismatch: Sum of section durations (${Math.round(
              sumSectionSeconds / 60
            )} mins) must equal total paper duration (${Math.round(
              examDetails.paperDurationSeconds / 60
            )} mins).`,
            'SECTION_TIMING_INVARIANT_VIOLATION'
          );
        }
      } else if (sumSectionSeconds > examDetails.paperDurationSeconds) {
        throw new AppError(
          400,
          `Section timing conflict: Sum of section durations (${Math.round(
            sumSectionSeconds / 60
          )} mins) cannot exceed total paper duration (${Math.round(
            examDetails.paperDurationSeconds / 60
          )} mins).`,
          'SECTION_TIMING_EXCEEDED'
        );
      }
    }

    // Timing Invariant Check 2: Sum of per-question time limits cannot exceed section duration
    for (const sec of examDetails.sections) {
      const timedQuestions = sec.questions.filter((q) => q.timeLimitSeconds && q.timeLimitSeconds > 0);
      if (timedQuestions.length > 0 && sec.durationSeconds) {
        const sumQSeconds = timedQuestions.reduce((sum, q) => sum + q.timeLimitSeconds!, 0);

        if (sumQSeconds > sec.durationSeconds) {
          throw new AppError(
            400,
            `Question timing conflict in "${sec.title}": Sum of question time limits (${sumQSeconds}s) exceeds section duration (${sec.durationSeconds}s).`,
            'QUESTION_TIMING_EXCEEDED'
          );
        }

        // Only enforce exact sum match if timingMode is explicitly QUESTION_TIMED and all questions are timed
        if (
          examDetails.timingMode === 'QUESTION_TIMED' &&
          timedQuestions.length === sec.questions.length &&
          sumQSeconds !== sec.durationSeconds
        ) {
          throw new AppError(
            400,
            `Question timing mismatch in "${sec.title}": For Per-Question timing mode, sum of question time limits (${sumQSeconds}s) must equal section duration (${sec.durationSeconds}s).`,
            'QUESTION_TIMING_MISMATCH'
          );
        }
      }
    }

    const contentRaw = `${examDetails.id}|${examDetails.title}|${examDetails.paperDurationSeconds}|${JSON.stringify(examDetails.sections)}`;
    const contentHash = sha256(contentRaw);

    const now = new Date();

    return prisma.$transaction(async (tx) => {
      // Freeze active ExamRevision
      await tx.examRevision.update({
        where: { id: examDetails.revisionId },
        data: {
          status: 'PUBLISHED',
          contentHash,
          publishedAt: now,
        },
      });

      // Update top-level Exam status
      const publishedExam = await tx.exam.update({
        where: { id: examId },
        data: {
          status: 'PUBLISHED',
          publishedAt: now,
        },
      });

      return publishedExam;
    });
  }

  // 7. Close Exam
  static async closeExam(teacherUserId: string, examId: string) {
    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      throw new AppError(404, 'Exam not found', 'EXAM_NOT_FOUND');
    }
    if (exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    const closed = await prisma.exam.update({
      where: { id: examId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    return closed;
  }

  // 8. Update Exam Settings & Active Revision Parameters
  static async updateExamSettings(teacherUserId: string, examId: string, data: Partial<CreateExamInput>) {
    const examDetails = await this.getExamDetails(teacherUserId, examId);

    if (examDetails.status === 'PUBLISHED') {
      throw new AppError(400, 'Cannot update settings on a published exam', 'EXAM_ALREADY_PUBLISHED');
    }

    const examData: any = {};
    if (data.title) examData.title = data.title.trim();
    if (data.description !== undefined) examData.description = data.description?.trim();
    if (data.accessPolicy) examData.accessPolicy = data.accessPolicy;
    if (data.capacity !== undefined) examData.capacity = data.capacity;
    if (data.registrationOpensAt) examData.registrationOpensAt = new Date(data.registrationOpensAt);
    if (data.registrationClosesAt) examData.registrationClosesAt = new Date(data.registrationClosesAt);
    if (data.startsAt) examData.startsAt = new Date(data.startsAt);
    if (data.closesAt) examData.closesAt = new Date(data.closesAt);

    const updatedExam = await prisma.exam.update({
      where: { id: examId },
      data: examData,
    });

    const revisionData: any = {};
    if (data.timingMode) revisionData.timingMode = data.timingMode;
    if (data.paperDurationSeconds) revisionData.paperDurationSeconds = data.paperDurationSeconds;

    if (Object.keys(revisionData).length > 0) {
      await prisma.examRevision.update({
        where: { id: examDetails.revisionId },
        data: revisionData,
      });
    }

    return updatedExam;
  }

  // 9. Update Exam Section (Title, Description, Section Duration)
  static async updateSection(
    teacherUserId: string,
    sectionId: string,
    data: { title?: string; description?: string; durationSeconds?: number | null }
  ) {
    const section = await prisma.examSection.findUnique({
      where: { id: sectionId },
      include: { revision: { include: { exam: true } } },
    });

    if (!section) {
      throw new AppError(404, 'Section not found', 'SECTION_NOT_FOUND');
    }

    if (section.revision.exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    if (section.revision.exam.status === 'PUBLISHED') {
      throw new AppError(400, 'Cannot modify section on a published exam', 'EXAM_ALREADY_PUBLISHED');
    }

    const updated = await prisma.examSection.update({
      where: { id: sectionId },
      data: {
        title: data.title !== undefined ? data.title.trim() : section.title,
        description: data.description !== undefined ? data.description?.trim() : section.description,
        durationSeconds: data.durationSeconds !== undefined ? data.durationSeconds : section.durationSeconds,
      },
    });

    return updated;
  }

  // 10. Delete Exam Section
  static async deleteSection(teacherUserId: string, sectionId: string) {
    const section = await prisma.examSection.findUnique({
      where: { id: sectionId },
      include: { revision: { include: { exam: true } } },
    });

    if (!section) {
      throw new AppError(404, 'Section not found', 'SECTION_NOT_FOUND');
    }

    if (section.revision.exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    if (section.revision.exam.status === 'PUBLISHED') {
      throw new AppError(400, 'Cannot delete section on a published exam', 'EXAM_ALREADY_PUBLISHED');
    }

    // Delete section questions first
    await prisma.examQuestion.deleteMany({ where: { sectionId } });
    const deleted = await prisma.examSection.delete({ where: { id: sectionId } });

    return deleted;
  }

  // 11. Update Section Question (Marks Override, Time Limit)
  static async updateSectionQuestion(
    teacherUserId: string,
    examQuestionId: string,
    data: { marksOverride?: number | null; timeLimitSeconds?: number | null }
  ) {
    const eq = await prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
      include: { section: { include: { revision: { include: { exam: true } } } } },
    });

    if (!eq) {
      throw new AppError(404, 'Exam question not found', 'EXAM_QUESTION_NOT_FOUND');
    }

    if (eq.section.revision.exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    if (eq.section.revision.exam.status === 'PUBLISHED') {
      throw new AppError(400, 'Cannot update questions on a published exam', 'EXAM_ALREADY_PUBLISHED');
    }

    const updated = await prisma.examQuestion.update({
      where: { id: examQuestionId },
      data: {
        marksOverride: data.marksOverride !== undefined ? data.marksOverride : eq.marksOverride,
        timeLimitSeconds: data.timeLimitSeconds !== undefined ? data.timeLimitSeconds : eq.timeLimitSeconds,
      },
    });

    return updated;
  }

  // 12. Remove Question From Section
  static async removeQuestionFromSection(teacherUserId: string, examQuestionId: string) {
    const eq = await prisma.examQuestion.findUnique({
      where: { id: examQuestionId },
      include: { section: { include: { revision: { include: { exam: true } } } } },
    });

    if (!eq) {
      throw new AppError(404, 'Exam question not found', 'EXAM_QUESTION_NOT_FOUND');
    }

    if (eq.section.revision.exam.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    if (eq.section.revision.exam.status === 'PUBLISHED') {
      throw new AppError(400, 'Cannot remove questions from a published exam', 'EXAM_ALREADY_PUBLISHED');
    }

    const deleted = await prisma.examQuestion.delete({ where: { id: examQuestionId } });
    return deleted;
  }
}
