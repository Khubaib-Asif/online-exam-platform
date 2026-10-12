import prisma from '../lib/prisma';
import { AppError } from '../utils/appError';
import { sha256 } from '../utils/security';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';
import { GradingService } from './grading.service';

export interface SessionProjection {
  sessionId: string;
  examId: string;
  examTitle: string;
  timingMode: string;
  status: string;
  clientSequence: number;
  serverTime: string;
  paperDeadline: string;
  sectionDeadline: string | null;
  questionDeadline: string | null;
  totalQuestions: number;
  currentQuestionIndex: number;
  currentSectionIndex: number;
  sectionTitle: string;
  currentQuestion: {
    id: string;
    sequenceIndex: number;
    type: string;
    prompt: string;
    options?: Array<{ id: string; text: string }>;
    marks: number;
    timeLimitSeconds?: number | null;
    isLocked: boolean;
  } | null;
  isComplete: boolean;
}

export class SessionService {
  // Helper: Build authoritative synchronous schedule across sections and questions
  private static buildSynchronousTimeline(exam: any, revision: any) {
    const startsAt = exam?.startsAt ? new Date(exam.startsAt) : new Date();
    const paperDurationSeconds = revision.paperDurationSeconds || 7200;
    const paperDeadline = exam?.closesAt ? new Date(exam.closesAt) : new Date(startsAt.getTime() + paperDurationSeconds * 1000);

    const sortedSections = [...(revision.sections || [])].sort((a: any, b: any) => a.orderIndex - b.orderIndex);

    let currentSecStartMs = startsAt.getTime();
    const sectionSchedules = sortedSections.map((sec: any, secIdx: number) => {
      const durSec = sec.durationSeconds || Math.round(paperDurationSeconds / Math.max(1, sortedSections.length));
      const startAt = new Date(currentSecStartMs);
      const endAt = new Date(currentSecStartMs + durSec * 1000);
      currentSecStartMs = endAt.getTime();
      return {
        sectionId: sec.id,
        sectionIndex: secIdx,
        sectionTitle: sec.title,
        durationSeconds: durSec,
        startAt,
        endAt,
      };
    });

    let currentQStartMs = startsAt.getTime();
    const questionTimeline: Array<{
      examQuestionId: string;
      questionIndex: number;
      sectionIndex: number;
      sectionId: string;
      sectionTitle: string;
      sectionDurationSeconds?: number | null;
      questionVersion: any;
      marks: number;
      timeLimitSeconds?: number | null;
      sectionStartAt: Date;
      sectionEndAt: Date;
      questionStartAt: Date;
      questionEndAt: Date;
    }> = [];

    let qIndex = 0;
    sortedSections.forEach((sec: any, secIdx: number) => {
      const secSched = sectionSchedules[secIdx];
      const sortedQ = [...(sec.questions || [])].sort((a: any, b: any) => a.orderIndex - b.orderIndex);

      sortedQ.forEach((eq: any) => {
        const qTimeLimit = eq.timeLimitSeconds || (secSched.durationSeconds ? Math.round(secSched.durationSeconds / Math.max(1, sortedQ.length)) : 300);
        const qStartAt = new Date(currentQStartMs);
        const qEndAt = new Date(currentQStartMs + qTimeLimit * 1000);
        currentQStartMs = qEndAt.getTime();

        questionTimeline.push({
          examQuestionId: eq.id,
          questionIndex: qIndex,
          sectionIndex: secIdx,
          sectionId: sec.id,
          sectionTitle: sec.title,
          sectionDurationSeconds: sec.durationSeconds,
          questionVersion: eq.questionVersion,
          marks: eq.marksOverride || eq.questionVersion.marks,
          timeLimitSeconds: eq.timeLimitSeconds,
          sectionStartAt: secSched.startAt,
          sectionEndAt: secSched.endAt,
          questionStartAt: qStartAt,
          questionEndAt: qEndAt,
        });
        qIndex++;
      });
    });

    return {
      paperDeadline,
      sectionSchedules,
      questionTimeline,
    };
  }

  // 1. Start or Resume Session (M6-S01)
  static async startSession(userId: string, examId: string, entryToken?: string): Promise<SessionProjection> {
    let targetSessionId = '';

    if (entryToken) {
      try {
        const decoded = jwt.verify(entryToken, env.JWT_SECRET) as any;
        if (decoded.type === 'ENTRY_AUTHORISATION' && decoded.userId === userId && decoded.examId === examId) {
          targetSessionId = decoded.sessionId;
        }
      } catch (err) {
        console.warn('Entry token verification fallback:', err);
      }
    }

    let session = await prisma.examSession.findFirst({
      where: targetSessionId
        ? { id: targetSessionId, userId }
        : { examId, userId },
      include: {
        exam: { select: { id: true, title: true, startsAt: true, closesAt: true, lateEntryGraceMinutes: true } },
        revision: {
          include: {
            sections: {
              orderBy: { orderIndex: 'asc' },
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: { questionVersion: true },
                },
              },
            },
          },
        },
        attempts: { orderBy: { orderIndexAtStart: 'asc' } },
      },
    });

    if (!session) {
      throw new AppError(404, 'Exam session not found. Please complete the security gates first.', 'SESSION_NOT_FOUND');
    }

    if (
      ['SUBMITTED', 'AUTO_SUBMITTED', 'TERMINATED', 'GRADING', 'GRADED', 'PUBLISHED'].includes(session.status)
    ) {
      throw new AppError(
        400,
        'You have already completed and submitted this examination. Re-entry is not permitted.',
        'EXAM_ALREADY_SUBMITTED'
      );
    }

    const exam = session.exam;
    const now = new Date();

    if (exam) {
      if (exam.startsAt && now < exam.startsAt) {
        throw new AppError(
          400,
          `The examination has not started yet. Starts at ${exam.startsAt.toLocaleString()}`,
          'EXAM_NOT_STARTED'
        );
      }
      if (exam.closesAt && now > exam.closesAt) {
        throw new AppError(400, 'The examination window has closed.', 'EXAM_CLOSED');
      }
    }

    const timeline = this.buildSynchronousTimeline(exam, session.revision);
    const orderedQuestions = timeline.questionTimeline;

    if (orderedQuestions.length === 0) {
      throw new AppError(400, 'Exam has no questions published.', 'NO_QUESTIONS');
    }

    // If session is still in ENTRY_GATES or PENDING -> Initialize QuestionAttempts & Synchronous Deadlines
    if (session.status === 'ENTRY_GATES' || session.status === 'PENDING') {
      if (exam?.startsAt) {
        const graceMinutes = exam.lateEntryGraceMinutes ?? 15;
        const lateCutoffMs = exam.startsAt.getTime() + graceMinutes * 60 * 1000;
        if (now.getTime() > lateCutoffMs) {
          throw new AppError(
            400,
            `Late entry is closed. The allowed entry window of ${graceMinutes} minutes after exam start has elapsed.`,
            'LATE_ENTRY_DENIED'
          );
        }
      }

      const timingMode = session.revision.timingMode || 'WHOLE_PAPER';
      const paperDeadline = timeline.paperDeadline;

      let targetQuestionIndex = 0;
      let targetSectionIndex = 0;
      let activeSectionDeadline: Date | null = null;
      let activeQuestionDeadline: Date | null = null;

      const attemptInitialStates: Array<{
        examQuestionId: string;
        orderIndexAtStart: number;
        outcome: 'NOT_STARTED' | 'ACTIVE' | 'TIMED_OUT' | 'SKIPPED_BY_SECTION_TIMEOUT';
        activeAt: Date | null;
        terminalAt: Date | null;
      }> = [];

      if (timingMode === 'QUESTION_TIMED') {
        let foundActive = false;

        for (let i = 0; i < orderedQuestions.length; i++) {
          const q = orderedQuestions[i];
          if (now >= q.questionEndAt) {
            attemptInitialStates.push({
              examQuestionId: q.examQuestionId,
              orderIndexAtStart: i,
              outcome: 'TIMED_OUT',
              activeAt: null,
              terminalAt: q.questionEndAt,
            });
          } else if (!foundActive && now >= q.questionStartAt && now < q.questionEndAt) {
            foundActive = true;
            targetQuestionIndex = i;
            targetSectionIndex = q.sectionIndex;
            activeQuestionDeadline = q.questionEndAt;
            activeSectionDeadline = q.sectionEndAt;

            attemptInitialStates.push({
              examQuestionId: q.examQuestionId,
              orderIndexAtStart: i,
              outcome: 'ACTIVE',
              activeAt: now,
              terminalAt: null,
            });
          } else {
            attemptInitialStates.push({
              examQuestionId: q.examQuestionId,
              orderIndexAtStart: i,
              outcome: 'NOT_STARTED',
              activeAt: null,
              terminalAt: null,
            });
          }
        }

        if (!foundActive && now >= timeline.paperDeadline) {
          return this.autoSubmitExpiredExam(session, orderedQuestions, 'PAPER_TIMEOUT');
        }

        if (!foundActive && attemptInitialStates.length > 0) {
          const firstPending = attemptInitialStates.findIndex((a) => a.outcome === 'NOT_STARTED');
          if (firstPending !== -1) {
            targetQuestionIndex = firstPending;
            targetSectionIndex = orderedQuestions[firstPending].sectionIndex;
            activeQuestionDeadline = orderedQuestions[firstPending].questionEndAt;
            activeSectionDeadline = orderedQuestions[firstPending].sectionEndAt;
            attemptInitialStates[firstPending].outcome = 'ACTIVE';
            attemptInitialStates[firstPending].activeAt = now;
          }
        }
      } else if (timingMode === 'SECTION_TIMED') {
        let foundActive = false;

        for (let i = 0; i < orderedQuestions.length; i++) {
          const q = orderedQuestions[i];
          if (now >= q.sectionEndAt) {
            attemptInitialStates.push({
              examQuestionId: q.examQuestionId,
              orderIndexAtStart: i,
              outcome: 'SKIPPED_BY_SECTION_TIMEOUT',
              activeAt: null,
              terminalAt: q.sectionEndAt,
            });
          } else if (!foundActive && now >= q.sectionStartAt && now < q.sectionEndAt) {
            foundActive = true;
            targetSectionIndex = q.sectionIndex;
            activeSectionDeadline = q.sectionEndAt;
            targetQuestionIndex = i;

            attemptInitialStates.push({
              examQuestionId: q.examQuestionId,
              orderIndexAtStart: i,
              outcome: 'ACTIVE',
              activeAt: now,
              terminalAt: null,
            });
          } else {
            attemptInitialStates.push({
              examQuestionId: q.examQuestionId,
              orderIndexAtStart: i,
              outcome: 'NOT_STARTED',
              activeAt: null,
              terminalAt: null,
            });
          }
        }

        if (!foundActive && now >= timeline.paperDeadline) {
          return this.autoSubmitExpiredExam(session, orderedQuestions, 'PAPER_TIMEOUT');
        }

        if (!foundActive && attemptInitialStates.length > 0) {
          const firstPending = attemptInitialStates.findIndex((a) => a.outcome === 'NOT_STARTED');
          if (firstPending !== -1) {
            targetQuestionIndex = firstPending;
            targetSectionIndex = orderedQuestions[firstPending].sectionIndex;
            activeSectionDeadline = orderedQuestions[firstPending].sectionEndAt;
            attemptInitialStates[firstPending].outcome = 'ACTIVE';
            attemptInitialStates[firstPending].activeAt = now;
          }
        }
      } else {
        // WHOLE_PAPER or MIXED default
        for (let i = 0; i < orderedQuestions.length; i++) {
          attemptInitialStates.push({
            examQuestionId: orderedQuestions[i].examQuestionId,
            orderIndexAtStart: i,
            outcome: i === 0 ? 'ACTIVE' : 'NOT_STARTED',
            activeAt: i === 0 ? now : null,
            terminalAt: null,
          });
        }
        if (timingMode === 'MIXED') {
          activeSectionDeadline = orderedQuestions[0]?.sectionEndAt || null;
          activeQuestionDeadline = orderedQuestions[0]?.questionEndAt || null;
        }
      }

      await prisma.$transaction(async (tx) => {
        // Create initial QuestionAttempts
        if (session!.attempts.length === 0) {
          for (const item of attemptInitialStates) {
            await tx.questionAttempt.create({
              data: {
                sessionId: session!.id,
                examQuestionId: item.examQuestionId,
                orderIndexAtStart: item.orderIndexAtStart,
                outcome: item.outcome,
                activeAt: item.activeAt,
                terminalAt: item.terminalAt,
              },
            });
          }
        }

        // Activate session with synchronous timeline pointers
        await tx.examSession.update({
          where: { id: session!.id },
          data: {
            status: 'ACTIVE',
            startedAt: now,
            paperDeadline,
            sectionDeadline: activeSectionDeadline,
            questionDeadline: activeQuestionDeadline,
            currentQuestionIndex: targetQuestionIndex,
            currentSectionIndex: targetSectionIndex,
            clientSequence: 1,
          },
        });
      });

      // Reload fresh session state
      session = await prisma.examSession.findUnique({
        where: { id: session.id },
        include: {
          exam: { select: { id: true, title: true, startsAt: true, closesAt: true, lateEntryGraceMinutes: true } },
          revision: {
            include: {
              sections: {
                orderBy: { orderIndex: 'asc' },
                include: {
                  questions: {
                    orderBy: { orderIndex: 'asc' },
                    include: { questionVersion: true },
                  },
                },
              },
            },
          },
          attempts: { orderBy: { orderIndexAtStart: 'asc' } },
        },
      });
    }

    return this.buildSessionProjection(session!, orderedQuestions);
  }

  // 2. Get Current Question Projection & Check Deadlines (M6-S01)
  static async getCurrentQuestion(userId: string, sessionId: string): Promise<SessionProjection> {
    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        exam: { select: { id: true, title: true, startsAt: true, closesAt: true, lateEntryGraceMinutes: true } },
        revision: {
          include: {
            sections: {
              orderBy: { orderIndex: 'asc' },
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: { questionVersion: true },
                },
              },
            },
          },
        },
        attempts: { orderBy: { orderIndexAtStart: 'asc' } },
      },
    });

    if (!session) {
      throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
    }

    const timeline = this.buildSynchronousTimeline(session.exam, session.revision);
    const orderedQuestions = timeline.questionTimeline;

    // Auto-check whole-paper deadline
    if (session.status === 'ACTIVE' && session.paperDeadline && new Date() > session.paperDeadline) {
      return this.autoSubmitExpiredExam(session, orderedQuestions, 'PAPER_TIMEOUT');
    }

    return this.buildSessionProjection(session, orderedQuestions);
  }

  // 3. Submit Question Answer & Permanently Advance Forward (M6-S01 / FR-086, FR-087)
  static async submitQuestion(
    userId: string,
    sessionId: string,
    payload: {
      examQuestionId: string;
      answer?: any;
      clientSequence: number;
      idempotencyKey?: string;
    }
  ): Promise<SessionProjection> {
    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        exam: { select: { id: true, title: true, startsAt: true, closesAt: true, lateEntryGraceMinutes: true } },
        revision: {
          include: {
            sections: {
              orderBy: { orderIndex: 'asc' },
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: { questionVersion: true },
                },
              },
            },
          },
        },
        attempts: { orderBy: { orderIndexAtStart: 'asc' } },
      },
    });

    if (!session) {
      throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
    }

    if (session.status !== 'ACTIVE') {
      throw new AppError(400, `Cannot submit answer. Session status is ${session.status}`, 'INVALID_SESSION_STATUS');
    }

    const timeline = this.buildSynchronousTimeline(session.exam, session.revision);
    const orderedQuestions = timeline.questionTimeline;
    const currentIndex = session.currentQuestionIndex;
    const currentQ = orderedQuestions[currentIndex];

    if (!currentQ || currentQ.examQuestionId !== payload.examQuestionId) {
      throw new AppError(400, 'Question mismatch. Navigation is strictly forward-only.', 'FORWARD_NAVIGATION_VIOLATION');
    }

    const now = new Date();

    // Check paper deadline
    if (session.paperDeadline && now > session.paperDeadline) {
      return this.autoSubmitExpiredExam(session, orderedQuestions, 'PAPER_TIMEOUT');
    }

    const encryptedAnswer = payload.answer !== undefined && payload.answer !== null ? JSON.stringify(payload.answer) : '';
    const answerHash = encryptedAnswer ? sha256(encryptedAnswer) : null;

    const currentAttempt = session.attempts.find((a: any) => a.examQuestionId === payload.examQuestionId);
    const nextIndex = currentIndex + 1;
    const isLastQuestion = nextIndex >= orderedQuestions.length;

    await prisma.$transaction(async (tx) => {
      // 1. Permanently lock the submitted question
      if (currentAttempt) {
        const timeSpent = currentAttempt.activeAt ? Math.round((now.getTime() - currentAttempt.activeAt.getTime())) : 0;
        await tx.questionAttempt.update({
          where: { id: currentAttempt.id },
          data: {
            outcome: 'SUBMITTED',
            encryptedAnswer,
            answerHash,
            terminalAt: now,
            timeSpentMs: timeSpent,
            attemptSequence: { increment: 1 },
          },
        });
      }

      // 2. If more questions exist -> Advance to next question
      if (!isLastQuestion) {
        const nextQ = orderedQuestions[nextIndex];
        const nextAttempt = session!.attempts.find((a: any) => a.examQuestionId === nextQ.examQuestionId);

        if (nextAttempt) {
          await tx.questionAttempt.update({
            where: { id: nextAttempt.id },
            data: {
              outcome: 'ACTIVE',
              activeAt: now,
            },
          });
        }

        // Compute synchronous deadlines for next item
        let nextSectionDeadline: Date | null = null;
        let nextQuestionDeadline: Date | null = null;

        const timingMode = session!.revision.timingMode || 'WHOLE_PAPER';
        if (timingMode === 'QUESTION_TIMED' || timingMode === 'MIXED') {
          nextQuestionDeadline = nextQ.questionEndAt;
          nextSectionDeadline = nextQ.sectionEndAt;
        } else if (timingMode === 'SECTION_TIMED') {
          nextSectionDeadline = nextQ.sectionEndAt;
        }

        await tx.examSession.update({
          where: { id: session!.id },
          data: {
            currentQuestionIndex: nextIndex,
            currentSectionIndex: nextQ.sectionIndex,
            sectionDeadline: nextSectionDeadline,
            questionDeadline: nextQuestionDeadline,
            clientSequence: payload.clientSequence + 1,
          },
        });
      } else {
        // 3. Final question submitted -> Complete Exam Attempt (FR-096)
        await tx.examSession.update({
          where: { id: session!.id },
          data: {
            status: 'SUBMITTED',
            submittedAt: now,
            clientSequence: payload.clientSequence + 1,
          },
        });

        // Enqueue Outbox event for M8 Grading
        await tx.outboxEvent.create({
          data: {
            topic: 'EXAM_SUBMITTED',
            aggregateType: 'ExamSession',
            aggregateId: session!.id,
            payload: {
              sessionId: session!.id,
              examId: session!.examId,
              userId: session!.userId,
              submittedAt: now.toISOString(),
            },
          },
        });
      }

      // 4. Record Audit Trail Event
      await tx.auditEvent.create({
        data: {
          actorId: userId,
          action: isLastQuestion ? 'EXAM_SUBMITTED' : 'QUESTION_SUBMITTED',
          resourceType: 'ExamSession',
          resourceId: session!.id,
          sessionId: session!.id,
          metadata: {
            questionId: payload.examQuestionId,
            sequenceIndex: currentIndex + 1,
            isLastQuestion,
          },
          recordHash: sha256(`${session!.id}|${payload.examQuestionId}|${now.toISOString()}`),
        },
      });
    });

    if (isLastQuestion) {
      GradingService.gradeSession(sessionId).catch((err) =>
        console.error('[AutoGrading] Failed to grade session on submit:', err)
      );
    }

    return this.getCurrentQuestion(userId, sessionId);
  }

  // 4. Skip Question & Permanently Lock (M6-S01 / FR-086, FR-087)
  static async skipQuestion(
    userId: string,
    sessionId: string,
    payload: {
      examQuestionId: string;
      clientSequence: number;
    }
  ): Promise<SessionProjection> {
    return this.submitQuestion(userId, sessionId, {
      examQuestionId: payload.examQuestionId,
      answer: null,
      clientSequence: payload.clientSequence,
    });
  }

  // 5. Final Explicit Exam Submission (M6-S04 / FR-096)
  static async submitExam(userId: string, sessionId: string): Promise<SessionProjection> {
    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        exam: { select: { id: true, title: true, startsAt: true, closesAt: true, lateEntryGraceMinutes: true } },
        revision: {
          include: {
            sections: {
              orderBy: { orderIndex: 'asc' },
              include: {
                questions: {
                  orderBy: { orderIndex: 'asc' },
                  include: { questionVersion: true },
                },
              },
            },
          },
        },
        attempts: true,
      },
    });

    if (!session) {
      throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
    }

    const timeline = this.buildSynchronousTimeline(session.exam, session.revision);
    const orderedQuestions = timeline.questionTimeline;

    if (session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED') {
      return this.buildSessionProjection(session, orderedQuestions);
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // Lock any remaining uncompleted questions as SKIPPED
      await tx.questionAttempt.updateMany({
        where: {
          sessionId: session.id,
          outcome: { in: ['NOT_STARTED', 'ACTIVE'] },
        },
        data: {
          outcome: 'LOCKED',
          terminalAt: now,
        },
      });

      await tx.examSession.update({
        where: { id: session.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: now,
        },
      });

      await tx.outboxEvent.create({
        data: {
          topic: 'EXAM_SUBMITTED',
          aggregateType: 'ExamSession',
          aggregateId: session.id,
          payload: {
            sessionId: session.id,
            examId: session.examId,
            userId: session.userId,
            submittedAt: now.toISOString(),
          },
        },
      });
    });

    GradingService.gradeSession(sessionId).catch((err) =>
      console.error('[AutoGrading] Failed to grade session on early submit:', err)
    );

    return this.getCurrentQuestion(userId, sessionId);
  }

  // 6. Liveness Heartbeat & Clock Sync (FR-084)
  static async heartbeat(userId: string, sessionId: string) {
    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        status: true,
        paperDeadline: true,
        sectionDeadline: true,
        questionDeadline: true,
        deviceId: true,
      },
    });

    if (!session) {
      throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
    }

    if (session.deviceId) {
      await prisma.device.update({
        where: { id: session.deviceId },
        data: { lastSeenAt: new Date() },
      });
    }

    const now = new Date();
    const remainingSeconds = session.paperDeadline
      ? Math.max(0, Math.round((session.paperDeadline.getTime() - now.getTime()) / 1000))
      : 0;

    return {
      status: session.status,
      serverTime: now.toISOString(),
      remainingSeconds,
      paperDeadline: session.paperDeadline?.toISOString(),
      sectionDeadline: session.sectionDeadline?.toISOString() || null,
      questionDeadline: session.questionDeadline?.toISOString() || null,
    };
  }

  // 7. Pause for Reconnect (M6-S02 / FR-092)
  static async pauseReconnect(userId: string, sessionId: string) {
    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
    }

    if (session.reconnectCount >= 3) {
      const terminated = await prisma.examSession.update({
        where: { id: sessionId },
        data: {
          status: 'TERMINATED',
          terminatedAt: new Date(),
          terminalReason: 'RECONNECT_LIMIT_EXCEEDED',
        },
      });
      return { status: 'TERMINATED', terminalReason: 'RECONNECT_LIMIT_EXCEEDED', session: terminated };
    }

    const reconnectDeadline = new Date(Date.now() + 60000); // 60s bounded policy
    const updated = await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        status: 'PAUSED_RECONNECT',
        pausedAt: new Date(),
        reconnectDeadline,
        reconnectCount: { increment: 1 },
      },
    });

    return {
      status: 'PAUSED_RECONNECT',
      reconnectCount: updated.reconnectCount,
      reconnectDeadline: reconnectDeadline.toISOString(),
    };
  }

  // 8. Resume Reconnected Session (M6-S02 / FR-092, FR-093)
  static async resumeSession(userId: string, sessionId: string): Promise<SessionProjection> {
    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
    }

    const now = new Date();
    if (session.reconnectDeadline && now > session.reconnectDeadline) {
      await prisma.examSession.update({
        where: { id: sessionId },
        data: {
          status: 'TERMINATED',
          terminatedAt: now,
          terminalReason: 'RECONNECT_WINDOW_EXPIRED',
        },
      });
      throw new AppError(403, 'Reconnect window expired. Exam attempt terminated.', 'RECONNECT_WINDOW_EXPIRED');
    }

    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
      },
    });

    return this.getCurrentQuestion(userId, sessionId);
  }

  // Helper: Auto-submit on whole-paper timeout
  private static async autoSubmitExpiredExam(
    session: any,
    orderedQuestions: any[],
    reason: string
  ): Promise<SessionProjection> {
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.questionAttempt.updateMany({
        where: {
          sessionId: session.id,
          outcome: { in: ['NOT_STARTED', 'ACTIVE'] },
        },
        data: {
          outcome: 'SKIPPED_BY_PAPER_TIMEOUT',
          terminalAt: now,
        },
      });

      await tx.examSession.update({
        where: { id: session.id },
        data: {
          status: 'AUTO_SUBMITTED',
          submittedAt: now,
          terminalReason: reason,
        },
      });

      await tx.outboxEvent.create({
        data: {
          topic: 'EXAM_SUBMITTED',
          aggregateType: 'ExamSession',
          aggregateId: session.id,
          payload: {
            sessionId: session.id,
            examId: session.examId,
            userId: session.userId,
            submittedAt: now.toISOString(),
            autoSubmitted: true,
          },
        },
      });
    });

    GradingService.gradeSession(session.id).catch((err) =>
      console.error('[AutoGrading] Failed to grade session on timeout:', err)
    );

    return this.buildSessionProjection({ ...session, status: 'AUTO_SUBMITTED', submittedAt: now }, orderedQuestions);
  }

  // Helper: Build Safe Projection Payload
  private static buildSessionProjection(session: any, orderedQuestions: any[]): SessionProjection {
    const currentIndex = session.currentQuestionIndex || 0;
    const currentQ = orderedQuestions[currentIndex] || null;
    const isComplete = ['SUBMITTED', 'AUTO_SUBMITTED', 'TERMINATED', 'GRADING', 'GRADED', 'PUBLISHED'].includes(
      session.status
    );

    return {
      sessionId: session.id,
      examId: session.examId,
      examTitle: session.exam?.title || 'Examination',
      timingMode: session.revision?.timingMode || 'WHOLE_PAPER',
      status: session.status,
      clientSequence: session.clientSequence || 1,
      serverTime: new Date().toISOString(),
      paperDeadline: session.paperDeadline?.toISOString() || new Date().toISOString(),
      sectionDeadline: session.sectionDeadline?.toISOString() || null,
      questionDeadline: session.questionDeadline?.toISOString() || null,
      totalQuestions: orderedQuestions.length,
      currentQuestionIndex: currentIndex,
      currentSectionIndex: session.currentSectionIndex || 0,
      sectionTitle: currentQ?.sectionTitle || 'General Section',
      currentQuestion:
        currentQ && !isComplete
          ? {
              id: currentQ.examQuestionId,
              sequenceIndex: currentIndex + 1,
              type: currentQ.questionVersion.type,
              prompt: currentQ.questionVersion.encryptedContent,
              options: this.parseSafeOptions(currentQ.questionVersion.encryptedOptions),
              marks: currentQ.marks,
              timeLimitSeconds: currentQ.timeLimitSeconds,
              isLocked: false,
            }
          : null,
      isComplete,
    };
  }

  private static parseSafeOptions(encryptedOptions: any): Array<{ id: string; text: string }> {
    if (!encryptedOptions) return [];
    try {
      const parsed = typeof encryptedOptions === 'string' ? JSON.parse(encryptedOptions) : encryptedOptions;
      if (Array.isArray(parsed)) {
        return parsed.map((opt: any, idx: number) => ({
          id: opt.id || String(idx),
          text: opt.text || opt.label || '',
        }));
      }
    } catch {
      // fallback
    }
    return [];
  }
}
