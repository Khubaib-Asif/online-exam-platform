import prisma from '../lib/prisma';
import { AppError } from '../utils/appError';
import { FlagDecision, FlagType } from '@prisma/client';
import crypto from 'crypto';

export interface TelemetryEventInput {
  eventId?: string;
  eventType: string;
  occurredAtClientMs?: number;
  metadata?: Record<string, any>;
  signature?: string;
}

export interface IngestTelemetryPayload {
  sessionId: string;
  clientSequence?: number;
  events: TelemetryEventInput[];
}

export interface ReviewDecisionInput {
  decision: 'CLEARED' | 'FLAGGED' | 'INCONCLUSIVE';
  reviewNote?: string;
}

export interface ReconnectDecisionInput {
  granted: boolean;
  extensionSeconds?: number;
  reasonNote?: string;
}

export class ProctoringService {
  // Deterministic Risk Deltas (FR-080 / LLD §15.1)
  private static readonly RISK_DELTAS: Record<string, number> = {
    TAB_BLUR: 10,
    FOCUS_LOST: 10,
    FULLSCREEN_EXIT: 20,
    WINDOW_RESIZE: 5,
    COPY_ATTEMPT: 10,
    CONTEXT_MENU: 5,
    SCREENSHOT_ATTEMPT: 15,
    FORBIDDEN_KEYSTROKE: 15,
    FACE_MISSING: 15,
    MULTIPLE_FACES: 30,
    GAZE_OFF_SCREEN: 10,
    SECONDARY_VOICE: 15,
    FORBIDDEN_PROCESS: 40,
    MULTIPLE_DISPLAYS: 30,
    IP_CHANGE: 25,
    GATE_FAILURE: 20,
  };

  // 1. Ingest Signed Telemetry Envelope (FR-077, FR-078, FR-079, FR-080)
  static async ingestTelemetry(userId: string, payload: IngestTelemetryPayload) {
    const { sessionId, events, clientSequence } = payload;

    if (!sessionId) {
      throw new AppError(400, 'Session ID is required for telemetry ingestion', 'INVALID_SESSION_ID');
    }

    const session = await prisma.examSession.findFirst({
      where: { id: sessionId, userId },
      select: {
        id: true,
        status: true,
        riskScore: true,
        clientSequence: true,
        deviceId: true,
        examId: true,
      },
    });

    if (!session) {
      throw new AppError(404, 'Active exam session not found', 'SESSION_NOT_FOUND');
    }

    // Do not mutate risk if session is already terminal
    if (session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED' || session.status === 'TERMINATED') {
      return {
        success: true,
        processedCount: 0,
        currentRiskScore: session.riskScore,
        sessionStatus: session.status,
      };
    }

    let totalRiskDelta = 0;
    const eventsToCreate: Array<{
      sessionId: string;
      eventId: string;
      eventType: string;
      occurredAt: Date;
      metadata: any;
      riskDelta: number;
    }> = [];

    const flagsToCreate: Array<{
      sessionId: string;
      flagType: FlagType;
      confidence: number;
      decision: FlagDecision;
    }> = [];

    const now = new Date();

    for (const evt of events || []) {
      const eventId = evt.eventId || crypto.randomUUID();
      const eventType = (evt.eventType || 'UNKNOWN').toUpperCase();

      // Check deduplication
      const existing = await prisma.proctoringEvent.findUnique({
        where: { eventId },
        select: { id: true },
      });

      if (existing) {
        continue; // Idempotent skip
      }

      const delta = this.RISK_DELTAS[eventType] ?? 5;
      totalRiskDelta += delta;

      const occurredAt = evt.occurredAtClientMs
        ? new Date(evt.occurredAtClientMs)
        : now;

      eventsToCreate.push({
        sessionId: session.id,
        eventId,
        eventType,
        occurredAt,
        metadata: evt.metadata || {},
        riskDelta: delta,
      });

      // Raise ProctoringFlag for severe/anomalous violations
      const mappedFlagType = this.mapToFlagType(eventType);
      if (mappedFlagType) {
        flagsToCreate.push({
          sessionId: session.id,
          flagType: mappedFlagType,
          confidence: 0.95,
          decision: FlagDecision.OPEN,
        });
      }
    }

    // Persist events & flags transactionally
    const newRiskScore = Math.min(100, Math.max(0, session.riskScore + totalRiskDelta));

    await prisma.$transaction(async (tx) => {
      if (eventsToCreate.length > 0) {
        await tx.proctoringEvent.createMany({
          data: eventsToCreate,
          skipDuplicates: true,
        });
      }

      if (flagsToCreate.length > 0) {
        await tx.proctoringFlag.createMany({
          data: flagsToCreate,
        });
      }

      await tx.examSession.update({
        where: { id: session.id },
        data: {
          riskScore: newRiskScore,
          clientSequence: Math.max(session.clientSequence, clientSequence || 0),
        },
      });
    });

    return {
      success: true,
      processedCount: eventsToCreate.length,
      currentRiskScore: newRiskScore,
      sessionStatus: session.status,
    };
  }

  // 2. Query Live Sessions for Teacher / Proctor (M7-S01)
  static async getLiveSessions(
    teacherId: string,
    role: string,
    query?: { examId?: string; search?: string; riskFilter?: string }
  ) {
    // Role-based scope: Teachers see their exams; Owner/Proctors see assigned or all exams
    const whereExam: any = {};
    if (role === 'TEACHER') {
      whereExam.ownerId = teacherId;
    }
    if (query?.examId) {
      whereExam.id = query.examId;
    }

    const sessions = await prisma.examSession.findMany({
      where: {
        exam: whereExam,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
        flags: {
          where: { decision: FlagDecision.OPEN },
          select: { id: true, flagType: true },
        },
        events: {
          orderBy: { occurredAt: 'desc' },
          take: 5,
          select: { eventType: true, occurredAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform sessions into clean live monitoring items
    const liveItems = sessions.map((s) => {
      const studentName = `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim() || s.user.email;
      const riskLevel = this.calculateRiskLevel(s.riskScore);

      // Hardware status inference based on recent events
      const recentEvents = s.events || [];
      const hasRecentFaceLoss = recentEvents.some(
        (e) => e.eventType === 'FACE_MISSING' && Date.now() - new Date(e.occurredAt).getTime() < 30000
      );
      const hasRecentAudioAnomaly = recentEvents.some(
        (e) => e.eventType === 'SECONDARY_VOICE' && Date.now() - new Date(e.occurredAt).getTime() < 30000
      );

      let sessionState: 'ACTIVE' | 'RECONNECTING' | 'SUBMITTED' | 'REVIEW_REQUIRED' = 'ACTIVE';
      if (s.status === 'PAUSED_RECONNECT') {
        sessionState = 'RECONNECTING';
      } else if (s.status === 'SUBMITTED' || s.status === 'AUTO_SUBMITTED') {
        sessionState = 'SUBMITTED';
      } else if (s.riskScore >= 70 || s.flags.length > 0) {
        sessionState = 'REVIEW_REQUIRED';
      }

      return {
        sessionId: s.id,
        studentName,
        studentEmail: s.user.email,
        examTitle: s.exam.title,
        examId: s.exam.id,
        sessionState,
        riskScore: s.riskScore,
        riskLevel,
        cameraStatus: hasRecentFaceLoss ? ('DEGRADED' as const) : ('OK' as const),
        micStatus: hasRecentAudioAnomaly ? ('OFF' as const) : ('OK' as const),
        openFlagsCount: s.flags.length,
        startedAt: s.startedAt ? new Date(s.startedAt).toLocaleTimeString() : 'Not started',
        rawStatus: s.status,
      };
    });

    // Apply optional search and risk filters in memory
    const filtered = liveItems.filter((item) => {
      const matchesSearch =
        !query?.search ||
        item.studentName.toLowerCase().includes(query.search.toLowerCase()) ||
        item.studentEmail.toLowerCase().includes(query.search.toLowerCase()) ||
        item.examTitle.toLowerCase().includes(query.search.toLowerCase());

      const matchesRisk =
        !query?.riskFilter ||
        query.riskFilter === 'ALL' ||
        item.riskLevel === query.riskFilter;

      return matchesSearch && matchesRisk;
    });

    // Compute live metric summary
    const stats = {
      totalActive: liveItems.filter((i) => i.rawStatus === 'ACTIVE').length,
      clearCount: liveItems.filter((i) => i.riskLevel === 'CLEAR').length,
      reconnectingCount: liveItems.filter((i) => i.sessionState === 'RECONNECTING').length,
      reviewRequiredCount: liveItems.filter((i) => i.sessionState === 'REVIEW_REQUIRED' || i.riskLevel === 'HIGH').length,
    };

    return {
      sessions: filtered,
      stats,
    };
  }

  // 3. Query Session Integrity Detail (M7-S02)
  static async getSessionIntegrityDetail(reviewerId: string, role: string, sessionId: string) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            ownerId: true,
          },
        },
        events: {
          orderBy: { occurredAt: 'desc' },
          take: 100,
        },
        flags: {
          orderBy: { createdAt: 'desc' },
          include: {
            reviewer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new AppError(404, 'Exam session not found', 'SESSION_NOT_FOUND');
    }

    if (role === 'TEACHER' && session.exam.ownerId !== reviewerId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    const studentName = `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email;
    const riskLevel = this.calculateRiskLevel(session.riskScore);

    const signals = session.events.map((e) => {
      const severity = e.riskDelta >= 20 ? 'HIGH' : e.riskDelta >= 10 ? 'MEDIUM' : 'LOW';
      return {
        id: e.id,
        eventId: e.eventId,
        time: new Date(e.occurredAt).toLocaleTimeString(),
        timestamp: e.occurredAt.toISOString(),
        type: e.eventType,
        severity,
        riskDelta: e.riskDelta,
        note: this.formatEventDescription(e.eventType, e.metadata),
      };
    });

    return {
      session: {
        id: session.id,
        studentName,
        studentEmail: session.user.email,
        examTitle: session.exam.title,
        examId: session.exam.id,
        riskScore: session.riskScore,
        riskLevel,
        status: session.status,
        startedAt: session.startedAt?.toISOString() || null,
        reconnectCount: session.reconnectCount,
      },
      signals,
      flags: session.flags.map((f) => ({
        id: f.id,
        flagType: f.flagType,
        confidence: Number(f.confidence),
        decision: f.decision,
        reviewNote: f.reviewNote,
        reviewedAt: f.reviewedAt?.toISOString() || null,
        reviewedBy: f.reviewer ? `${f.reviewer.firstName} ${f.reviewer.lastName}` : null,
      })),
    };
  }

  // 4. Record Teacher Review Decision (M7-S03 / FR-082)
  static async recordReviewDecision(
    reviewerId: string,
    role: string,
    sessionId: string,
    input: ReviewDecisionInput
  ) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: true },
    });

    if (!session) {
      throw new AppError(404, 'Exam session not found', 'SESSION_NOT_FOUND');
    }

    if (role === 'TEACHER' && session.exam.ownerId !== reviewerId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    const now = new Date();
    const decisionFlag =
      input.decision === 'CLEARED'
        ? FlagDecision.NO_ACTION
        : input.decision === 'FLAGGED'
        ? FlagDecision.WARNING_ISSUED
        : FlagDecision.OPEN;

    await prisma.$transaction(async (tx) => {
      // Update open flags
      await tx.proctoringFlag.updateMany({
        where: { sessionId: session.id, decision: FlagDecision.OPEN },
        data: {
          decision: decisionFlag,
          reviewedBy: reviewerId,
          reviewNote: input.reviewNote || null,
          reviewedAt: now,
        },
      });

      // Write immutable audit log
      await tx.auditEvent.create({
        data: {
          actorId: reviewerId,
          action: 'INTEGRITY_REVIEW_RECORDED',
          resourceType: 'ExamSession',
          resourceId: session.id,
          sessionId: session.id,
          metadata: {
            decision: input.decision,
            reviewNote: input.reviewNote,
            recordedAt: now.toISOString(),
          },
          recordHash: crypto.createHash('sha256').update(`${session.id}|${input.decision}|${now.toISOString()}`).digest('hex'),
        },
      });
    });

    return {
      success: true,
      sessionId: session.id,
      decision: input.decision,
      reviewedAt: now.toISOString(),
    };
  }

  // 5. Teacher Reconnect Decision (M7-S04 / FR-092)
  static async recordReconnectDecision(
    reviewerId: string,
    role: string,
    sessionId: string,
    input: ReconnectDecisionInput
  ) {
    const session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { exam: true },
    });

    if (!session) {
      throw new AppError(404, 'Exam session not found', 'SESSION_NOT_FOUND');
    }

    if (role === 'TEACHER' && session.exam.ownerId !== reviewerId) {
      throw new AppError(403, 'Forbidden: You do not own this exam', 'FORBIDDEN');
    }

    const now = new Date();

    if (input.granted) {
      const extensionMs = (input.extensionSeconds || 300) * 1000;
      const newDeadline = new Date(Date.now() + extensionMs);

      await prisma.$transaction(async (tx) => {
        await tx.examSession.update({
          where: { id: session.id },
          data: {
            reconnectDeadline: newDeadline,
          },
        });

        await tx.auditEvent.create({
          data: {
            actorId: reviewerId,
            action: 'RECONNECT_MANUAL_GRANTED',
            resourceType: 'ExamSession',
            resourceId: session.id,
            sessionId: session.id,
            metadata: {
              granted: true,
              extensionSeconds: input.extensionSeconds || 300,
              reasonNote: input.reasonNote,
            },
            recordHash: crypto.createHash('sha256').update(`${session.id}|GRANTED|${now.toISOString()}`).digest('hex'),
          },
        });
      });

      return {
        success: true,
        sessionId: session.id,
        action: 'GRANTED',
        reconnectDeadline: newDeadline.toISOString(),
      };
    } else {
      // Terminate attempt
      await prisma.$transaction(async (tx) => {
        await tx.examSession.update({
          where: { id: session.id },
          data: {
            status: 'TERMINATED',
            terminalReason: input.reasonNote || 'Teacher denied reconnection request',
            terminatedAt: now,
          },
        });

        await tx.auditEvent.create({
          data: {
            actorId: reviewerId,
            action: 'RECONNECT_DENIED_TERMINATED',
            resourceType: 'ExamSession',
            resourceId: session.id,
            sessionId: session.id,
            metadata: {
              granted: false,
              reasonNote: input.reasonNote,
              terminatedAt: now.toISOString(),
            },
            recordHash: crypto.createHash('sha256').update(`${session.id}|DENIED|${now.toISOString()}`).digest('hex'),
          },
        });
      });

      return {
        success: true,
        sessionId: session.id,
        action: 'DENIED_TERMINATED',
        terminatedAt: now.toISOString(),
      };
    }
  }

  // Helper: Categorize risk score into human-readable levels
  private static calculateRiskLevel(score: number): 'CLEAR' | 'LOW' | 'MEDIUM' | 'HIGH' {
    if (score <= 25) return 'CLEAR';
    if (score <= 45) return 'LOW';
    if (score <= 70) return 'MEDIUM';
    return 'HIGH';
  }

  // Helper: Map string event type to Prisma FlagType enum
  private static mapToFlagType(eventType: string): FlagType | null {
    switch (eventType) {
      case 'FACE_MISSING':
        return FlagType.FACE_MISSING;
      case 'MULTIPLE_FACES':
        return FlagType.MULTIPLE_FACES;
      case 'GAZE_OFF_SCREEN':
        return FlagType.GAZE_OFF_SCREEN;
      case 'FORBIDDEN_PROCESS':
        return FlagType.FORBIDDEN_PROCESS;
      case 'TAB_BLUR':
      case 'FOCUS_LOST':
        return FlagType.TAB_BLUR;
      case 'COPY_ATTEMPT':
        return FlagType.COPY_ATTEMPT;
      case 'SECONDARY_VOICE':
        return FlagType.SECONDARY_VOICE;
      case 'DEVICE_MISMATCH':
        return FlagType.DEVICE_MISMATCH;
      case 'IP_CHANGE':
        return FlagType.IP_CHANGE;
      case 'WINDOW_RESIZE':
        return FlagType.WINDOW_RESIZE;
      case 'SCREENSHOT_ATTEMPT':
      case 'FORBIDDEN_KEYSTROKE':
        return FlagType.SCREENSHOT_ATTEMPT;
      case 'CONTEXT_MENU':
        return FlagType.CONTEXT_MENU;
      case 'FULLSCREEN_EXIT':
      case 'MULTIPLE_DISPLAYS':
        return FlagType.FULLSCREEN_EXIT;
      case 'GATE_FAILURE':
        return FlagType.GATE_FAILURE;
      default:
        return null;
    }
  }

  // Helper: Format event descriptions
  private static formatEventDescription(eventType: string, metadata: any): string {
    if (metadata?.details) return String(metadata.details);
    switch (eventType) {
      case 'TAB_BLUR':
      case 'FOCUS_LOST':
        return 'Exam window lost focus or candidate attempted task-switching.';
      case 'FULLSCREEN_EXIT':
        return 'Candidate exited full-screen kiosk lockdown environment.';
      case 'FORBIDDEN_KEYSTROKE':
        return 'Forbidden system shortcut intercepted by native shell.';
      case 'MULTIPLE_DISPLAYS':
        return 'Secondary monitor or external display attachment detected.';
      case 'COPY_ATTEMPT':
        return 'Copy, cut, or clipboard access shortcut intercepted.';
      case 'CONTEXT_MENU':
        return 'Right-click context menu attempt intercepted.';
      case 'SECONDARY_VOICE':
        return 'Ambient microphone audio level exceeded speech threshold.';
      case 'FACE_MISSING':
        return 'Video stream lost candidate face visibility.';
      case 'MULTIPLE_FACES':
        return 'Multiple faces detected in camera capture frame.';
      default:
        return `Security event recorded: ${eventType}`;
    }
  }
}
