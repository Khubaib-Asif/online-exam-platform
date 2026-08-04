-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'TEACHER', 'STUDENT', 'PROCTOR');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING_EMAIL');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExamRevisionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "AccessPolicy" AS ENUM ('PUBLIC', 'INVITATION_ONLY', 'APPROVAL_REQUIRED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'ENTRY_GATES', 'ACTIVE', 'PAUSED_RECONNECT', 'SUBMITTED', 'AUTO_SUBMITTED', 'TERMINATED', 'GRADING', 'GRADED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "TimingMode" AS ENUM ('WHOLE_PAPER', 'SECTION_TIMED', 'QUESTION_TIMED', 'MIXED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'MSQ', 'TRUE_FALSE', 'SHORT', 'LONG');

-- CreateEnum
CREATE TYPE "QuestionOutcome" AS ENUM ('NOT_STARTED', 'ACTIVE', 'SUBMITTED', 'TIMED_OUT', 'SKIPPED_BY_SECTION_TIMEOUT', 'SKIPPED_BY_PAPER_TIMEOUT', 'LOCKED');

-- CreateEnum
CREATE TYPE "GradeState" AS ENUM ('NOT_REQUIRED', 'PENDING_AI_REVIEW', 'TEACHER_CONFIRMED');

-- CreateEnum
CREATE TYPE "GradeSource" AS ENUM ('SYSTEM', 'AI_SUGGESTION', 'TEACHER');

-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('FACE_MISSING', 'MULTIPLE_FACES', 'GAZE_OFF_SCREEN', 'FORBIDDEN_PROCESS', 'TAB_BLUR', 'COPY_ATTEMPT', 'SECONDARY_VOICE', 'DEVICE_MISMATCH', 'IP_CHANGE', 'WINDOW_RESIZE', 'SCREENSHOT_ATTEMPT', 'CONTEXT_MENU', 'FULLSCREEN_EXIT', 'GATE_FAILURE');

-- CreateEnum
CREATE TYPE "FlagDecision" AS ENUM ('OPEN', 'NO_ACTION', 'WARNING_ISSUED', 'ESCALATED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "RegistrationDecision" AS ENUM ('AUTO_APPROVED', 'TEACHER_APPROVED', 'TEACHER_REJECTED');

-- CreateEnum
CREATE TYPE "GateStatus" AS ENUM ('PASSED', 'FAILED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('FACE_FRAME', 'SCREEN_RECORDING', 'AUDIO_SAMPLE', 'NATIVE_REPORT', 'NETWORK_REPORT', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "BootstrapStatus" AS ENUM ('UNINITIALISED', 'INITIALISED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('ISSUED', 'REDEEMED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" VARCHAR(512) NOT NULL,
    "role" "Role" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_EMAIL',
    "firstName" VARCHAR(64) NOT NULL,
    "lastName" VARCHAR(64) NOT NULL,
    "biometricRef" VARCHAR(512),
    "profilePhotoRef" VARCHAR(512),
    "profilePhotoSha256" VARCHAR(64),
    "profilePhotoMime" VARCHAR(32),
    "profilePhotoEnrolledAt" TIMESTAMP(3),
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "familyId" VARCHAR(36) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" VARCHAR(512),
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicKeyJwkEncrypted" TEXT NOT NULL,
    "publicKeyThumbprint" VARCHAR(128) NOT NULL,
    "fingerprintHash" VARCHAR(64) NOT NULL,
    "platform" VARCHAR(32) NOT NULL,
    "appVersion" VARCHAR(32) NOT NULL,
    "label" VARCHAR(128),
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastExamSessionId" VARCHAR(36),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "description" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionVersion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "encryptedContent" TEXT NOT NULL,
    "encryptedOptions" TEXT,
    "encryptedAnswerKey" TEXT,
    "encryptedRubric" TEXT,
    "encryptedKeywords" TEXT,
    "referenceSourceRefs" JSONB NOT NULL DEFAULT '[]',
    "marks" INTEGER NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "description" VARCHAR(4000),
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "accessPolicy" "AccessPolicy" NOT NULL,
    "capacity" INTEGER,
    "registrationOpensAt" TIMESTAMP(3) NOT NULL,
    "registrationClosesAt" TIMESTAMP(3) NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamRevision" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "status" "ExamRevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "timingMode" "TimingMode" NOT NULL,
    "paperDurationSeconds" INTEGER NOT NULL,
    "proctoringPolicy" JSONB NOT NULL,
    "gradingPolicy" JSONB NOT NULL,
    "settings" JSONB NOT NULL,
    "contentHash" VARCHAR(64) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSection" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "title" VARCHAR(256) NOT NULL,
    "description" VARCHAR(2000),
    "orderIndex" INTEGER NOT NULL,
    "durationSeconds" INTEGER,

    CONSTRAINT "ExamSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamQuestion" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "questionVersionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "marksOverride" INTEGER,
    "timeLimitSeconds" INTEGER,

    CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamInvitation" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "recipientEmail" VARCHAR(254),
    "recipientUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamRegistration" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REQUESTED',
    "decision" "RegistrationDecision",
    "invitationId" TEXT,
    "decidedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "ExamRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamSession" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "contentHashAtStart" VARCHAR(64) NOT NULL,
    "shuffleSeed" VARCHAR(64) NOT NULL,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "currentSectionIndex" INTEGER NOT NULL DEFAULT 0,
    "paperDeadline" TIMESTAMP(3) NOT NULL,
    "sectionDeadline" TIMESTAMP(3),
    "questionDeadline" TIMESTAMP(3),
    "reconnectCount" INTEGER NOT NULL DEFAULT 0,
    "reconnectDeadline" TIMESTAMP(3),
    "clientSequence" INTEGER NOT NULL DEFAULT 0,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "terminalReason" VARCHAR(128),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "examQuestionId" TEXT NOT NULL,
    "orderIndexAtStart" INTEGER NOT NULL,
    "outcome" "QuestionOutcome" NOT NULL DEFAULT 'NOT_STARTED',
    "activeAt" TIMESTAMP(3),
    "terminalAt" TIMESTAMP(3),
    "encryptedAnswer" TEXT,
    "answerHash" VARCHAR(64),
    "timeSpentMs" INTEGER NOT NULL DEFAULT 0,
    "attemptSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityGate" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "gateName" VARCHAR(64) NOT NULL,
    "status" "GateStatus" NOT NULL,
    "evidenceRef" VARCHAR(512),
    "evidenceHash" VARCHAR(64),
    "reasonCode" VARCHAR(64),
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityGate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventId" VARCHAR(64) NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "riskDelta" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProctoringEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProctoringFlag" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "flagType" "FlagType" NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "decision" "FlagDecision" NOT NULL DEFAULT 'OPEN',
    "reviewedBy" TEXT,
    "reviewNote" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ProctoringFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "examQuestionId" TEXT NOT NULL,
    "maxScore" DECIMAL(8,2) NOT NULL,
    "score" DECIMAL(8,2),
    "state" "GradeState" NOT NULL,
    "source" "GradeSource",
    "aiSuggestedScore" DECIMAL(8,2),
    "aiConfidence" DECIMAL(5,4),
    "encryptedReasoning" TEXT,
    "evidenceRefs" JSONB NOT NULL DEFAULT '[]',
    "teacherId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeHistory" (
    "id" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "previousScore" DECIMAL(8,2),
    "newScore" DECIMAL(8,2),
    "source" "GradeSource" NOT NULL,
    "actorId" TEXT,
    "encryptedNote" TEXT,
    "recordHash" VARCHAR(64) NOT NULL,
    "previousHash" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultPublication" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "publishedBy" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultHash" VARCHAR(64) NOT NULL,

    CONSTRAINT "ResultPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "responseStatus" INTEGER NOT NULL,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "topic" VARCHAR(128) NOT NULL,
    "aggregateType" VARCHAR(64) NOT NULL,
    "aggregateId" VARCHAR(36) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" VARCHAR(128) NOT NULL,
    "resourceType" VARCHAR(64) NOT NULL,
    "resourceId" VARCHAR(36),
    "sessionId" TEXT,
    "deviceId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(512),
    "previousHash" VARCHAR(64),
    "recordHash" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformState" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "bootstrapStatus" "BootstrapStatus" NOT NULL DEFAULT 'UNINITIALISED',
    "bootstrapConsumedAt" TIMESTAMP(3),
    "bootstrapRecordHash" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherInvitation" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TEACHER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'ISSUED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "redeemedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "Device_userId_status_idx" ON "Device"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_publicKeyThumbprint_key" ON "Device"("userId", "publicKeyThumbprint");

-- CreateIndex
CREATE INDEX "QuestionBank_ownerId_updatedAt_idx" ON "QuestionBank"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "Question_bankId_active_idx" ON "Question"("bankId", "active");

-- CreateIndex
CREATE INDEX "QuestionVersion_questionId_createdAt_idx" ON "QuestionVersion"("questionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionVersion_questionId_versionNumber_key" ON "QuestionVersion"("questionId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionVersion_id_contentHash_key" ON "QuestionVersion"("id", "contentHash");

-- CreateIndex
CREATE INDEX "Exam_status_registrationOpensAt_registrationClosesAt_idx" ON "Exam"("status", "registrationOpensAt", "registrationClosesAt");

-- CreateIndex
CREATE INDEX "Exam_ownerId_status_updatedAt_idx" ON "Exam"("ownerId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ExamRevision_examId_status_idx" ON "ExamRevision"("examId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExamRevision_examId_revisionNumber_key" ON "ExamRevision"("examId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSection_revisionId_orderIndex_key" ON "ExamSection"("revisionId", "orderIndex");

-- CreateIndex
CREATE INDEX "ExamQuestion_questionVersionId_idx" ON "ExamQuestion"("questionVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamQuestion_sectionId_orderIndex_key" ON "ExamQuestion"("sectionId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ExamInvitation_tokenHash_key" ON "ExamInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "ExamInvitation_examId_expiresAt_idx" ON "ExamInvitation"("examId", "expiresAt");

-- CreateIndex
CREATE INDEX "ExamRegistration_examId_status_requestedAt_idx" ON "ExamRegistration"("examId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "ExamRegistration_userId_status_requestedAt_idx" ON "ExamRegistration"("userId", "status", "requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExamRegistration_examId_userId_key" ON "ExamRegistration"("examId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamSession_registrationId_key" ON "ExamSession"("registrationId");

-- CreateIndex
CREATE INDEX "ExamSession_examId_status_idx" ON "ExamSession"("examId", "status");

-- CreateIndex
CREATE INDEX "ExamSession_userId_status_idx" ON "ExamSession"("userId", "status");

-- CreateIndex
CREATE INDEX "QuestionAttempt_sessionId_outcome_idx" ON "QuestionAttempt"("sessionId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAttempt_sessionId_examQuestionId_key" ON "QuestionAttempt"("sessionId", "examQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionAttempt_sessionId_orderIndexAtStart_key" ON "QuestionAttempt"("sessionId", "orderIndexAtStart");

-- CreateIndex
CREATE INDEX "SecurityGate_sessionId_gateName_idx" ON "SecurityGate"("sessionId", "gateName");

-- CreateIndex
CREATE UNIQUE INDEX "ProctoringEvent_eventId_key" ON "ProctoringEvent"("eventId");

-- CreateIndex
CREATE INDEX "ProctoringEvent_sessionId_occurredAt_idx" ON "ProctoringEvent"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "ProctoringFlag_sessionId_decision_createdAt_idx" ON "ProctoringFlag"("sessionId", "decision", "createdAt");

-- CreateIndex
CREATE INDEX "Grade_sessionId_state_idx" ON "Grade"("sessionId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_sessionId_examQuestionId_key" ON "Grade"("sessionId", "examQuestionId");

-- CreateIndex
CREATE INDEX "GradeHistory_sessionId_createdAt_idx" ON "GradeHistory"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResultPublication_sessionId_key" ON "ResultPublication"("sessionId");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_actorId_key_key" ON "IdempotencyRecord"("actorId", "key");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "AuditEvent_resourceType_resourceId_createdAt_idx" ON "AuditEvent"("resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_sessionId_createdAt_idx" ON "AuditEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherInvitation_tokenHash_key" ON "TeacherInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "TeacherInvitation_email_status_expiresAt_idx" ON "TeacherInvitation"("email", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "TeacherInvitation_issuedBy_createdAt_idx" ON "TeacherInvitation"("issuedBy", "createdAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionVersion" ADD CONSTRAINT "QuestionVersion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRevision" ADD CONSTRAINT "ExamRevision_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSection" ADD CONSTRAINT "ExamSection_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ExamRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "ExamSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamQuestion" ADD CONSTRAINT "ExamQuestion_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "QuestionVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamInvitation" ADD CONSTRAINT "ExamInvitation_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRegistration" ADD CONSTRAINT "ExamRegistration_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRegistration" ADD CONSTRAINT "ExamRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRegistration" ADD CONSTRAINT "ExamRegistration_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ExamRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRegistration" ADD CONSTRAINT "ExamRegistration_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "ExamInvitation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamRegistration" ADD CONSTRAINT "ExamRegistration_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "ExamRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ExamRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamSession" ADD CONSTRAINT "ExamSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_examQuestionId_fkey" FOREIGN KEY ("examQuestionId") REFERENCES "ExamQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityGate" ADD CONSTRAINT "SecurityGate_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityGate" ADD CONSTRAINT "SecurityGate_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctoringEvent" ADD CONSTRAINT "ProctoringEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctoringFlag" ADD CONSTRAINT "ProctoringFlag_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProctoringFlag" ADD CONSTRAINT "ProctoringFlag_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_examQuestionId_fkey" FOREIGN KEY ("examQuestionId") REFERENCES "ExamQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeHistory" ADD CONSTRAINT "GradeHistory_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultPublication" ADD CONSTRAINT "ResultPublication_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ExamSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultPublication" ADD CONSTRAINT "ResultPublication_publishedBy_fkey" FOREIGN KEY ("publishedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherInvitation" ADD CONSTRAINT "TeacherInvitation_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherInvitation" ADD CONSTRAINT "TeacherInvitation_redeemedUserId_fkey" FOREIGN KEY ("redeemedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
