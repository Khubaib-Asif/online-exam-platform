import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../utils/appError';
import { sha256 } from '../utils/security';
import { AiGradingService } from './aiGrading.service';

export class GradingService {
  /**
   * 1. Automatic Grading Engine
   * Evaluates all questions in a submitted exam session:
   * - Objective (MCQ, MSQ, TRUE_FALSE): Deterministic auto-grading against immutable keys
   * - Subjective (SHORT, LONG): AI suggestions via OpenRouter/Fallbacks, flagged as PENDING_AI_REVIEW
   */
  static async gradeSession(sessionId: string) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: true,
        revision: {
          include: {
            sections: {
              include: {
                questions: {
                  include: {
                    questionVersion: true,
                  },
                },
              },
            },
          },
        },
        attempts: {
          include: {
            examQuestion: {
              include: {
                questionVersion: true,
              },
            },
          },
        },
        grades: true,
      },
    });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found for grading.');
    }

    // Collect all exam questions across sections in this revision
    const allExamQuestions = session.revision.sections.flatMap((sec: any) => sec.questions);

    let hasPendingSubjective = false;

    for (const eq of allExamQuestions) {
      const qv = eq.questionVersion;
      const attempt = session.attempts.find((a: any) => a.examQuestionId === eq.id);

      // Parse student answer
      let rawStudentAnswer: any = null;
      if (attempt?.encryptedAnswer) {
        try {
          rawStudentAnswer = JSON.parse(attempt.encryptedAnswer);
        } catch {
          rawStudentAnswer = attempt.encryptedAnswer;
        }
      }

      // Parse teacher answer key
      let rawAnswerKey: any = null;
      if (qv.encryptedAnswerKey) {
        try {
          rawAnswerKey = JSON.parse(qv.encryptedAnswerKey);
        } catch {
          rawAnswerKey = qv.encryptedAnswerKey;
        }
      }

      const maxScore = qv.marks;

      if (['MCQ', 'MSQ', 'TRUE_FALSE'].includes(qv.type)) {
        // --- Deterministic Objective Grading ---
        let awardedScore = 0;

        if (rawStudentAnswer !== null && rawStudentAnswer !== undefined && rawAnswerKey !== null) {
          if (qv.type === 'MCQ') {
            if (String(rawStudentAnswer).trim() === String(rawAnswerKey).trim()) {
              awardedScore = maxScore;
            }
          } else if (qv.type === 'MSQ') {
            // MSQ: exact set match by sorted array of option IDs
            const studentArr = Array.isArray(rawStudentAnswer) ? rawStudentAnswer.map(String).sort() : [];
            const keyArr = Array.isArray(rawAnswerKey) ? rawAnswerKey.map(String).sort() : [];
            if (studentArr.length > 0 && JSON.stringify(studentArr) === JSON.stringify(keyArr)) {
              awardedScore = maxScore;
            }
          } else if (qv.type === 'TRUE_FALSE') {
            const studentBool = String(rawStudentAnswer).toLowerCase() === 'true';
            const keyBool = String(rawAnswerKey).toLowerCase() === 'true';
            if (studentBool === keyBool) {
              awardedScore = maxScore;
            }
          }
        }

        await prisma.grade.upsert({
          where: {
            sessionId_examQuestionId: {
              sessionId: session.id,
              examQuestionId: eq.id,
            },
          },
          create: {
            sessionId: session.id,
            examQuestionId: eq.id,
            maxScore: new Prisma.Decimal(maxScore),
            score: new Prisma.Decimal(awardedScore),
            state: 'NOT_REQUIRED',
            source: 'SYSTEM',
          },
          update: {
            maxScore: new Prisma.Decimal(maxScore),
            score: new Prisma.Decimal(awardedScore),
            state: 'NOT_REQUIRED',
            source: 'SYSTEM',
          },
        });
      } else {
        // --- Subjective Grading (SHORT / LONG) ---
        const answerText = typeof rawStudentAnswer === 'string' ? rawStudentAnswer.trim() : '';

        if (!answerText) {
          // Student left blank -> 0 marks automatically
          await prisma.grade.upsert({
            where: {
              sessionId_examQuestionId: {
                sessionId: session.id,
                examQuestionId: eq.id,
              },
            },
            create: {
              sessionId: session.id,
              examQuestionId: eq.id,
              maxScore: new Prisma.Decimal(maxScore),
              score: new Prisma.Decimal(0),
              state: 'NOT_REQUIRED',
              source: 'SYSTEM',
            },
            update: {
              maxScore: new Prisma.Decimal(maxScore),
              score: new Prisma.Decimal(0),
              state: 'NOT_REQUIRED',
              source: 'SYSTEM',
            },
          });
        } else {
          hasPendingSubjective = true;

          // Parse optional teacher keywords & rubric
          let keywords: string[] = [];
          if (qv.encryptedKeywords) {
            try {
              keywords = JSON.parse(qv.encryptedKeywords);
            } catch {
              keywords = [];
            }
          }

          // Invoke AI grading evaluation
          const aiResult = await AiGradingService.evaluateSubjectiveAnswer({
            questionPrompt: qv.encryptedContent,
            studentAnswer: answerText,
            maxScore,
            questionType: qv.type as 'SHORT' | 'LONG',
            keywords,
            rubric: qv.encryptedRubric,
          });

          await prisma.grade.upsert({
            where: {
              sessionId_examQuestionId: {
                sessionId: session.id,
                examQuestionId: eq.id,
              },
            },
            create: {
              sessionId: session.id,
              examQuestionId: eq.id,
              maxScore: new Prisma.Decimal(maxScore),
              score: null, // Remains pending until teacher confirmation
              state: 'PENDING_AI_REVIEW',
              source: 'AI_SUGGESTION',
              aiSuggestedScore: new Prisma.Decimal(aiResult.suggestedScore),
              aiConfidence: new Prisma.Decimal(aiResult.confidence),
              encryptedReasoning: aiResult.reasoning,
              evidenceRefs: aiResult.matchedKeywords,
            },
            update: {
              maxScore: new Prisma.Decimal(maxScore),
              state: 'PENDING_AI_REVIEW',
              source: 'AI_SUGGESTION',
              aiSuggestedScore: new Prisma.Decimal(aiResult.suggestedScore),
              aiConfidence: new Prisma.Decimal(aiResult.confidence),
              encryptedReasoning: aiResult.reasoning,
              evidenceRefs: aiResult.matchedKeywords,
            },
          });
        }
      }
    }

    // Update session status accordingly
    const newStatus = hasPendingSubjective ? 'GRADING' : 'GRADED';
    await prisma.examSession.update({
      where: { id: session.id },
      data: { status: newStatus },
    });

    return { sessionId: session.id, status: newStatus, hasPendingSubjective };
  }

  /**
   * 2. Teacher Grading Queue
   * List all submitted attempts for exams owned by the teacher
   */
  static async getGradingQueue(teacherId: string, examId?: string, statusFilter?: string) {
    const whereClause: Prisma.ExamSessionWhereInput = {
      exam: {
        ownerId: teacherId,
      },
      status: {
        in: ['SUBMITTED', 'AUTO_SUBMITTED', 'GRADING', 'GRADED', 'PUBLISHED'],
      },
    };

    if (examId) {
      whereClause.examId = examId;
    }

    const sessions = await prisma.examSession.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
        grades: {
          include: {
            examQuestion: {
              include: {
                questionVersion: true,
              },
            },
          },
        },
        resultPublication: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    const queueItems = sessions.map((sess: any) => {
      let objectiveScore = 0;
      let objectiveTotal = 0;
      let hasPendingSubjective = false;
      let hasConfirmedSubjective = false;
      let hasSubjective = false;

      for (const g of sess.grades) {
        const type = g.examQuestion.questionVersion.type;
        const max = Number(g.maxScore);
        const score = g.score ? Number(g.score) : 0;

        if (['MCQ', 'MSQ', 'TRUE_FALSE'].includes(type)) {
          objectiveScore += score;
          objectiveTotal += max;
        } else {
          hasSubjective = true;
          if (g.state === 'PENDING_AI_REVIEW') {
            hasPendingSubjective = true;
          } else if (g.state === 'TEACHER_CONFIRMED') {
            hasConfirmedSubjective = true;
          }
        }
      }

      let subjectiveStatus: 'AUTO_GRADED' | 'PENDING_REVIEW' | 'CONFIRMED' = 'AUTO_GRADED';
      if (hasSubjective) {
        subjectiveStatus = hasPendingSubjective ? 'PENDING_REVIEW' : 'CONFIRMED';
      }

      return {
        submissionId: sess.id,
        sessionId: sess.id,
        studentName: `${sess.user.firstName} ${sess.user.lastName}`.trim(),
        studentEmail: sess.user.email,
        examId: sess.exam.id,
        examTitle: sess.exam.title,
        sessionStatus: sess.status,
        objectiveScore,
        objectiveTotal,
        subjectiveStatus,
        isPublished: !!sess.resultPublication,
        submittedAt: sess.submittedAt ? sess.submittedAt.toISOString() : sess.createdAt.toISOString(),
      };
    });

    if (statusFilter && statusFilter !== 'ALL') {
      return queueItems.filter((item: any) => item.subjectiveStatus === statusFilter);
    }

    return queueItems;
  }

  /**
   * 3. Session Grade Detail / Review Projection
   * Provides complete side-by-side data for reviewing objective & subjective answers
   */
  static async getSessionGradingDetail(teacherId: string, sessionId: string) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        exam: true,
        attempts: {
          include: {
            examQuestion: {
              include: {
                questionVersion: true,
              },
            },
          },
        },
        grades: {
          include: {
            examQuestion: {
              include: {
                questionVersion: true,
              },
            },
          },
        },
        resultPublication: true,
      },
    });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Grading session not found.');
    }

    if (session.exam.ownerId !== teacherId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this exam.');
    }

    let objectiveScore = 0;
    let subjectiveScore = 0;
    let totalMax = 0;
    let hasPendingSubjective = false;

    const gradesDetail = session.grades.map((g: any) => {
      const qv = g.examQuestion.questionVersion;
      const attempt = session.attempts.find((a: any) => a.examQuestionId === g.examQuestionId);

      let parsedAnswer: any = null;
      if (attempt?.encryptedAnswer) {
        try {
          parsedAnswer = JSON.parse(attempt.encryptedAnswer);
        } catch {
          parsedAnswer = attempt.encryptedAnswer;
        }
      }

      let keywords: string[] = [];
      if (qv.encryptedKeywords) {
        try {
          keywords = JSON.parse(qv.encryptedKeywords);
        } catch {
          keywords = [];
        }
      }

      const scoreNum = g.score !== null ? Number(g.score) : null;
      const maxNum = Number(g.maxScore);
      totalMax += maxNum;

      if (['MCQ', 'MSQ', 'TRUE_FALSE'].includes(qv.type)) {
        objectiveScore += scoreNum || 0;
      } else {
        subjectiveScore += scoreNum || 0;
        if (g.state === 'PENDING_AI_REVIEW') {
          hasPendingSubjective = true;
        }
      }

      return {
        id: g.id,
        examQuestionId: g.examQuestionId,
        questionPrompt: qv.encryptedContent,
        questionType: qv.type,
        maxMarks: maxNum,
        awardedMarks: scoreNum,
        state: g.state,
        source: g.source,
        studentAnswer: typeof parsedAnswer === 'string' ? parsedAnswer : JSON.stringify(parsedAnswer),
        rubric: qv.encryptedRubric,
        keywords,
        aiSuggestion: {
          suggestedMarks: g.aiSuggestedScore !== null ? Number(g.aiSuggestedScore) : null,
          confidence: g.aiConfidence !== null ? (Number(g.aiConfidence) > 0.8 ? 'HIGH' : 'MEDIUM') : 'HIGH',
          rationale: g.encryptedReasoning || '',
          matchedKeywords: (g.evidenceRefs as string[]) || [],
        },
        confirmedAt: g.confirmedAt ? g.confirmedAt.toISOString() : null,
      };
    });

    const totalAwarded = objectiveScore + subjectiveScore;

    return {
      submissionId: session.id,
      sessionId: session.id,
      studentName: `${session.user.firstName} ${session.user.lastName}`.trim(),
      studentEmail: session.user.email,
      examId: session.exam.id,
      examTitle: session.exam.title,
      sessionStatus: session.status,
      isPublished: !!session.resultPublication,
      submittedAt: session.submittedAt ? session.submittedAt.toISOString() : session.createdAt.toISOString(),
      totals: {
        objectiveScore,
        subjectiveScore,
        totalAwarded,
        totalMax,
        isReadyForPublication: !hasPendingSubjective,
      },
      grades: gradesDetail,
    };
  }

  /**
   * 4. Teacher Grade Confirmation Command (M8-S03)
   * Confirms final marks for a subjective question, writing immutable history & audit logs
   */
  static async confirmGrade(
    teacherId: string,
    sessionId: string,
    gradeId: string,
    awardedMarks: number,
    feedback?: string
  ) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: true,
        grades: true,
      },
    });

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found.');
    }

    if (session.exam.ownerId !== teacherId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this examination.');
    }

    const grade = session.grades.find((g: any) => g.id === gradeId);
    if (!grade) {
      throw new AppError(404, 'GRADE_NOT_FOUND', 'Grade record not found.');
    }

    const maxMarks = Number(grade.maxScore);
    if (awardedMarks < 0 || awardedMarks > maxMarks) {
      throw new AppError(400, 'INVALID_SCORE', `Score must be between 0 and ${maxMarks}.`);
    }

    const now = new Date();

    return await prisma.$transaction(async (tx: any) => {
      // 1. Update Grade record
      const updatedGrade = await tx.grade.update({
        where: { id: gradeId },
        data: {
          score: new Prisma.Decimal(awardedMarks),
          state: 'TEACHER_CONFIRMED',
          source: 'TEACHER',
          teacherId,
          confirmedAt: now,
        },
      });

      // 2. Append Grade History
      const historyRecordHash = sha256(
        `${gradeId}|${session.id}|${awardedMarks}|${teacherId}|${now.toISOString()}`
      );

      await tx.gradeHistory.create({
        data: {
          gradeId,
          sessionId: session.id,
          previousScore: grade.score,
          newScore: new Prisma.Decimal(awardedMarks),
          source: 'TEACHER',
          actorId: teacherId,
          encryptedNote: feedback || null,
          recordHash: historyRecordHash,
        },
      });

      // 3. Append Audit Event
      await tx.auditEvent.create({
        data: {
          actorId: teacherId,
          action: 'GRADE_TEACHER_CONFIRMED',
          resourceType: 'Grade',
          resourceId: gradeId,
          sessionId: session.id,
          metadata: {
            previousScore: grade.score ? Number(grade.score) : null,
            awardedMarks,
            maxMarks,
            feedback: feedback || '',
            confirmedAt: now.toISOString(),
          },
          recordHash: historyRecordHash,
        },
      });

      // 4. Check if all grades for session are now confirmed / not required
      const remainingPending = await tx.grade.count({
        where: {
          sessionId: session.id,
          state: 'PENDING_AI_REVIEW',
        },
      });

      if (remainingPending === 0) {
        await tx.examSession.update({
          where: { id: session.id },
          data: { status: 'GRADED' },
        });
      }

      return {
        gradeId: updatedGrade.id,
        awardedMarks: Number(updatedGrade.score),
        state: updatedGrade.state,
        remainingPending,
      };
    });
  }

  /**
   * 5. Result Publication Command (M8-S04)
   * Freezes immutable result snapshot with SHA-256 integrity hash
   */
  static async publishExamResults(teacherId: string, examId: string, specificSessionId?: string) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new AppError(404, 'EXAM_NOT_FOUND', 'Exam not found.');
    }

    if (exam.ownerId !== teacherId) {
      throw new AppError(403, 'FORBIDDEN', 'You do not own this examination.');
    }

    const whereClause: Prisma.ExamSessionWhereInput = {
      examId,
      status: {
        in: ['SUBMITTED', 'AUTO_SUBMITTED', 'GRADING', 'GRADED'],
      },
    };

    if (specificSessionId) {
      whereClause.id = specificSessionId;
    }

    const sessions = await prisma.examSession.findMany({
      where: whereClause,
      include: {
        grades: true,
        user: true,
        resultPublication: true,
      },
    });

    if (sessions.length === 0) {
      throw new AppError(400, 'NO_SUBMISSIONS_FOUND', 'No submitted attempts available for publication.');
    }

    // Check for any unconfirmed subjective questions
    for (const s of sessions) {
      const pendingCount = s.grades.filter((g: any) => g.state === 'PENDING_AI_REVIEW').length;
      if (pendingCount > 0) {
        throw new AppError(
          400,
          'GRADING_INCOMPLETE',
          `Cannot publish: Attempt ${s.id} has ${pendingCount} subjective question(s) awaiting teacher confirmation.`
        );
      }
    }

    const publishedResults = [];
    const now = new Date();

    for (const s of sessions) {
      let totalAwarded = 0;
      let totalMax = 0;

      for (const g of s.grades) {
        totalAwarded += g.score ? Number(g.score) : 0;
        totalMax += Number(g.maxScore);
      }

      const resultHash = sha256(
        `${s.id}|${examId}|${s.userId}|${totalAwarded}|${totalMax}|${now.toISOString()}`
      );

      const pub = await prisma.$transaction(async (tx: any) => {
        const publication = await tx.resultPublication.upsert({
          where: { sessionId: s.id },
          create: {
            sessionId: s.id,
            publishedBy: teacherId,
            publishedAt: now,
            resultHash,
          },
          update: {
            publishedBy: teacherId,
            publishedAt: now,
            resultHash,
          },
        });

        await tx.examSession.update({
          where: { id: s.id },
          data: { status: 'PUBLISHED' },
        });

        await tx.auditEvent.create({
          data: {
            actorId: teacherId,
            action: 'RESULT_PUBLISHED',
            resourceType: 'ResultPublication',
            resourceId: publication.id,
            sessionId: s.id,
            metadata: {
              examId,
              studentId: s.userId,
              totalAwarded,
              totalMax,
              publishedAt: now.toISOString(),
            },
            recordHash: resultHash,
          },
        });

        return publication;
      });

      publishedResults.push({
        sessionId: s.id,
        publicationId: pub.id,
        resultHash: pub.resultHash,
      });
    }

    return {
      examId,
      publishedCount: publishedResults.length,
      publishedAt: now.toISOString(),
      results: publishedResults,
    };
  }

  /**
   * 6. Student Results Overview (M8-S05)
   * Authenticated student views only their own published results
   */
  static async getStudentResults(studentId: string) {
    const publishedSessions = await prisma.examSession.findMany({
      where: {
        userId: studentId,
        status: 'PUBLISHED',
        resultPublication: { isNot: null },
      },
      include: {
        exam: {
          include: {
            owner: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        resultPublication: true,
        grades: true,
      },
      orderBy: {
        resultPublication: {
          publishedAt: 'desc',
        },
      },
    });

    return publishedSessions.map((sess: any) => {
      let awardedMarks = 0;
      let totalMarks = 0;

      for (const g of sess.grades) {
        awardedMarks += g.score ? Number(g.score) : 0;
        totalMarks += Number(g.maxScore);
      }

      const percentageVal = totalMarks > 0 ? (awardedMarks / totalMarks) * 100 : 0;
      const gradePercentage = `${percentageVal.toFixed(1)}%`;
      const status: 'PASSED' | 'FAILED' = percentageVal >= 50 ? 'PASSED' : 'FAILED';

      const teacherName = `${sess.exam.owner.firstName} ${sess.exam.owner.lastName}`.trim();

      return {
        resultId: sess.resultPublication?.id || sess.id,
        sessionId: sess.id,
        examId: sess.exam.id,
        examTitle: sess.exam.title,
        teacherName: teacherName.startsWith('Dr.') || teacherName.startsWith('Prof.') ? teacherName : `Prof. ${teacherName}`,
        awardedMarks,
        totalMarks,
        gradePercentage,
        publishedAt: sess.resultPublication?.publishedAt.toISOString() || sess.updatedAt.toISOString(),
        status,
      };
    });
  }

  /**
   * 7. Student Result Detail Projection (M8-S07)
   * Detailed breakdown for student, with answer keys safely redacted
   */
  static async getStudentResultDetail(studentId: string, resultIdOrSessionId: string) {
    const session = await prisma.examSession.findFirst({
      where: {
        userId: studentId,
        status: 'PUBLISHED',
        OR: [
          { id: resultIdOrSessionId },
          { resultPublication: { id: resultIdOrSessionId } },
        ],
      },
      include: {
        exam: {
          include: {
            owner: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        resultPublication: true,
        grades: {
          include: {
            examQuestion: {
              include: {
                questionVersion: true,
              },
            },
          },
        },
      },
    });

    if (!session || !session.resultPublication) {
      throw new AppError(404, 'RESULT_NOT_FOUND', 'Published result not found for this account.');
    }

    let totalAwarded = 0;
    let totalMax = 0;

    const items = session.grades.map((g: any) => {
      const qv = g.examQuestion.questionVersion;
      const awarded = g.score ? Number(g.score) : 0;
      const max = Number(g.maxScore);
      totalAwarded += awarded;
      totalMax += max;

      return {
        id: g.examQuestionId,
        title: qv.encryptedContent.slice(0, 60) + (qv.encryptedContent.length > 60 ? '...' : ''),
        type: qv.type,
        awarded,
        max,
      };
    });

    const percentageVal = totalMax > 0 ? (totalAwarded / totalMax) * 100 : 0;
    const percentage = `${percentageVal.toFixed(1)}%`;
    const status: 'PASSED' | 'FAILED' = percentageVal >= 50 ? 'PASSED' : 'FAILED';
    const teacherName = `${session.exam.owner.firstName} ${session.exam.owner.lastName}`.trim();

    return {
      resultId: session.resultPublication.id,
      sessionId: session.id,
      examId: session.exam.id,
      examTitle: session.exam.title,
      teacherName: teacherName.startsWith('Dr.') || teacherName.startsWith('Prof.') ? teacherName : `Prof. ${teacherName}`,
      publishedAt: session.resultPublication.publishedAt.toISOString(),
      resultHash: session.resultPublication.resultHash,
      totalAwarded,
      totalMax,
      percentage,
      status,
      items,
      teacherFeedback: 'Evaluated and confirmed according to examination standards.',
    };
  }
}

