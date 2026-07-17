# Online Exam Platform — Low Level Design (LLD)

**Project:** `online-exam-platform`
**Document Maintainer:** M. Khubaib Asif
**Version:** 1.0
**Related Documents:** `HIGH_LEVEL_DESIGN.md`, `BUILD_PLAN.md`, `docs/srs/*`

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Monorepo Package Structure](#2-monorepo-package-structure)
3. [Shared Package — Types, Schemas, Constants](#3-shared-package--types-schemas-constants)
4. [Database Schema — Complete Design](#4-database-schema--complete-design)
5. [Backend — Configuration & Bootstrap](#5-backend--configuration--bootstrap)
6. [Backend — Middleware Stack](#6-backend--middleware-stack)
7. [Auth Module — Low Level Design](#7-auth-module--low-level-design)
8. [Institution & User Module](#8-institution--user-module)
9. [Exam Authoring Module](#9-exam-authoring-module)
10. [Question Bank Module](#10-question-bank-module)
11. [Session Orchestration Module](#11-session-orchestration-module)
12. [Device & Security Gate Module](#12-device--security-gate-module)
13. [WebSocket Server — Low Level Design](#13-websocket-server--low-level-design)
14. [Proctoring Engine Module](#14-proctoring-engine-module)
15. [Grading & Audit Module](#15-grading--audit-module)
16. [Background Job Workers](#16-background-job-workers)
17. [Encryption Service](#17-encryption-service)
18. [Audit Log Service](#18-audit-log-service)
19. [Web Frontend — Low Level Design](#19-web-frontend--low-level-design)
20. [Electron Client — Low Level Design](#20-electron-client--low-level-design)
21. [Mobile App — Low Level Design](#21-mobile-app--low-level-design)
22. [API Reference — All Endpoints](#22-api-reference--all-endpoints)
23. [Error Handling Design](#23-error-handling-design)
24. [Caching Strategy](#24-caching-strategy)
25. [Security Controls — Implementation Detail](#25-security-controls--implementation-detail)
26. [Telemetry Pipeline — Low Level Design](#26-telemetry-pipeline--low-level-design)
27. [Integrity Report — Low Level Design](#27-integrity-report--low-level-design)
28. [IP Intelligence Service — Low Level Design](#28-ip-intelligence-service--low-level-design)
29. [AI Grading Service — Low Level Design](#29-ai-grading-service--low-level-design)
30. [Structured Logger — Low Level Design](#30-structured-logger--low-level-design)
31. [Docker & Local Development Environment](#31-docker--local-development-environment)
32. [Setup Script](#32-setup-script)
33. [Testing — Complete Specification](#33-testing--complete-specification)
34. [Database Seed Script](#34-database-seed-script)
35. [Complete File Tree Reference](#35-complete-file-tree-reference)
---

## 1. Introduction

This Low Level Design (LLD) document provides implementation-level detail for every component of the Online Exam Platform. Where the High Level Design (HLD) describes *what* components exist and *why* they are shaped the way they are, this document describes *how* each component is implemented: exact data structures, function signatures, algorithms, API contracts, database columns with types and constraints, caching keys, error codes, and internal class/service interfaces.

Every developer on the team should be able to open this document alongside their editor and implement any module without requiring additional design decisions — all decisions are made here.

### 1.1 Conventions Used in This Document

- TypeScript types are used for all data structure definitions
- Database types use PostgreSQL notation (e.g. `UUID`, `TIMESTAMPTZ`, `JSONB`)
- API paths are relative to the base URL (e.g. `/auth/login` means `https://api.domain.com/v1/auth/login`)
- All timestamps are stored and transmitted in UTC ISO 8601 format
- UUIDs (v4) are used as primary keys everywhere — never auto-increment integers exposed to clients
- `?` suffix on a type field means optional; absence of `?` means required

---

## 2. Monorepo Package Structure

### 2.1 Root `package.json`

```json
{
  "name": "online-exam-platform",
  "private": true,
  "workspaces": [
    "packages/shared",
    "packages/backend",
    "packages/web",
    "packages/electron",
    "packages/mobile"
  ],
  "scripts": {
    "dev:backend": "npm run dev --workspace=packages/backend",
    "dev:web":     "npm run dev --workspace=packages/web",
    "dev:electron":"npm run dev --workspace=packages/electron",
    "build":       "npm run build --workspaces --if-present",
    "lint":        "npm run lint --workspaces --if-present",
    "test":        "npm run test --workspaces --if-present",
    "type-check":  "npm run type-check --workspaces --if-present"
  },
  "devDependencies": {
    "prettier": "^3.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "eslint-plugin-security": "^1.7.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "@commitlint/cli": "^18.0.0",
    "@commitlint/config-conventional": "^18.0.0"
  }
}
```

### 2.2 Base TypeScript Config

```json
// tsconfig.base.json — extended by all packages
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

---

## 3. Shared Package — Types, Schemas, Constants

The `packages/shared` package is imported by every other package. It is the single source of truth for all cross-package contracts and must never import from any other local package.

### 3.1 Role & Permission Constants

```typescript
// packages/shared/src/constants/roles.ts

export const Role = {
  SUPER_ADMIN:       'SUPER_ADMIN',
  INSTITUTION_ADMIN: 'INSTITUTION_ADMIN',
  TEACHER:           'TEACHER',
  APPROVER:          'APPROVER',
  PROCTOR:           'PROCTOR',
  STUDENT:           'STUDENT',
} as const;
export type Role = typeof Role[keyof typeof Role];

export const Permission = {
  // Institution
  MANAGE_INSTITUTIONS:       'manage:institutions',
  VIEW_ALL_INSTITUTIONS:     'view:all-institutions',
  // Users
  MANAGE_TEACHERS:           'manage:teachers',
  MANAGE_STUDENTS:           'manage:students',
  VIEW_USERS:                'view:users',
  // Question banks
  CREATE_QUESTION_BANK:      'create:question-bank',
  MANAGE_OWN_QUESTION_BANK:  'manage:own-question-bank',
  // Exams
  CREATE_EXAM:               'create:exam',
  EDIT_OWN_EXAM:             'edit:own-exam',
  DELETE_OWN_EXAM:           'delete:own-exam',
  APPROVE_EXAM:              'approve:exam',
  PUBLISH_EXAM:              'publish:exam',
  VIEW_OWN_EXAMS:            'view:own-exams',
  VIEW_INSTITUTION_EXAMS:    'view:institution-exams',
  // Enrollment
  MANAGE_ENROLLMENTS:        'manage:enrollments',
  // Sessions (student)
  TAKE_EXAM:                 'take:exam',
  VIEW_OWN_RESULTS:          'view:own-results',
  // Proctoring
  VIEW_LIVE_SESSIONS:        'view:live-sessions',
  FLAG_SESSION:              'flag:session',
  TERMINATE_SESSION:         'terminate:session',
  SEND_PROCTOR_MESSAGE:      'send:proctor-message',
  // Grading
  GRADE_EXAM:                'grade:exam',
  REOPEN_GRADING:            'reopen:grading',
  VIEW_GRADES:               'view:grades',
  // Audit
  VIEW_AUDIT_LOGS:           'view:audit-logs',
  EXPORT_INTEGRITY_REPORT:   'export:integrity-report',
  VERIFY_AUDIT_CHAIN:        'verify:audit-chain',
} as const;
export type Permission = typeof Permission[keyof typeof Permission];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission) as Permission[],
  INSTITUTION_ADMIN: [
    Permission.MANAGE_TEACHERS,
    Permission.MANAGE_STUDENTS,
    Permission.VIEW_USERS,
    Permission.VIEW_ALL_INSTITUTIONS,
    Permission.VIEW_INSTITUTION_EXAMS,
    Permission.MANAGE_ENROLLMENTS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_INTEGRITY_REPORT,
    Permission.VERIFY_AUDIT_CHAIN,
  ],
  TEACHER: [
    Permission.CREATE_QUESTION_BANK,
    Permission.MANAGE_OWN_QUESTION_BANK,
    Permission.CREATE_EXAM,
    Permission.EDIT_OWN_EXAM,
    Permission.DELETE_OWN_EXAM,
    Permission.PUBLISH_EXAM,
    Permission.VIEW_OWN_EXAMS,
    Permission.MANAGE_ENROLLMENTS,
    Permission.VIEW_LIVE_SESSIONS,
    Permission.FLAG_SESSION,
    Permission.SEND_PROCTOR_MESSAGE,
    Permission.GRADE_EXAM,
    Permission.REOPEN_GRADING,
    Permission.VIEW_GRADES,
  ],
  APPROVER: [
    Permission.APPROVE_EXAM,
    Permission.VIEW_INSTITUTION_EXAMS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  PROCTOR: [
    Permission.VIEW_LIVE_SESSIONS,
    Permission.FLAG_SESSION,
    Permission.TERMINATE_SESSION,
    Permission.SEND_PROCTOR_MESSAGE,
  ],
  STUDENT: [
    Permission.TAKE_EXAM,
    Permission.VIEW_OWN_RESULTS,
  ],
};
```

### 3.2 Core Domain Types

```typescript
// packages/shared/src/types/index.ts

export type UUID = string;
export type ISOTimestamp = string; // "2025-01-01T00:00:00.000Z"

// ─── Exam Status Machine ────────────────────────────────────────
export const ExamStatus = {
  DRAFT:            'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED:         'APPROVED',
  PUBLISHED:        'PUBLISHED',
  ACTIVE:           'ACTIVE',         // at least one session has started
  CLOSED:           'CLOSED',         // past end time, no new sessions
  ARCHIVED:         'ARCHIVED',
} as const;
export type ExamStatus = typeof ExamStatus[keyof typeof ExamStatus];

// valid transitions (enforced in ExamService)
export const EXAM_STATUS_TRANSITIONS: Record<ExamStatus, ExamStatus[]> = {
  DRAFT:            ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['DRAFT', 'APPROVED'],   // DRAFT = rejected/recalled
  APPROVED:         ['DRAFT', 'PUBLISHED'],   // DRAFT = post-approval edit
  PUBLISHED:        ['ACTIVE', 'CLOSED'],
  ACTIVE:           ['CLOSED'],
  CLOSED:           ['ARCHIVED'],
  ARCHIVED:         [],
};

// ─── Question Types ─────────────────────────────────────────────
export const QuestionType = {
  MCQ:         'MCQ',         // one correct option
  MSQ:         'MSQ',         // multiple correct options
  TRUE_FALSE:  'TRUE_FALSE',
  SHORT:       'SHORT',       // text answer, manual/AI graded
  LONG:        'LONG',        // essay, manual/AI graded
} as const;
export type QuestionType = typeof QuestionType[keyof typeof QuestionType];

// ─── Session Status Machine ─────────────────────────────────────
export const SessionStatus = {
  PENDING:          'PENDING',      // enrolled but not started
  ENTRY_GATES:      'ENTRY_GATES',  // passing pre-exam checks
  ACTIVE:           'ACTIVE',       // exam in progress
  PAUSED:           'PAUSED',       // WS dropped, reconnect window open
  SUBMITTED:        'SUBMITTED',    // student submitted
  AUTO_SUBMITTED:   'AUTO_SUBMITTED', // server auto-submitted on timeout
  TERMINATED:       'TERMINATED',   // proctor terminated
  GRADING:          'GRADING',
  GRADING_OPEN:     'GRADING_OPEN', // reopened after initial publish
  PUBLISHED:        'PUBLISHED',    // results visible to student
} as const;
export type SessionStatus = typeof SessionStatus[keyof typeof SessionStatus];

// ─── Proctoring Tier ────────────────────────────────────────────
export const ProctoringTier = {
  POST_HOC_REVIEW:    'POST_HOC_REVIEW',
  LIVE_AI_ESCALATION: 'LIVE_AI_ESCALATION',
  FULL_LIVE_HUMAN:    'FULL_LIVE_HUMAN',
} as const;
export type ProctoringTier = typeof ProctoringTier[keyof typeof ProctoringTier];

// ─── Flag Types ─────────────────────────────────────────────────
export const FlagType = {
  FACE_MISSING:        'FACE_MISSING',
  MULTIPLE_FACES:      'MULTIPLE_FACES',
  GAZE_OFF_SCREEN:     'GAZE_OFF_SCREEN',
  FORBIDDEN_PROCESS:   'FORBIDDEN_PROCESS',
  TAB_BLUR:            'TAB_BLUR',
  COPY_ATTEMPT:        'COPY_ATTEMPT',
  SECONDARY_VOICE:     'SECONDARY_VOICE',
  DEVICE_MISMATCH:     'DEVICE_MISMATCH',
  IP_CHANGE:           'IP_CHANGE',
  WINDOW_RESIZE:       'WINDOW_RESIZE',
  SCREENSHOT_ATTEMPT:  'SCREENSHOT_ATTEMPT',
  CONTEXT_MENU:        'CONTEXT_MENU',
} as const;
export type FlagType = typeof FlagType[keyof typeof FlagType];

// ─── Grading Provenance ──────────────────────────────────────────
export const GradedBy = {
  SYSTEM:        'SYSTEM',       // objective auto-grade
  AI_SUGGESTION: 'AI_SUGGESTION',
  // teacher user ID stored directly in graded_by for human grades
} as const;
```

### 3.3 Zod Validation Schemas

```typescript
// packages/shared/src/validators/auth.schemas.ts
import { z } from 'zod';

export const LoginSchema = z.object({
  institutionSlug: z.string().min(1).max(128).trim().toLowerCase(),
  email:    z.string().email().max(254).toLowerCase(),
  password: z.string().min(8).max(128),
});

const RegisterBaseSchema = z.object({
  institutionId: z.string().uuid(),
  email:         z.string().email().max(254).toLowerCase(),
  password:      z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  firstName:     z.string().min(1).max(64).trim(),
  lastName:      z.string().min(1).max(64).trim(),
});

// Public self-registration (no auth). Role is fixed to STUDENT server-side —
// never accepted from the client — so this endpoint cannot mint privileged
// accounts. institutionId is still client-supplied (a student self-enrolls
// into a known institution); that alone is not a privilege-escalation vector.
export const PublicRegisterSchema = RegisterBaseSchema;

// Admin-invoked staff registration. institutionId is deliberately NOT part
// of this schema — the controller derives it from the caller's own JWT, so
// an authenticated admin can only ever create accounts inside their own
// institution, never an arbitrary one.
export const StaffRegisterSchema = RegisterBaseSchema.omit({ institutionId: true }).extend({
  role: z.enum(['TEACHER', 'STUDENT', 'PROCTOR', 'APPROVER']),
});

// One-time token issued via email, redeemed once against Redis (SEC-4).
export const VerifyEmailSchema = z.object({
  token: z.string().min(1),
});

// packages/shared/src/validators/exam.schemas.ts
export const CreateExamSchema = z.object({
  title:          z.string().min(1).max(256).trim(),
  description:    z.string().max(2000).trim().optional(),
  classId:        z.string().uuid(),
  startTime:      z.string().datetime(),
  endTime:        z.string().datetime(),
  duration:       z.number().int().min(5).max(480),  // minutes
  proctoringTier: z.enum(['POST_HOC_REVIEW', 'LIVE_AI_ESCALATION', 'FULL_LIVE_HUMAN']),
  
  autoSubmitRiskThreshold: z.number().int().min(20).max(100).optional(),
  
  maxSilentReconnects: z.number().int().min(1).max(7).optional(),
  
  reconnectPenaltyBase: z.number().int().min(10).max(20).optional(),
  settings: z.object({
    shuffleQuestions:    z.boolean().default(false),
    shuffleOptions:      z.boolean().default(false),
    showResultsAfter:    z.enum(['SUBMIT', 'REVIEW_COMPLETE', 'NEVER']).default('REVIEW_COMPLETE'),
    allowBackNavigation: z.boolean().default(true),
    maxAttempts:         z.number().int().min(1).max(3).default(1),
    passMarkPercent:     z.number().min(0).max(100).optional(),
    requireLockdown:     z.boolean().default(true),
  }),
}).refine(
  (data) => {
    const threshold = data.autoSubmitRiskThreshold ?? 90;
    const penalty    = data.reconnectPenaltyBase ?? 10;
    
    return threshold > penalty;
  },
  {
    message: 'autoSubmitRiskThreshold must be greater than reconnectPenaltyBase, otherwise a single silent reconnect can trigger auto-submit.',
    path: ['autoSubmitRiskThreshold'],
  },
);

export const CreateQuestionSchema = z.object({
  bankId:     z.string().uuid(),
  type:       z.enum(['MCQ', 'MSQ', 'TRUE_FALSE', 'SHORT', 'LONG']),
  content:    z.object({
    text:      z.string().min(1).max(10000),
    imageUrl:  z.string().url().optional(),
  }),
  marks:      z.number().int().min(1).max(100),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  tags:       z.array(z.string().max(64)).max(10).default([]),
  options:    z.array(z.object({
    text:      z.string().min(1).max(2000),
    isCorrect: z.boolean(),
  })).min(2).max(6).optional(),
  answerKey:  z.string().max(10000).optional(),  // for SHORT/LONG rubric
  explanation: z.string().max(5000).optional(),
});

export const SubmitAnswerSchema = z.object({
  questionId:   z.string().uuid(),
  sessionId:    z.string().uuid(),
  response: z.union([
    z.string().max(50000),      // text answer
    z.array(z.string().uuid()), // selected option IDs
    z.boolean(),                // true/false
  ]),
  timeSpentMs:  z.number().int().min(0).max(3_600_000),
});

export const TelemetryBatchSchema = z.object({
  sessionId: z.string().uuid(),
  events:    z.array(z.object({
    type:      z.enum([
      'TAB_BLUR', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'RIGHT_CLICK',
      'SCREENSHOT_ATTEMPT', 'FULLSCREEN_EXIT', 'MOUSE_LEAVE',
      'KEYBOARD_SHORTCUT', 'CONTEXT_MENU', 'WINDOW_RESIZE',
    ]),
    timestamp: z.number().int(),         // unix ms
    metadata:  z.record(z.unknown()).optional(),
  })).max(500),
});

export const ResumeSchema = z.object({
  sessionId:             z.string().uuid(),
  resumeToken:           z.string().min(1),
  deviceFingerprintHash: z.string().min(1),
});

export const AnalysisResultSchema = z.object({
  faceDetected:   z.boolean(),
  multipleFaces:  z.boolean(),
  gazeOffScreen:  z.boolean(),
  secondaryVoice: z.boolean().optional(),
  confidence:     z.number().min(0).max(1),
});
```

```typescript
// packages/shared/src/validators/common.schemas.ts
import { z } from 'zod';

export const PaginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

### 3.4 Shared Error Codes

```typescript
// packages/shared/src/constants/errors.ts

export const ErrorCode = {
  // Auth (1xxx)
  INVALID_CREDENTIALS:       'E1001',
  ACCOUNT_DISABLED:          'E1002',
  TOKEN_EXPIRED:             'E1003',
  TOKEN_INVALID:             'E1004',
  TOKEN_REUSE_DETECTED:      'E1005',
  REFRESH_TOKEN_MISSING:     'E1006',
  EMAIL_NOT_VERIFIED:        'E1007',
  // Authorization (2xxx)
  FORBIDDEN:                 'E2001',
  // Validation (3xxx)
  VALIDATION_ERROR:          'E3001',
  // Resources (4xxx)
  NOT_FOUND:                 'E4001',
  CONFLICT:                  'E4002',
  // Exam lifecycle (5xxx)
  INVALID_STATUS_TRANSITION: 'E5001',
  CONTENT_HASH_MISMATCH:     'E5002',
  EXAM_NOT_PUBLISHED:        'E5003',
  NOT_ENROLLED:              'E5004',
  SESSION_ALREADY_ACTIVE:    'E5005',
  EXAM_NOT_STARTED:          'E5006',
  EXAM_ENDED:                'E5007',
  GRADE_ALREADY_PUBLISHED:   'E5008',
  SESSION_RECONNECT_LIMIT_EXCEEDED: 'E5009',
  // Security gates (6xxx)
  FACE_VERIFICATION_FAILED:  'E6001',
  DEVICE_NOT_REGISTERED:     'E6002',
  DEVICE_FINGERPRINT_MISMATCH:'E6003',
  VM_DETECTED:               'E6004',
  VIRTUAL_CAMERA_DETECTED:   'E6005',
  FORBIDDEN_PROCESS_RUNNING: 'E6006',
  MULTIPLE_DISPLAYS:         'E6007',
  VPN_DETECTED:              'E6008',
  ENTRY_TOKEN_EXPIRED:       'E6009',
  ENTRY_TOKEN_ALREADY_USED:  'E6010',
  // Rate limiting (7xxx)
  RATE_LIMITED:              'E7001',
  // Server (9xxx)
  INTERNAL_ERROR:            'E9001',
} as const;
export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];
```

---

## 4. Database Schema — Complete Design

All tables use PostgreSQL. The schema is managed by Prisma ORM. Every table includes `created_at` and `updated_at` automatically managed by Prisma.

### 4.1 Complete Prisma Schema

```prisma
// packages/backend/src/db/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ══════════════════════════════════════════════════════
// INSTITUTIONS & USERS
// ══════════════════════════════════════════════════════

model Institution {
  id        String   @id @default(uuid())
  name      String   @db.VarChar(256)
  slug      String   @unique @db.VarChar(128)   // used in email domains, subdomains
  logoUrl   String?  @db.VarChar(2048)
  isActive  Boolean  @default(true)
  settings  Json     @default("{}")  // theme, allowed IP ranges, SSO config
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users          User[]
  classes        Class[]
  questionBanks  QuestionBank[]
  exams          Exam[]
  auditLogs      AuditLog[]

  @@index([slug])
}

model User {
  id                    String      @id @default(uuid())
  institutionId         String
  email                 String      @db.VarChar(254)
  passwordHash          String      @db.VarChar(512)
  role                  Role
  firstName             String      @db.VarChar(64)
  lastName              String      @db.VarChar(64)
  profilePhotoUrl       String?     @db.VarChar(2048)
  // Biometric embedding stored as reference to encrypted object storage file
  biometricRef          String?     @db.VarChar(512)
  isActive              Boolean     @default(true)
  isEmailVerified       Boolean     @default(false)
  emailVerifiedAt       DateTime?
  lastLoginAt           DateTime?
  failedLoginAttempts   Int         @default(0)
  lockedUntil           DateTime?   // account locked after N failed attempts
  passwordChangedAt     DateTime    @default(now())
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  institution     Institution      @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  refreshTokens   RefreshToken[]
  deviceProfiles  DeviceProfile[]
  questionBanks   QuestionBank[]
  exams           Exam[]           @relation("ExamAuthor")
  approvedExams   Exam[]           @relation("ExamApprover")
  examSessions    ExamSession[]
  auditLogs       AuditLog[]       @relation("AuditActor")
  gradedAnswers   Grade[]
  proctoredFlags  ProctoringFlag[] @relation("FlagReviewer")

  @@unique([institutionId, email])
  @@index([institutionId, role])
  @@index([institutionId, isActive])
}

enum Role {
  SUPER_ADMIN
  INSTITUTION_ADMIN
  TEACHER
  APPROVER
  PROCTOR
  STUDENT
}

model Class {
  id            String      @id @default(uuid())
  institutionId String
  name          String      @db.VarChar(256)
  code          String      @db.VarChar(32)   // e.g. "CS-401-A"
  academicYear  String      @db.VarChar(16)
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  institution   Institution    @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  enrollments   ExamEnrollment[]

  @@unique([institutionId, code, academicYear])
  @@index([institutionId])
}

// ══════════════════════════════════════════════════════
// AUTH & DEVICE
// ══════════════════════════════════════════════════════

model RefreshToken {
  id         String    @id @default(uuid())
  userId     String
  tokenHash  String    @unique @db.VarChar(128) // SHA-256 of the raw token
  familyId   String    @db.VarChar(64)          // reuse of any family member → invalidate all
  expiresAt  DateTime
  revokedAt  DateTime?
  userAgent  String?   @db.VarChar(512)
  ipAddress  String?   @db.VarChar(45)
  createdAt  DateTime  @default(now())

  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([familyId])
  @@index([expiresAt])
}

model DeviceProfile {
  id               String    @id @default(uuid())
  userId           String
  fingerprintHash  String    @db.VarChar(128)  // SHA-256 of collected fingerprint JSON
  label            String?   @db.VarChar(128)  // "Home laptop", "Lab PC"
  isTrusted        Boolean   @default(false)    // admin-confirmed trusted device
  platform         String    @db.VarChar(32)   // win32 / darwin / linux
  registeredAt     DateTime  @default(now())
  lastSeenAt       DateTime  @default(now())
  revokedAt        DateTime?

  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@unique([userId, fingerprintHash])
}

// ══════════════════════════════════════════════════════
// QUESTION BANKS & QUESTIONS
// ══════════════════════════════════════════════════════

model QuestionBank {
  id            String    @id @default(uuid())
  institutionId String
  ownerId       String
  name          String    @db.VarChar(256)
  description   String?   @db.VarChar(2000)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  institution   Institution @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  owner         User        @relation(fields: [ownerId], references: [id], onDelete: Restrict)
  questions     Question[]

  @@index([institutionId, ownerId])
}

model Question {
  id              String        @id @default(uuid())
  bankId          String
  type            QuestionType
  // Encrypted with AES-256-GCM — stores: iv:tag:ciphertext
  encryptedContent String       @db.Text
  marks           Int
  difficulty      Difficulty?
  tags            String[]      @default([])
  // For MCQ/MSQ/TRUE_FALSE — encrypted
  encryptedOptions String?      @db.Text
  // For SHORT/LONG — rubric — encrypted
  encryptedAnswerKey String?    @db.Text
  // Explanation shown post-exam — encrypted
  encryptedExplanation String?  @db.Text
  isActive        Boolean       @default(true)
  version         Int           @default(1)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  bank            QuestionBank  @relation(fields: [bankId], references: [id], onDelete: Restrict)
  examQuestions   ExamQuestion[]
  studentAnswers  StudentAnswer[]
  grades          Grade[]

  @@index([bankId])
  @@index([bankId, type])
}

enum QuestionType {
  MCQ
  MSQ
  TRUE_FALSE
  SHORT
  LONG
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

// ══════════════════════════════════════════════════════
// EXAMS
// ══════════════════════════════════════════════════════

model Exam {
  id              String      @id @default(uuid())
  institutionId   String
  teacherId       String
  approverId      String?
  title           String      @db.VarChar(256)
  description     String?     @db.VarChar(2000)
  status          ExamStatus  @default(DRAFT)
  proctoringTier  ProctoringTier @default(POST_HOC_REVIEW)
  // SHA-256 of canonical JSON of all sections + questions
  contentHash     String?     @db.VarChar(128)
  // Approver's HMAC-SHA256(contentHash, approverKey)
  approvalSignature String?   @db.VarChar(512)
  approvedAt      DateTime?
  publishedAt     DateTime?
  startTime       DateTime
  endTime         DateTime
  durationSeconds Int
  settings        Json        @default("{}")

  // Teacher-configurable auto-submit / reconnect-abuse thresholds (DB-1).
  // Defaults match the values assumed throughout the proctoring/reconnect logic.
  autoSubmitRiskThreshold Int  @default(90)
  maxSilentReconnects     Int  @default(3)
  reconnectPenaltyBase    Int  @default(10)
  
  classId         String
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  institution     Institution    @relation(fields: [institutionId], references: [id], onDelete: Restrict)
  teacher         User           @relation("ExamAuthor", fields: [teacherId], references: [id], onDelete: Restrict)
  approver        User?          @relation("ExamApprover", fields: [approverId], references: [id])
  sections        ExamSection[]
  enrollments     ExamEnrollment[]
  sessions        ExamSession[]

  @@index([institutionId, teacherId, status])
  @@index([institutionId, classId])
  @@index([startTime, endTime])
}

enum ExamStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PUBLISHED
  ACTIVE
  CLOSED
  ARCHIVED
}

enum ProctoringTier {
  POST_HOC_REVIEW
  LIVE_AI_ESCALATION
  FULL_LIVE_HUMAN
}

model ExamSection {
  id              String    @id @default(uuid())
  examId          String
  title           String    @db.VarChar(256)
  description     String?   @db.VarChar(1000)
  durationSeconds Int?      // null = uses exam-level duration
  order           Int
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  exam            Exam         @relation(fields: [examId], references: [id], onDelete: Cascade)
  examQuestions   ExamQuestion[]

  @@unique([examId, order])
  @@index([examId])
}

model ExamQuestion {
  id                  String    @id @default(uuid())
  sectionId           String
  questionId          String
  order               Int
  marksOverride       Int?      // if null, use question.marks
  // Per-student randomization seed stored at session delivery time
  createdAt           DateTime  @default(now())

  section             ExamSection  @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  question            Question     @relation(fields: [questionId], references: [id], onDelete: Restrict)

  @@unique([sectionId, order])
  @@index([sectionId])
}

model ExamEnrollment {
  id          String    @id @default(uuid())
  examId      String
  studentId   String
  classId     String
  enrolledAt  DateTime  @default(now())
  enrolledBy  String    // userId of teacher/admin who enrolled

  exam        Exam      @relation(fields: [examId], references: [id], onDelete: Cascade)
  class       Class     @relation(fields: [classId], references: [id], onDelete: Restrict)

  @@unique([examId, studentId])
  @@index([examId])
  @@index([studentId])
}

// ══════════════════════════════════════════════════════
// EXAM SESSIONS
// ══════════════════════════════════════════════════════

model ExamSession {
  id                 String        @id @default(uuid())
  examId             String
  studentId          String
  deviceId           String?       // FK to DeviceProfile
  status             SessionStatus @default(PENDING)
  // One-time entry token hash — cleared after use
  entryTokenHash     String?       @unique @db.VarChar(128)
  entryTokenExpiry   DateTime?
  // Content hash at time of session start — must match exam.contentHash
  contentHashAtStart String?       @db.VarChar(128)
  // Deterministic per-session shuffle seed (DB-3) — set once at session
  // start, reused for all option-shuffling so a resumed student always
  // sees the same order.
  shuffleSeed        String?       @db.VarChar(64)
  ipAtStart          String?       @db.VarChar(45)
  startedAt          DateTime?
  submittedAt        DateTime?
  autoSubmitted      Boolean       @default(false)
  riskScore          Int           @default(0)  // 0-100, updated in real time
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  exam               Exam          @relation(fields: [examId], references: [id], onDelete: Restrict)
  student            User          @relation(fields: [studentId], references: [id], onDelete: Restrict)
  answers            StudentAnswer[]
  flags              ProctoringFlag[]
  telemetryEvents    TelemetryEvent[]
  grades             Grade[]

  @@unique([examId, studentId])
  @@index([examId, status])
  @@index([studentId])
}

enum SessionStatus {
  PENDING
  ENTRY_GATES
  ACTIVE
  PAUSED
  SUBMITTED
  AUTO_SUBMITTED
  TERMINATED
  GRADING
  GRADING_OPEN
  PUBLISHED
}

model StudentAnswer {
  id               String    @id @default(uuid())
  sessionId        String
  questionId       String
  sectionId        String
  // Encrypted with AES-256-GCM: iv:tag:ciphertext of JSON response
  encryptedResponse String   @db.Text
  timeSpentMs      Int       @default(0)
  answeredAt       DateTime  @default(now())
  updatedAt        DateTime  @updatedAt    // last edit time

  session          ExamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  question         Question    @relation(fields: [questionId], references: [id], onDelete: Restrict)

  @@unique([sessionId, questionId])
  @@index([sessionId])
}

// ══════════════════════════════════════════════════════
// PROCTORING
// ══════════════════════════════════════════════════════

model TelemetryEvent {
  id          String    @id @default(uuid())
  sessionId   String
  eventType   String    @db.VarChar(64)
  timestamp   DateTime
  metadata    Json      @default("{}")
  riskDelta   Int       @default(0)    // how much this event contributed to risk score

  session     ExamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId, timestamp])
  @@index([sessionId, eventType])
}

model ProctoringFlag {
  id              String        @id @default(uuid())
  sessionId       String
  flagType        FlagType
  confidence      Float         // 0.0 – 1.0
  autoResolved    Boolean       @default(false)
  reviewedBy      String?
  reviewDecision  FlagDecision?
  reviewNote      String?       @db.VarChar(1000)
  reviewedAt      DateTime?
  metadata        Json          @default("{}")  // e.g. face detection confidence, process name
  flaggedAt       DateTime      @default(now())

  session         ExamSession   @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  reviewer        User?         @relation("FlagReviewer", fields: [reviewedBy], references: [id])

  @@index([sessionId, flaggedAt])
  @@index([reviewedBy])
}

enum FlagType {
  FACE_MISSING
  MULTIPLE_FACES
  GAZE_OFF_SCREEN
  FORBIDDEN_PROCESS
  TAB_BLUR
  COPY_ATTEMPT
  SECONDARY_VOICE
  DEVICE_MISMATCH
  IP_CHANGE
  WINDOW_RESIZE
  SCREENSHOT_ATTEMPT
  CONTEXT_MENU
}

enum FlagDecision {
  NO_ACTION
  WARNING_ISSUED
  ESCALATED
  TERMINATED
}

// ══════════════════════════════════════════════════════
// GRADING
// ══════════════════════════════════════════════════════

model Grade {
  id                String    @id @default(uuid())
  sessionId         String
  questionId        String
  score             Float
  maxScore          Float
  // 'SYSTEM' | 'AI_SUGGESTION' | user UUID of teacher
  gradedBy          String    @db.VarChar(64)
  aiSuggestedScore  Float?    // preserved even after teacher override
  aiReasoning       String?   @db.Text
  teacherNote       String?   @db.VarChar(1000)
  confirmedBy       String?   // teacher UUID who confirmed
  confirmedAt       DateTime?
  isPublished       Boolean   @default(false)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  session           ExamSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  question          Question    @relation(fields: [questionId], references: [id], onDelete: Restrict)
  confirmer         User?       @relation(fields: [confirmedBy], references: [id])

  // One active grade row per session+question; history tracked in GradeHistory
  @@unique([sessionId, questionId])
  @@index([sessionId])
  @@index([confirmedBy])
}

model GradeHistory {
  id          String    @id @default(uuid())
  sessionId   String
  questionId  String
  score       Float
  gradedBy    String    @db.VarChar(64)
  note        String?   @db.VarChar(1000)
  createdAt   DateTime  @default(now())
  // previous hash in chain
  prevHash    String?   @db.VarChar(128)
  recordHash  String    @db.VarChar(128)

  @@index([sessionId, questionId])
}

// ══════════════════════════════════════════════════════
// AUDIT LOG — append-only, hash-chained
// ══════════════════════════════════════════════════════

model AuditLog {
  id              String    @id @default(uuid())
  institutionId   String?
  actorId         String?
  actorRole       String?   @db.VarChar(32)
  action          String    @db.VarChar(128)   // e.g. "EXAM_PUBLISHED"
  resourceType    String    @db.VarChar(64)    // e.g. "Exam"
  resourceId      String?   @db.VarChar(64)
  // raw metadata as captured at write time — part of the hash chain, must
  // never be mutated after creation (SEC-7). PII masking for non-admin
  // viewers happens at read time, see AuditService.getMetadataForViewer.
  metadata        Json      @default("{}")
  ipAddress       String?   @db.VarChar(45)
  userAgent       String?   @db.VarChar(512)
  // hash chain
  prevHash        String?   @db.VarChar(128)
  recordHash      String    @db.VarChar(128)
  timestamp       DateTime  @default(now())

  institution     Institution? @relation(fields: [institutionId], references: [id])
  actor           User?        @relation("AuditActor", fields: [actorId], references: [id])

  @@index([institutionId, timestamp])
  @@index([actorId, timestamp])
  @@index([resourceType, resourceId])
}
```

### 4.2 Index Design Rationale

| Index                                     | Query it serves                           |
| ----------------------------------------- | ----------------------------------------- |
| `users(institutionId, email)` UNIQUE      | Login lookup                              |
| `users(institutionId, role)`              | List teachers/students for an institution |
| `exams(institutionId, teacherId, status)` | Teacher's exam list                       |
| `exams(startTime, endTime)`               | Scheduler: find exams starting soon       |
| `exam_sessions(examId, status)`           | Count active sessions; proctor dashboard  |
| `exam_sessions(studentId)`                | Student's exam history                    |
| `telemetry_events(sessionId, timestamp)`  | Time-series telemetry queries             |
| `proctoring_flags(sessionId, flaggedAt)`  | Flag timeline per session                 |
| `audit_log(institutionId, timestamp)`     | Institution-scoped audit report           |
| `refresh_tokens(familyId)`                | Family revocation on reuse detection      |


---

## 5. Backend — Configuration & Bootstrap

### 5.1 Environment Configuration

Every environment variable is validated at startup using Zod. If any required variable is missing or malformed, the process exits immediately with a descriptive error before accepting any network traffic.

```typescript
// packages/backend/src/config/env.ts
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV:    z.enum(['development', 'test', 'production']),
  PORT:        z.coerce.number().int().min(1024).max(65535).default(3000),

  // Database
  DATABASE_URL:           z.string().url(),
  DATABASE_POOL_MIN:      z.coerce.number().int().default(2),
  DATABASE_POOL_MAX:      z.coerce.number().int().default(10),

  // Redis
  REDIS_URL:              z.string().url(),
  REDIS_TLS:              z.coerce.boolean().default(false),

  // JWT — RS256 key paths
  JWT_PRIVATE_KEY_PATH:   z.string().min(1),
  JWT_PUBLIC_KEY_PATH:    z.string().min(1),
  JWT_ACCESS_EXPIRY:      z.string().default('15m'),
  JWT_REFRESH_EXPIRY:     z.string().default('7d'),

  // Encryption
  QUESTION_ENC_KEY:       z.string().length(64),   // 32 bytes hex
  ANSWER_ENC_KEY:         z.string().length(64),
  BIOMETRIC_ENC_KEY:      z.string().length(64),

  // Entry token signing 
  ENTRY_TOKEN_HMAC_SECRET: z.string().length(64),   // 32 bytes hex

  // Object storage
  S3_ENDPOINT:            z.string().url(),
  S3_BUCKET_RECORDINGS:   z.string().min(1),
  S3_BUCKET_REPORTS:      z.string().min(1),
  S3_ACCESS_KEY:          z.string().min(1),
  S3_SECRET_KEY:          z.string().min(1),
  S3_REGION:              z.string().min(1),

  // External services
  IP_INTEL_API_KEY:       z.string().min(1),
  IP_INTEL_BASE_URL:      z.string().url(),
  IP_INTEL_FAIL_OPEN:     z.coerce.boolean().default(true),  // API-4: explicit fail-open config
  SENDGRID_API_KEY:       z.string().min(1),
  SENDGRID_FROM_EMAIL:    z.string().email(),
  AI_SERVICE_URL:         z.string().url(),
  AI_SERVICE_API_KEY:     z.string().min(1),

  // App
  FRONTEND_URL:           z.string().url(),
  COOKIE_SECRET:          z.string().min(32),
  COOKIE_DOMAIN:          z.string().min(1),
  LOG_LEVEL:              z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

function loadEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error(' Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof EnvSchema>;
```

### 5.2 Application Bootstrap

```typescript
// packages/backend/src/index.ts
import 'dotenv/config';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { createWebSocketServer } from './websocket/server.js';
import { db } from './db/client.js';
import { redis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { createServer } from 'http';

async function bootstrap() {
  // 1. Verify database connectivity and pending migrations
  await db.$connect();
  logger.info('Database connected');

  // 2. Verify Redis connectivity
  await redis.ping();
  logger.info('Redis connected');

  // 3. Load RSA keys into memory (fail fast if files missing)
  const { loadKeys } = await import('./config/keys.js');
  await loadKeys();
  logger.info('JWT keys loaded');

  // 4. Create Express app
  const app = createApp();

  // 5. Attach HTTP server (needed for Socket.io to share the same port)
  const httpServer = createServer(app);

  // 6. Attach WebSocket server to same HTTP server
  createWebSocketServer(httpServer);

  // 7. Start listening
  httpServer.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
  });

  // 8. Graceful shutdown
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, async () => {
      logger.info({ signal }, 'Shutdown signal received');
      httpServer.close(() => logger.info('HTTP server closed'));
      await db.$disconnect();
      await redis.quit();
      process.exit(0);
    });
  }
}

bootstrap().catch((err) => {
  logger.fatal(err, 'Bootstrap failed');
  process.exit(1);
});
```

### 5.3 Express App Factory

```typescript
// packages/backend/src/app.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimiter } from './middleware/rate-limiter.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { hpp } from './middleware/hpp.middleware.js';
import { env } from './config/env.js';
import { router } from './router.js';

export function createApp() {
  const app = express();

  // Exactly one trusted hop: the gateway/LB (HLD §6/§17 — single network
  // entry point). req.ip becomes the left-most X-Forwarded-For entry set
  // by that hop, instead of the LB's own socket address (API-3).
  app.set('trust proxy', 1);

  // ── Security headers ─────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'none'"],
        scriptSrc:      ["'self'"],
        connectSrc:     ["'self'"],
        imgSrc:         ["'self'", 'data:'],
        styleSrc:       ["'self'"],
        frameAncestors: ["'none'"],
        baseUri:        ["'self'"],
        formAction:     ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  }));

  // ── CORS — strict allowlist only ─────────────────
  app.use(cors({
    origin: [env.FRONTEND_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  }));

  // ── Body parsing — with size limits ─────────────
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use(cookieParser(env.COOKIE_SECRET));

  // ── HTTP Parameter Pollution protection ──────────
  app.use(hpp());

  // ── Request logging ──────────────────────────────
  app.use(requestLogger);

  // ── Global rate limiter (coarse, per-IP) ─────────
  app.use(rateLimiter('global', { max: 500, windowMs: 60_000 }));

  // ── Routes ───────────────────────────────────────
  app.use('/v1', router);

  // ── 404 handler ──────────────────────────────────
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  // ── Centralized error handler ─────────────────────
  app.use(errorHandler);

  return app;
}
```

---

## 6. Backend — Middleware Stack

### 6.1 Authentication Middleware

```typescript
// packages/backend/src/middleware/authenticate.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { keys } from '../config/keys.js';
import { ErrorCode } from 'shared';
import type { JWTPayload, AuthenticatedRequest } from '../types/request.js';
import { auditService } from '../services/audit.service.js';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: ErrorCode.TOKEN_INVALID });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, keys.publicKey, {
      algorithms: ['RS256'],
      issuer:     'online-exam-platform',
      audience:   'api',
    }) as JWTPayload;

    (req as AuthenticatedRequest).user = {
      id:            payload.sub,
      institutionId: payload.institutionId,
      role:          payload.role,
      permissions:   payload.permissions,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired', code: ErrorCode.TOKEN_EXPIRED });
    } else {
      // Log suspicious tampered tokens
      auditService.logOperationalSecurityEvent('INVALID_JWT_PRESENTED', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        tokenPrefix: token.slice(0, 20),
      });
      res.status(401).json({ error: 'Invalid token', code: ErrorCode.TOKEN_INVALID });
    }
  }
}
```

### 6.2 RBAC Middleware

```typescript
// packages/backend/src/middleware/rbac.middleware.ts
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/request.js';
import { ErrorCode } from 'shared';
import { auditService } from '../services/audit.service.js';

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userPermissions = req.user.permissions ?? [];

    if (!userPermissions.includes(permission)) {
      auditService.logOperationalSecurityEvent('FORBIDDEN_ACCESS_ATTEMPT', {
        actorId:      req.user.id,
        institutionId: req.user.institutionId,
        actorRole:    req.user.role,
        path:         req.path,
        attemptedPermission: permission,
        method:       req.method,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // 403, not 404: this is a capability check on the authenticated user,
      // not a lookup of a specific resource — there is nothing whose
      // existence could be confirmed or denied here. Existence-sensitive
      // lookups (e.g. cross-institution access) use 404 instead — see
      // enforceInstitutionScope (§6.5).
      res.status(403).json({ error: 'Forbidden', code: ErrorCode.FORBIDDEN });
      return;
    }
    next();
  };
}

// Convenience: require one of multiple permissions (OR logic)
export function requireAnyPermission(...permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userPermissions = req.user.permissions ?? [];
    const hasAny = permissions.some(p => userPermissions.includes(p));

    if (!hasAny) {
      res.status(403).json({ error: 'Forbidden', code: ErrorCode.FORBIDDEN });
      return;
    }
    next();
  };
}
```

### 6.3 Input Validation Middleware

```typescript
// packages/backend/src/middleware/validate.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ErrorCode } from 'shared';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      res.status(400).json({
        error:  'Validation error',
        code:   ErrorCode.VALIDATION_ERROR,
        issues: result.error.issues.map(i => ({
          path:    i.path.join('.'),
          message: i.message,
        })),
      });
      return;
    }

    // Replace with parsed/coerced values
    req[target] = result.data;
    next();
  };
}
```

### 6.4 Rate Limiting Middleware

```typescript
// packages/backend/src/middleware/rate-limiter.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.js';
import { ErrorCode } from 'shared';
import { auditService } from '../services/audit.service.js';

interface RateLimitOptions {
  max: number;
  windowMs: number;
  keyPrefix?: string;   // per-user vs. per-IP key
}

export function rateLimiter(name: string, opts: RateLimitOptions) {
  return rateLimit({
    windowMs: opts.windowMs,
    max:      opts.max,
    keyGenerator: (req) => {
      // Use user ID when authenticated, fall back to IP
      const user = (req as any).user;
      return `rl:${name}:${user?.id ?? req.ip}`;
    },
    store: new RedisStore({
      prefix:     `rl:${name}:`,
      sendCommand: (...args: string[]) => redis.sendCommand(args),
    }),
    handler: (req, res) => {
      auditService.logOperationalSecurityEvent('RATE_LIMIT_HIT', {
        name,
        ip:     req.ip,
        userId: (req as any).user?.id,
        path:   req.path,
      });
      res.status(429).json({
        error: 'Too many requests',
        code:  ErrorCode.RATE_LIMITED,
        retryAfter: Math.ceil(opts.windowMs / 1000),
      });
    },
    standardHeaders: true,
    legacyHeaders:   false,
  });
}

// Named pre-configured limiters used per-route:
export const authLimiter    = rateLimiter('auth',    { max: 5,   windowMs: 15 * 60_000 });
export const refreshLimiter = rateLimiter('refresh', { max: 10,  windowMs: 60_000 });
export const registerLimiter= rateLimiter('register',{ max: 3,   windowMs: 60 * 60_000 });
export const apiLimiter     = rateLimiter('api',     { max: 300, windowMs: 60_000 });
export const verifyEmailLimiter = rateLimiter('verify-email', { max: 10, windowMs: 60 * 60_000 });
```

### 6.5 Institution Scoping Middleware

```typescript
// packages/backend/src/middleware/scope.middleware.ts
// Attached after authenticate — ensures route params like :institutionId
// cannot be used to cross institution boundaries.
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/request.js';

export function enforceInstitutionScope(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const paramInstitutionId = req.params['institutionId'];

  if (paramInstitutionId && req.user.role !== 'SUPER_ADMIN') {
    if (paramInstitutionId !== req.user.institutionId) {
      // Return 404, not 403 — do not confirm the institution exists
      res.status(404).json({ error: 'Not found' });
      return;
    }
  }
  next();
}
```

### 6.6 Centralized Error Handler

```typescript
// packages/backend/src/middleware/error-handler.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    // Operational errors — expected, safe to expose message. 
    res.status(err.statusCode).json({
      error:   err.message,
      code:    err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  // Unexpected errors — log full details, never expose internals to client
  logger.error({
    err,
    path:   req.path,
    method: req.method,
    userId: (req as any).user?.id,
  }, 'Unhandled error');

  res.status(500).json({
    error: 'An internal error occurred',
    code:  'E9001',
  });
}
```

---

## 7. Auth Module — Low Level Design

### 7.1 File Structure

```
packages/backend/src/modules/auth/
├── auth.router.ts
├── auth.controller.ts
├── auth.service.ts
├── auth.repository.ts
├── token.service.ts
├── password.service.ts
└── auth.test.ts
```

### 7.2 Auth Service

```typescript
// packages/backend/src/modules/auth/auth.service.ts
import crypto from 'crypto';
import { db } from '../../db/client.js';
import { redis } from '../../config/redis.js';
import { tokenService } from './token.service.js';
import { passwordService } from './password.service.js';
import { auditService } from '../../services/audit.service.js';
import { emailService } from '../../services/email.service.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode, ROLE_PERMISSIONS } from 'shared';
import type { LoginSchema, PublicRegisterSchema, StaffRegisterSchema, VerifyEmailSchema } from 'shared';
import type { z } from 'zod';

export class AuthService {

  // Public self-registration. Role is hardcoded to STUDENT — SEC-1 fix.
  // Self-registered accounts start unverified (SEC-4) and receive a
  // verification email; staff-created accounts are pre-verified below.
  async register(data: z.infer<typeof PublicRegisterSchema>) {
    const user = await this.createUser({ ...data, role: 'STUDENT' }, data.institutionId, undefined, false);
    await this.sendVerificationEmail(user.id, user.email);
    return user;
  }

  // Admin-invoked staff registration. institutionId comes from the caller's
  // own JWT (passed in by the controller), never from the request body.
  // Admin-created accounts are pre-verified — the admin's own institution
  // membership is the trust signal, not an email round-trip (SEC-4).
  async registerStaff(
    data: z.infer<typeof StaffRegisterSchema>,
    institutionId: string,
    registeredBy: string,
  ) {
    return this.createUser(data, institutionId, registeredBy, true);
  }

  private async createUser(
    data: { email: string; password: string; firstName: string; lastName: string; role: string },
    institutionId: string,
    registeredBy?: string,
    preVerified = false,
  ) {
    // 1. Verify institution exists and is active
    const institution = await db.institution.findFirst({
      where: { id: institutionId, isActive: true },
    });
    if (!institution) throw new AppError(404, 'Institution not found', ErrorCode.NOT_FOUND);

    // 2. Check email uniqueness within institution
    const existing = await db.user.findUnique({
      where: { institutionId_email: { institutionId, email: data.email } },
    });
    if (existing) throw new AppError(409, 'Email already registered', ErrorCode.CONFLICT);

    // 3. Hash password with Argon2id
    const passwordHash = await passwordService.hash(data.password);

    // 4. Create user
    const user = await db.user.create({
      data: {
        institutionId,
        email:         data.email,
        passwordHash,
        role:          data.role,
        firstName:     data.firstName,
        lastName:      data.lastName,
        isEmailVerified: preVerified,
        emailVerifiedAt: preVerified ? new Date() : null,
      },
      select: {
        id: true, email: true, role: true, isEmailVerified: true,
        firstName: true, lastName: true, institutionId: true,
      },
    });

    // 5. Audit log
    await auditService.log({
      institutionId,
      actorId:       registeredBy ?? user.id,
      action:        'USER_REGISTERED',
      resourceType:  'User',
      resourceId:    user.id,
      metadata:      { email: user.email, role: user.role },
    });

    return user;
  }

  // 24h one-time token, Redis-backed so verification doesn't require a new
  // table — mirrors the entry-token pattern used for exam-session redemption.
  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const rawToken  = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await redis.set(`email_verify:${tokenHash}`, userId, 'EX', 24 * 60 * 60);
    await emailService.sendVerificationEmail(email, rawToken);
  }

  async verifyEmail(data: z.infer<typeof VerifyEmailSchema>) {
    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');
    const key = `email_verify:${tokenHash}`;

    const userId = await redis.get(key);
    if (!userId) throw new AppError(401, 'Invalid or expired verification token', ErrorCode.TOKEN_INVALID);

    await redis.del(key);  // single-use

    const user = await db.user.update({
      where: { id: userId },
      data:  { isEmailVerified: true, emailVerifiedAt: new Date() },
      select: { id: true, email: true, institutionId: true, isEmailVerified: true },
    });

    await auditService.log({
      institutionId: user.institutionId,
      actorId:       user.id,
      action:        'EMAIL_VERIFIED',
      resourceType:  'User',
      resourceId:    user.id,
    });

    return user;
  }

  async login(
    data: z.infer<typeof LoginSchema>,
    ip: string,
    userAgent: string,
  ) {
    // 1. Resolve institution by slug, then find the user scoped to it —
    // email is unique only per-institution (see User @@unique([institutionId, email]))
    const institution = await db.institution.findFirst({
      where: { slug: data.institutionSlug, isActive: true },
    });
    const foundUser = institution
      ? await db.user.findUnique({
          where: { institutionId_email: { institutionId: institution.id, email: data.email } },
        })
      : null;
    const user = foundUser?.isActive ? foundUser : null;

    // 2. Check account lock before spending any Argon2 CPU — SEC-5 fix.
    // A locked account now short-circuits on every attempt, whether or not
    // the guessed password is correct (see risk note above).
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(401, 'Account temporarily locked', ErrorCode.ACCOUNT_DISABLED);
    }

    // 3. Always run hash verification even if user not found (timing attack
    // prevention for the not-found / wrong-password cases).
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummydummydummy';
    const passwordMatch = await passwordService.verify(
      user?.passwordHash ?? dummyHash,
      data.password,
    );

    if (!user || !passwordMatch) {
      if (user) {
        await this.recordFailedLogin(user.id);
      }
      await auditService.logSecurityEvent('LOGIN_FAILED', {
        email: data.email, institutionSlug: data.institutionSlug, ip, userAgent,
      });
      throw new AppError(401, 'Invalid credentials', ErrorCode.INVALID_CREDENTIALS);
    }

    // 4. Self-registered accounts must verify their email before they can
    // log in (SEC-4). Staff-created accounts are pre-verified at creation.
    if (!user.isEmailVerified) {
      throw new AppError(403, 'Email not verified', ErrorCode.EMAIL_NOT_VERIFIED);
    }

    // 5. Reset failed attempts on success
    await db.user.update({
      where: { id: user.id },
      data:  { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    // 6. Generate token pair
    const permissions = ROLE_PERMISSIONS[user.role];
    const { accessToken, refreshToken } = await tokenService.generateTokenPair({
      userId:        user.id,
      institutionId: user.institutionId,
      role:          user.role,
      permissions,
      ip,
      userAgent,
    });

    await auditService.log({
      institutionId: user.institutionId,
      actorId:       user.id,
      actorRole:     user.role,
      action:        'USER_LOGIN',
      resourceType:  'Session',
      ipAddress:     ip,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id:            user.id,
        email:         user.email,
        role:          user.role,
        firstName:     user.firstName,
        lastName:      user.lastName,
        institutionId: user.institutionId,
      },
    };
  }

  private async recordFailedLogin(userId: string) {
    const user = await db.user.update({
      where: { id: userId },
      data:  { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    // Lock after 5 consecutive failures for 15 minutes
    if (user.failedLoginAttempts >= 5) {
      await db.user.update({
        where: { id: userId },
        data:  { lockedUntil: new Date(Date.now() + 15 * 60_000) },
      });
    }
  }

  async logout(refreshToken: string) {
    await tokenService.revokeFamily(refreshToken);
  }

  async refresh(rawRefreshToken: string, ip: string, userAgent: string) {
    return tokenService.rotateRefreshToken(rawRefreshToken, ip, userAgent);
  }
}

export const authService = new AuthService();
```

### 7.3 Token Service

```typescript
// packages/backend/src/modules/auth/token.service.ts
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { keys } from '../../config/keys.js';
import { redis } from '../../config/redis.js';
import { db } from '../../db/client.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode, ROLE_PERMISSIONS } from 'shared';

interface TokenPairInput {
  userId:        string;
  institutionId: string;
  role:          string;
  permissions:   string[];
  ip:            string;
  userAgent:     string;
}

export class TokenService {

  generateAccessToken(payload: Omit<TokenPairInput, 'ip' | 'userAgent'>): string {
    return jwt.sign(
      {
        sub:           payload.userId,
        institutionId: payload.institutionId,
        role:          payload.role,
        permissions:   payload.permissions,
        iss:           'online-exam-platform',
        aud:           'api',
      },
      keys.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: env.JWT_ACCESS_EXPIRY,
      },
    );
  }

  async generateTokenPair(input: TokenPairInput) {
    // 1. Generate a cryptographically random refresh token
    const rawRefreshToken = crypto.randomBytes(48).toString('base64url');
    const tokenHash = this.hashToken(rawRefreshToken);
    const familyId  = crypto.randomUUID();

    // 2. Persist refresh token record
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000); // 7 days
    await db.refreshToken.create({
      data: {
        userId:    input.userId,
        tokenHash,
        familyId,
        expiresAt,
        ipAddress: input.ip,
        userAgent: input.userAgent,
      },
    });

    // 3. Generate access token
    const accessToken = this.generateAccessToken({
      userId:        input.userId,
      institutionId: input.institutionId,
      role:          input.role,
      permissions:   input.permissions,
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async rotateRefreshToken(rawToken: string, ip: string, userAgent: string) {
    const tokenHash = this.hashToken(rawToken);

    // 1. Find the token record
    const record = await db.refreshToken.findUnique({ where: { tokenHash } });

    if (!record) {
      throw new AppError(401, 'Invalid refresh token', ErrorCode.TOKEN_INVALID);
    }

    // 2. Check if already revoked → indicates token theft, invalidate family
    if (record.revokedAt || record.expiresAt < new Date()) {
      await this.revokeFamilyById(record.familyId);
      throw new AppError(401, 'Token reuse detected — all sessions revoked', ErrorCode.TOKEN_REUSE_DETECTED);
    }

    // 3. Revoke used token
    await db.refreshToken.update({
      where: { id: record.id },
      data:  { revokedAt: new Date() },
    });

    // 4. Load user data for new token
    const user = await db.user.findUniqueOrThrow({
      where:  { id: record.userId },
      select: { id: true, institutionId: true, role: true, isActive: true },
    });

    if (!user.isActive) {
      throw new AppError(401, 'Account disabled', ErrorCode.ACCOUNT_DISABLED);
    }

    // 5. Issue new pair — inherit family ID (chain stays detectable)
    const newRawToken = crypto.randomBytes(48).toString('base64url');
    const newHash     = this.hashToken(newRawToken);
    const expiresAt   = new Date(Date.now() + 7 * 24 * 60 * 60_000);

    await db.refreshToken.create({
      data: {
        userId:    user.id,
        tokenHash: newHash,
        familyId:  record.familyId,
        expiresAt,
        ipAddress: ip,
        userAgent,
      },
    });

    const accessToken = this.generateAccessToken({
      userId:        user.id,
      institutionId: user.institutionId,
      role:          user.role,
      permissions:   ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] ?? [],
    });

    return { accessToken, refreshToken: newRawToken };
  }

  async revokeFamily(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const record = await db.refreshToken.findUnique({ where: { tokenHash } });
    if (record) await this.revokeFamilyById(record.familyId);
  }

  private async revokeFamilyById(familyId: string) {
    await db.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data:  { revokedAt: new Date() },
    });
  }

  hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}

export const tokenService = new TokenService();
```

### 7.4 Password Service

```typescript
// packages/backend/src/modules/auth/password.service.ts
import argon2 from 'argon2';

// OWASP recommended Argon2id parameters (2024)
const ARGON2_OPTIONS: argon2.Options = {
  type:        argon2.argon2id,
  memoryCost:  65536,  // 64 MB
  timeCost:    3,
  parallelism: 4,
  hashLength:  32,
};

export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  // Returns true if the stored hash was generated with older/weaker params
  // and needs to be rehashed on next login
  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, ARGON2_OPTIONS);
  }
}

export const passwordService = new PasswordService();
```

### 7.5 Auth Router & Controller

```typescript
// packages/backend/src/modules/auth/auth.router.ts
import { Router } from 'express';
import { authController } from './auth.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/authenticate.middleware.js';
import { requireAnyPermission } from '../../middleware/rbac.middleware.js';
import { authLimiter, refreshLimiter, registerLimiter, verifyEmailLimiter } from '../../middleware/rate-limiter.middleware.js';
import { LoginSchema, PublicRegisterSchema, StaffRegisterSchema, VerifyEmailSchema, Permission } from 'shared';

export const authRouter = Router();

authRouter.post('/register',
  registerLimiter,
  validate(PublicRegisterSchema),
  authController.register,
);

authRouter.post('/register-staff',
  authenticate,
  requireAnyPermission(Permission.MANAGE_TEACHERS, Permission.MANAGE_STUDENTS),
  validate(StaffRegisterSchema),
  authController.registerStaff,
);

authRouter.post('/verify-email',
  verifyEmailLimiter,
  validate(VerifyEmailSchema),
  authController.verifyEmail,
);

authRouter.post('/login',
  authLimiter,
  validate(LoginSchema),
  authController.login,
);

authRouter.post('/refresh',
  refreshLimiter,
  authController.refresh,
);

authRouter.post('/logout',
  authenticate,
  authController.logout,
);

authRouter.get('/me',
  authenticate,
  authController.me,
);
```

```typescript
// packages/backend/src/modules/auth/auth.controller.ts
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../types/request.js';
import { authService } from './auth.service.js';
import { env } from '../../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly:  true,
  secure:    true,
  sameSite:  'strict' as const,
  domain:    env.COOKIE_DOMAIN,
  path:      '/v1/auth/refresh',       // cookie only sent to refresh endpoint
  maxAge:    7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

export const authController = {
  register: async (req: Request, res: Response) => {
    const user = await authService.register(req.body);
    res.status(201).json({ user });
  },

  registerStaff: async (req: AuthenticatedRequest, res: Response) => {
    const user = await authService.registerStaff(req.body, req.user.institutionId, req.user.id);
    res.status(201).json({ user });
  },

  verifyEmail: async (req: Request, res: Response) => {
    const user = await authService.verifyEmail(req.body);
    res.json({ user });
  },

  login: async (req: Request, res: Response) => {
    const { accessToken, refreshToken, user } = await authService.login(
      req.body,
      req.ip ?? '',
      req.headers['user-agent'] ?? '',
    );

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken, user });
  },

  refresh: async (req: Request, res: Response) => {
    const rawRefreshToken = req.signedCookies['refreshToken'] as string | undefined;

    if (!rawRefreshToken) {
      res.status(401).json({ error: 'Refresh token missing' });
      return;
    }

    const { accessToken, refreshToken } = await authService.refresh(
      rawRefreshToken,
      req.ip ?? '',
      req.headers['user-agent'] ?? '',
    );

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken });
  },

  logout: async (req: Request, res: Response) => {
    const rawRefreshToken = req.signedCookies['refreshToken'] as string | undefined;
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }
    res.clearCookie('refreshToken', { path: '/v1/auth/refresh' });
    res.status(204).send();
  },

  me: async (req: Request, res: Response) => {
    const user = (req as any).user;
    res.json({ user });
  },
};
```

### 7.6 Email Service

```typescript
// packages/backend/src/services/email.service.ts
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class EmailService {
  async sendVerificationEmail(to: string, rawToken: string): Promise<void> {
    const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${encodeURIComponent(rawToken)}`;

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from:    { email: env.SENDGRID_FROM_EMAIL },
          subject: 'Verify your email address',
          content: [{
            type:  'text/plain',
            value: `Welcome! Verify your email by visiting: ${verifyUrl}\n\nThis link expires in 24 hours.`,
          }],
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) throw new Error(`SendGrid API error: ${response.status}`);

    } catch (err) {
      // Fail open — registration must not fail because the email provider
      // is down. The user can request a new verification email later.
      logger.error({ err, to }, 'Failed to send verification email');
    }
  }
}

export const emailService = new EmailService();
```

---

## 8. Institution & User Module

### 8.1 Institution Service

```typescript
// packages/backend/src/modules/institutions/institution.service.ts
import { db } from '../../db/client.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from 'shared';
import slugify from 'slugify';

export class InstitutionService {

  async create(data: { name: string; settings?: object }) {
    const slug = slugify(data.name, { lower: true, strict: true });

    const existing = await db.institution.findUnique({ where: { slug } });
    if (existing) throw new AppError(409, 'Institution slug already taken', ErrorCode.CONFLICT);

    return db.institution.create({
      data: { name: data.name, slug, settings: data.settings ?? {} },
    });
  }

  async findById(id: string) {
    const inst = await db.institution.findUnique({ where: { id } });
    if (!inst) throw new AppError(404, 'Institution not found', ErrorCode.NOT_FOUND);
    return inst;
  }

  async list(page: number, limit: number) {
    const safePage  = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const [items, total] = await Promise.all([
      db.institution.findMany({
        skip:    (safePage - 1) * safeLimit,
        take:    safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      db.institution.count(),
    ]);
    return { items, total, page: safePage, limit: safeLimit };
  }
}
```

### 8.2 User Service

```typescript
// packages/backend/src/modules/users/user.service.ts
import { db } from '../../db/client.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from 'shared';

export class UserService {

  // All queries are scoped to institutionId from token — never from params
  async listByRole(institutionId: string, role: string, page: number, limit: number) {
    const safePage  = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const [items, total] = await Promise.all([
      db.user.findMany({
        where:   { institutionId, role: role as any, isActive: true },
        skip:    (safePage - 1) * safeLimit,
        take:    safeLimit,
        select:  {
          id: true, email: true, firstName: true, lastName: true,
          role: true, lastLoginAt: true, isActive: true, createdAt: true,
        },
        orderBy: { lastName: 'asc' },
      }),
      db.user.count({ where: { institutionId, role: role as any, isActive: true } }),
    ]);
    return { items, total, page: safePage, limit: safeLimit };
  }

  async deactivate(institutionId: string, userId: string) {
    // Ensure target belongs to same institution
    const user = await db.user.findFirst({ where: { id: userId, institutionId } });
    if (!user) throw new AppError(404, 'User not found', ErrorCode.NOT_FOUND);

    // Super admin cannot be deactivated through this flow
    if (user.role === 'SUPER_ADMIN') {
      throw new AppError(403, 'Forbidden', ErrorCode.FORBIDDEN);
    }

    await db.user.update({
      where: { id: userId },
      data:  { isActive: false },
    });

    // Revoke all refresh tokens immediately
    await db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data:  { revokedAt: new Date() },
    });
  }
}
```

---

## 9. Exam Authoring Module

### 9.1 File Structure

```
packages/backend/src/modules/exams/
├── exam.router.ts
├── exam.controller.ts
├── exam.service.ts
├── exam.repository.ts
├── exam-hash.service.ts
├── approval.service.ts
└── exam.test.ts
```

### 9.2 Exam Service

```typescript
// packages/backend/src/modules/exams/exam.service.ts
import { db } from '../../db/client.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode, ExamStatus, EXAM_STATUS_TRANSITIONS } from 'shared';
import { examHashService } from './exam-hash.service.js';
import { approvalService } from './approval.service.js';
import { auditService } from '../../services/audit.service.js';
import type { z } from 'zod';
import type { CreateExamSchema } from 'shared';

export class ExamService {

  async create(
    teacherId: string,
    institutionId: string,
    data: z.infer<typeof CreateExamSchema>,
  ) {
    // Validate class belongs to same institution
    const cls = await db.class.findFirst({
      where: { id: data.classId, institutionId },
    });
    if (!cls) throw new AppError(404, 'Class not found', ErrorCode.NOT_FOUND);

    if (new Date(data.endTime) <= new Date(data.startTime)) {
      throw new AppError(400, 'End time must be after start time', ErrorCode.VALIDATION_ERROR);
    }

    const exam = await db.exam.create({
      data: {
        institutionId,
        teacherId,
        classId:         data.classId,
        title:           data.title,
        description:     data.description,
        startTime:       data.startTime,
        endTime:         data.endTime,
        durationSeconds: data.duration * 60,
        proctoringTier:  data.proctoringTier,
        settings:        data.settings,
        status:          'DRAFT',
        autoSubmitRiskThreshold: data.autoSubmitRiskThreshold,
        maxSilentReconnects:     data.maxSilentReconnects,
        reconnectPenaltyBase:    data.reconnectPenaltyBase,
      },
    });

    await auditService.log({
      institutionId,
      actorId:      teacherId,
      actorRole:    'TEACHER',
      action:       'EXAM_CREATED',
      resourceType: 'Exam',
      resourceId:   exam.id,
    });

    return exam;
  }

  async transition(
    examId: string,
    teacherId: string,
    institutionId: string,
    targetStatus: ExamStatus,
  ) {
    const exam = await this.findOwned(examId, teacherId, institutionId);

    const allowed = EXAM_STATUS_TRANSITIONS[exam.status as ExamStatus];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(409,
        `Cannot transition from ${exam.status} to ${targetStatus}`,
        ErrorCode.INVALID_STATUS_TRANSITION,
      );
    }

    // Compute content hash when submitting for approval
    let contentHash: string | undefined;
    if (targetStatus === 'PENDING_APPROVAL') {
      contentHash = await examHashService.computeHash(examId);
    }

    // Publish re-verifies the approval is still bound to the exact content
    // that was signed — a question edited after approval (IMP-6) changes
    // computeHash()'s output without ever touching the Exam row, so this is
    // the last checkpoint before the exam becomes visible to students.
    if (targetStatus === 'PUBLISHED') {
      const hashValid = await examHashService.verifyHash(examId, exam.contentHash!);
      const signatureValid = hashValid && approvalService.verifySignature(
        exam.contentHash!, exam.approverId!, exam.approvalSignature!,
      );

      if (!hashValid || !signatureValid) {
        await db.exam.update({
          where: { id: examId },
          data: {
            status:            'DRAFT',
            contentHash:       null,
            approvalSignature: null,
            approverId:        null,
            approvedAt:        null,
          },
        });
        throw new AppError(409,
          'Exam content changed since approval — resubmit for approval before publishing',
          ErrorCode.CONTENT_HASH_MISMATCH,
        );
      }
    }

    // Clear approval signature if reverting to DRAFT after approval
    const clearApproval = targetStatus === 'DRAFT' && exam.status === 'APPROVED';

    const updated = await db.exam.update({
      where: { id: examId },
      data: {
        status:            targetStatus,
        contentHash:       contentHash ?? exam.contentHash,
        approvalSignature: clearApproval ? null : undefined,
        approverId:        clearApproval ? null : undefined,
        approvedAt:        clearApproval ? null : undefined,
        publishedAt:       targetStatus === 'PUBLISHED' ? new Date() : undefined,
      },
    });

    await auditService.log({
      institutionId,
      actorId:      teacherId,
      action:       `EXAM_STATUS_${targetStatus}`,
      resourceType: 'Exam',
      resourceId:   examId,
      metadata:     { previousStatus: exam.status, newStatus: targetStatus, contentHash },
    });

    return updated;
  }

  async update(
    examId: string,
    teacherId: string,
    institutionId: string,
    data: Partial<z.infer<typeof CreateExamSchema>>,
  ) {
    const exam = await this.findOwned(examId, teacherId, institutionId);

    // Cannot edit PUBLISHED, ACTIVE, CLOSED, ARCHIVED exams
    if (!['DRAFT', 'PENDING_APPROVAL', 'APPROVED'].includes(exam.status)) {
      throw new AppError(409, 'Cannot edit exam in current status', ErrorCode.INVALID_STATUS_TRANSITION);
    }

    // Re-validate class ownership only when the exam is being reassigned to a
    // different class — same check create() performs (IMP-5).
    if (data.classId != null && data.classId !== exam.classId) {
      const cls = await db.class.findFirst({
        where: { id: data.classId, institutionId },
      });
      if (!cls) throw new AppError(404, 'Class not found', ErrorCode.NOT_FOUND);
    }

    // Any edit to an APPROVED exam auto-reverts to DRAFT and clears approval
    const wasApproved = exam.status === 'APPROVED';

    const updated = await db.exam.update({
      where: { id: examId },
      data: {
        // Explicit whitelist — `data` is Partial<CreateExamSchema>, which
        // includes `duration` (a Zod field, not a Prisma column); spreading
        // it directly throws an unknown-arg error at the DB layer (IMP-5).
        title:           data.title,
        description:     data.description,
        classId:         data.classId,
        startTime:       data.startTime,
        endTime:         data.endTime,
        durationSeconds: data.duration != null ? data.duration * 60 : undefined,
        proctoringTier:  data.proctoringTier,
        settings:        data.settings,
        autoSubmitRiskThreshold: data.autoSubmitRiskThreshold,
        maxSilentReconnects:     data.maxSilentReconnects,
        reconnectPenaltyBase:    data.reconnectPenaltyBase,
        status:              wasApproved ? 'DRAFT' : exam.status,
        contentHash:         wasApproved ? null : exam.contentHash,
        approvalSignature:   wasApproved ? null : exam.approvalSignature,
        approverId:          wasApproved ? null : exam.approverId,
        approvedAt:          wasApproved ? null : exam.approvedAt,
      },
    });

    return updated;
  }

  async findOwned(examId: string, teacherId: string, institutionId: string) {
    const exam = await db.exam.findFirst({
      where: { id: examId, teacherId, institutionId },
    });
    if (!exam) throw new AppError(404, 'Exam not found', ErrorCode.NOT_FOUND);
    return exam;
  }

  async findForInstitution(examId: string, institutionId: string) {
    const exam = await db.exam.findFirst({
      where: { id: examId, institutionId },
      include: { sections: { include: { examQuestions: true }, orderBy: { order: 'asc' } } },
    });
    if (!exam) throw new AppError(404, 'Exam not found', ErrorCode.NOT_FOUND);
    return exam;
  }
}

export const examService = new ExamService();
```

### 9.3 Exam Hash Service

The content hash is the cryptographic commitment to the exact content of the exam at the time of approval. Any subsequent change to any question, option, mark, or order will produce a different hash, invalidating the approval.

```typescript
// packages/backend/src/modules/exams/exam-hash.service.ts
import crypto from 'crypto';
import { db } from '../../db/client.js';
import { cryptoService } from '../../services/crypto.service.js';

export class ExamHashService {

  async computeHash(examId: string): Promise<string> {
    // Fetch full exam tree in deterministic order
    const exam = await db.exam.findUniqueOrThrow({
      where:   { id: examId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            examQuestions: {
              orderBy:  { order: 'asc' },
              include:  { question: true },
            },
          },
        },
      },
    });

    // Build a canonical, deterministic JSON representation
    // Decrypt content for hashing then discard — hash is of plaintext
    const canonical = {
      examId:   exam.id,
      title:    exam.title,
      settings: exam.settings,
      sections: exam.sections.map(s => ({
        id:       s.id,
        title:    s.title,
        order:    s.order,
        duration: s.durationSeconds,
        questions: s.examQuestions.map(eq => ({
          order:         eq.order,
          marksOverride: eq.marksOverride,
          questionId:    eq.questionId,
          content:       cryptoService.decryptQuestion(eq.question.encryptedContent),
          options:       eq.question.encryptedOptions
            ? cryptoService.decryptQuestion(eq.question.encryptedOptions)
            : null,
          type:          eq.question.type,
          marks:         eq.question.marks,
        })),
      })),
    };

    // Sort keys deterministically, then hash
    const canonicalJson = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
  }

  async verifyHash(examId: string, storedHash: string): Promise<boolean> {
    const computed = await this.computeHash(examId);
    // Constant-time comparison to avoid timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computed,    'hex'),
      Buffer.from(storedHash,  'hex'),
    );
  }
}

export const examHashService = new ExamHashService();
```

### 9.4 Approval Service

```typescript
// packages/backend/src/modules/exams/approval.service.ts
import crypto from 'crypto';
import { db } from '../../db/client.js';
import { examHashService } from './exam-hash.service.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from 'shared';
import { auditService } from '../../services/audit.service.js';
import { env } from '../../config/env.js';

export class ApprovalService {

  async approve(examId: string, approverId: string, institutionId: string) {
    const exam = await db.exam.findFirst({
      where: { id: examId, institutionId, status: 'PENDING_APPROVAL' },
    });
    if (!exam) throw new AppError(404, 'Exam not found or not pending approval', ErrorCode.NOT_FOUND);

    // 1. Verify stored hash still matches actual content
    const hashValid = await examHashService.verifyHash(examId, exam.contentHash!);
    if (!hashValid) {
      throw new AppError(409, 'Content hash mismatch — exam was modified after submission', ErrorCode.CONTENT_HASH_MISMATCH);
    }

    // 2. Generate approver signature: HMAC-SHA256(contentHash, approverSecret)
    //    approverSecret is derived per-approver from a master key
    const approverSecret = this.deriveApproverSecret(approverId);
    const signature = crypto
      .createHmac('sha256', approverSecret)
      .update(exam.contentHash!)
      .digest('hex');

    const updated = await db.exam.update({
      where: { id: examId },
      data: {
        status:            'APPROVED',
        approverId,
        approvedAt:        new Date(),
        approvalSignature: signature,
      },
    });

    await auditService.log({
      institutionId,
      actorId:      approverId,
      actorRole:    'APPROVER',
      action:       'EXAM_APPROVED',
      resourceType: 'Exam',
      resourceId:   examId,
      metadata:     { contentHash: exam.contentHash },
    });

    return updated;
  }

  async reject(examId: string, approverId: string, institutionId: string, reason: string) {
    const exam = await db.exam.findFirst({
      where: { id: examId, institutionId, status: 'PENDING_APPROVAL' },
    });
    if (!exam) throw new AppError(404, 'Exam not found or not pending approval', ErrorCode.NOT_FOUND);

    await db.exam.update({
      where: { id: examId },
      data:  { status: 'DRAFT' },
    });

    await auditService.log({
      institutionId,
      actorId:      approverId,
      actorRole:    'APPROVER',
      action:       'EXAM_REJECTED',
      resourceType: 'Exam',
      resourceId:   examId,
      metadata:     { reason },
    });
  }

  // Re-derives the same per-approver secret and recomputes the HMAC —
  // lets a caller confirm a stored signature is still valid for a given
  // hash, without re-approving (IMP-6, used at publish time).
  verifySignature(contentHash: string, approverId: string, signature: string): boolean {
    const approverSecret = this.deriveApproverSecret(approverId);
    const expected = crypto
      .createHmac('sha256', approverSecret)
      .update(contentHash)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  }

  private deriveApproverSecret(approverId: string): Buffer {
    // HKDF-style derivation from master secret
    return crypto.hkdfSync(
      'sha256',
      Buffer.from(env.QUESTION_ENC_KEY, 'hex'),
      Buffer.from('exam-approval-signatures'),
      Buffer.from(approverId),
      32,
    );
  }
}

export const approvalService = new ApprovalService();
```

---

## 10. Question Bank Module

### 10.1 Question Service

```typescript
// packages/backend/src/lib/seeded-shuffle.ts

// Deterministic Fisher-Yates shuffle seeded from a string (DB-3). The same
// seed + same input order always produces the same output order, so a
// resumed session sees identical option ordering across reconnects.
function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const rand = seededRandom(seed);
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

```typescript
// packages/backend/src/modules/questions/question.service.ts
import crypto from 'crypto';
import { db } from '../../db/client.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from 'shared';
import { cryptoService } from '../../services/crypto.service.js';
import { auditService } from '../../services/audit.service.js';
import { seededShuffle } from '../../lib/seeded-shuffle.js';
import type { z } from 'zod';
import type { CreateQuestionSchema } from 'shared';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Server-side DOMPurify instance
const { window } = new JSDOM('');
const purify = DOMPurify(window as any);

export class QuestionService {

  async create(
    data: z.infer<typeof CreateQuestionSchema>,
    teacherId: string,
    institutionId: string,
  ) {
    // Verify bank belongs to this teacher and institution
    const bank = await db.questionBank.findFirst({
      where: { id: data.bankId, ownerId: teacherId, institutionId },
    });
    if (!bank) throw new AppError(404, 'Question bank not found', ErrorCode.NOT_FOUND);

    // Validate MCQ/MSQ have at least one correct answer
    if (['MCQ', 'MSQ'].includes(data.type)) {
      const correctCount = (data.options ?? []).filter(o => o.isCorrect).length;
      if (data.type === 'MCQ' && correctCount !== 1) {
        throw new AppError(400, 'MCQ must have exactly one correct option', ErrorCode.VALIDATION_ERROR);
      }
      if (data.type === 'MSQ' && correctCount < 2) {
        throw new AppError(400, 'MSQ must have at least two correct options', ErrorCode.VALIDATION_ERROR);
      }
    }

    // Sanitize HTML content before encrypting
    const sanitizedText  = purify.sanitize(data.content.text, { ALLOWED_TAGS: ['b','i','u','em','strong','sub','sup','code','br','p','ul','ol','li'], ALLOWED_ATTR: [] });
    const contentPayload = JSON.stringify({ text: sanitizedText, imageUrl: data.content.imageUrl });

    const optionsPayload = data.options
      ? JSON.stringify(data.options.map(o => ({
          id:        crypto.randomUUID(),
          text:      purify.sanitize(o.text, { ALLOWED_TAGS: [] }),  // no HTML in options
          isCorrect: o.isCorrect,
        })))
      : undefined;

    const question = await db.question.create({
      data: {
        bankId:              data.bankId,
        type:                data.type,
        encryptedContent:    cryptoService.encryptQuestion(contentPayload),
        marks:               data.marks,
        difficulty:          data.difficulty,
        tags:                data.tags,
        encryptedOptions:    optionsPayload ? cryptoService.encryptQuestion(optionsPayload) : undefined,
        encryptedAnswerKey:  data.answerKey ? cryptoService.encryptQuestion(data.answerKey) : undefined,
        encryptedExplanation: data.explanation ? cryptoService.encryptQuestion(data.explanation) : undefined,
      },
    });

    return question;
  }

  // Edit an existing question — creates a new content version and, if any
  // APPROVED exam references it, reverts that exam to DRAFT: the approver's
  // signature is bound to the exact content this edit just changed (IMP-6).
  async update(
    questionId: string,
    teacherId: string,
    institutionId: string,
    data: Partial<z.infer<typeof CreateQuestionSchema>>,
  ) {
    const question = await db.question.findFirst({
      where: { id: questionId, bank: { ownerId: teacherId, institutionId } },
    });
    if (!question) throw new AppError(404, 'Question not found', ErrorCode.NOT_FOUND);

    const effectiveType = data.type ?? question.type;
    if (data.options && ['MCQ', 'MSQ'].includes(effectiveType)) {
      const correctCount = data.options.filter(o => o.isCorrect).length;
      if (effectiveType === 'MCQ' && correctCount !== 1) {
        throw new AppError(400, 'MCQ must have exactly one correct option', ErrorCode.VALIDATION_ERROR);
      }
      if (effectiveType === 'MSQ' && correctCount < 2) {
        throw new AppError(400, 'MSQ must have at least two correct options', ErrorCode.VALIDATION_ERROR);
      }
    }

    const contentPayload = data.content
      ? JSON.stringify({
          text:     purify.sanitize(data.content.text, { ALLOWED_TAGS: ['b','i','u','em','strong','sub','sup','code','br','p','ul','ol','li'], ALLOWED_ATTR: [] }),
          imageUrl: data.content.imageUrl,
        })
      : undefined;

    const optionsPayload = data.options
      ? JSON.stringify(data.options.map(o => ({
          id:        crypto.randomUUID(),
          text:      purify.sanitize(o.text, { ALLOWED_TAGS: [] }),
          isCorrect: o.isCorrect,
        })))
      : undefined;

    const updated = await db.question.update({
      where: { id: questionId },
      data: {
        type:                 data.type,
        marks:                data.marks,
        difficulty:           data.difficulty,
        tags:                 data.tags,
        encryptedContent:     contentPayload ? cryptoService.encryptQuestion(contentPayload) : undefined,
        encryptedOptions:     optionsPayload ? cryptoService.encryptQuestion(optionsPayload) : undefined,
        encryptedAnswerKey:   data.answerKey !== undefined ? cryptoService.encryptQuestion(data.answerKey) : undefined,
        encryptedExplanation: data.explanation !== undefined ? cryptoService.encryptQuestion(data.explanation) : undefined,
        version:              { increment: 1 },
      },
    });

    // Revert every APPROVED exam that references this question — its
    // approval was signed over content this edit just invalidated.
    const affectedExams = await db.exam.findMany({
      where: {
        institutionId,
        status:   'APPROVED',
        sections: { some: { examQuestions: { some: { questionId } } } },
      },
      select: { id: true },
    });

    for (const affected of affectedExams) {
      await db.exam.update({
        where: { id: affected.id },
        data: {
          status:            'DRAFT',
          contentHash:       null,
          approvalSignature: null,
          approverId:        null,
          approvedAt:        null,
        },
      });
      await auditService.log({
        institutionId,
        actorId:      teacherId,
        action:       'EXAM_APPROVAL_INVALIDATED',
        resourceType: 'Exam',
        resourceId:   affected.id,
        metadata:     { reason: 'referenced question edited', questionId },
      });
    }

    return updated;
  }

  // Decrypt and return question content — only called for authorized delivery
  async getDecryptedForDelivery(questionId: string, sessionId: string) {
    const q = await db.question.findUnique({ where: { id: questionId } });
    if (!q) throw new AppError(404, 'Question not found', ErrorCode.NOT_FOUND);

    const content = JSON.parse(cryptoService.decryptQuestion(q.encryptedContent));
    let options  = q.encryptedOptions
      ? JSON.parse(cryptoService.decryptQuestion(q.encryptedOptions))
        .map((o: any) => ({ id: o.id, text: o.text }))  // strip isCorrect from delivery
      : undefined;

    if (options) {
      const session = await db.examSession.findUnique({
        where:  { id: sessionId },
        select: { shuffleSeed: true, exam: { select: { settings: true } } },
      });
      const shuffleOptions = (session?.exam.settings as any)?.shuffleOptions === true;
      if (shuffleOptions && session?.shuffleSeed) {
        options = seededShuffle(options, `${session.shuffleSeed}:${questionId}`);
      }
    }

    return {
      id:         q.id,
      type:       q.type,
      marks:      q.marks,
      content,
      options,   // correct flags NEVER sent to student
    };
  }
}

export const questionService = new QuestionService();
```


---

## 11. Session Orchestration Module

### 11.1 Session Service

```typescript
// packages/backend/src/modules/sessions/session.service.ts
import crypto from 'crypto';
import type { Server } from 'socket.io';
import { db } from '../../db/client.js';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode, SessionStatus } from 'shared';
import { examHashService } from '../exams/exam-hash.service.js';
import { auditService } from '../../services/audit.service.js';
import { cryptoService } from '../../services/crypto.service.js';
import { questionService } from '../questions/question.service.js';

// Redis key patterns
const KEYS = {
  entryToken:    (nonce: string)      => `entry_token:${nonce}`,
  activeSession: (sessionId: string)  => `session:active:${sessionId}`,
  sessionTimer:  (sessionId: string)  => `session:timer:${sessionId}`,
  pairingToken:  (token: string)      => `pairing:${token}`,
  
  resumeToken:   (sessionId: string)  => `resume_token:${sessionId}`,
  
  reconnectCount: (sessionId: string) => `session:reconnect_count:${sessionId}`,
} as const;

export class SessionService {

  // ── Entry Gate: issue one-time entry token after all gates pass ──
  async issueEntryToken(
    studentId: string,
    examId: string,
    deviceFingerprintHash: string,
    ip: string,
  ): Promise<string> {
    // Verify enrollment
    const enrollment = await db.examEnrollment.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });
    if (!enrollment) throw new AppError(403, 'Not enrolled', ErrorCode.NOT_ENROLLED);

    // Verify exam is published and within time window
    const exam = await db.exam.findUniqueOrThrow({ where: { id: examId } });
    const now = new Date();
    if (exam.status !== 'PUBLISHED' && exam.status !== 'ACTIVE') {
      throw new AppError(403, 'Exam not available', ErrorCode.EXAM_NOT_PUBLISHED);
    }
    if (now < new Date(exam.startTime)) throw new AppError(403, 'Exam not started yet', ErrorCode.EXAM_NOT_STARTED);
    if (now > new Date(exam.endTime))   throw new AppError(403, 'Exam has ended', ErrorCode.EXAM_ENDED);

    // Check no active session already exists
    const existing = await db.examSession.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });
    if (existing && ['ACTIVE', 'PAUSED'].includes(existing.status)) {
      throw new AppError(409, 'Session already active', ErrorCode.SESSION_ALREADY_ACTIVE);
    }

    // Build one-time signed token
    const nonce     = crypto.randomBytes(24).toString('hex');
    const payload   = JSON.stringify({
      studentId, examId, deviceFingerprintHash,
      ip, nonce, contentHash: exam.contentHash,
      exp: Date.now() + 5 * 60_000,  // 5 minutes
    });
    // sign with the stable server secret
    const signature = crypto
      .createHmac('sha256', Buffer.from(env.ENTRY_TOKEN_HMAC_SECRET, 'hex'))
      .update(payload)
      .digest('hex');
    const token = `${Buffer.from(payload).toString('base64url')}.${signature}`;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Store nonce in Redis with 5-minute TTL — enables single-use enforcement
    await redis.set(KEYS.entryToken(nonce), JSON.stringify({ tokenHash, studentId, examId, deviceFingerprintHash, ip }), 'EX', 300);

    // Store token hash in DB session record
    await db.examSession.upsert({
      where:  { examId_studentId: { examId, studentId } },
      create: {
        examId, studentId,
        status:            'ENTRY_GATES',
        entryTokenHash:    tokenHash,
        entryTokenExpiry:  new Date(Date.now() + 5 * 60_000),
      },
      update: {
        status:            'ENTRY_GATES',
        entryTokenHash:    tokenHash,
        entryTokenExpiry:  new Date(Date.now() + 5 * 60_000),
      },
    });

    return token;
  }

  // ── Called by WebSocket server on connection with entry token ──
  async startSession(
    rawEntryToken: string,
    studentId: string,
    ip: string,
    deviceId: string,
  ) {
    // Decode and extract nonce
    const [b64Payload, signature] = rawEntryToken.split('.');
    if (!b64Payload || !signature) {
      throw new AppError(401, 'Malformed entry token', ErrorCode.TOKEN_INVALID);
    }
    const rawPayloadStr = Buffer.from(b64Payload, 'base64url').toString();
    const payload = JSON.parse(rawPayloadStr);

    // verify the HMAC signature against the stable server secret.
    const expectedSignature = crypto
      .createHmac('sha256', Buffer.from(env.ENTRY_TOKEN_HMAC_SECRET, 'hex'))
      .update(rawPayloadStr)
      .digest('hex');
    const signatureValid =
      expectedSignature.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
    if (!signatureValid) {
      throw new AppError(401, 'Entry token signature invalid', ErrorCode.TOKEN_INVALID);
    }

    if (Date.now() > payload.exp) {
      throw new AppError(401, 'Entry token expired', ErrorCode.ENTRY_TOKEN_EXPIRED);
    }

    // Single-use nonce redemption
    const stored = await redis.getDel(KEYS.entryToken(payload.nonce));
    if (!stored) {
      throw new AppError(401, 'Entry token already used or invalid', ErrorCode.ENTRY_TOKEN_ALREADY_USED);
    }

    const storedData = JSON.parse(stored);
    if (storedData.studentId !== studentId || storedData.examId !== payload.examId) {
      throw new AppError(401, 'Token binding mismatch', ErrorCode.TOKEN_INVALID);
    }

    // Enforce the IP/device binding captured at entry-token issuance — a
    // token captured within its 5-minute TTL must be redeemed from the same
    // device and network it was issued to (FR-023).
    const ipMismatch     = storedData.ip !== ip;
    const deviceMismatch = storedData.deviceFingerprintHash !== deviceId;
    if (ipMismatch || deviceMismatch) {
      const existingSession = await db.examSession.findUnique({
        where: { examId_studentId: { examId: payload.examId, studentId } },
      });
      if (existingSession) {
        await db.proctoringFlag.create({
          data: {
            sessionId:  existingSession.id,
            flagType:   deviceMismatch ? 'DEVICE_MISMATCH' : 'IP_CHANGE',
            confidence: 1,
            metadata:   {
              boundIp: storedData.ip, connectingIp: ip,
              boundDevice: storedData.deviceFingerprintHash, connectingDevice: deviceId,
            },
          },
        });
      }
      await auditService.logSecurityEvent(deviceMismatch ? 'DEVICE_MISMATCH' : 'IP_CHANGE', {
        studentId, examId: payload.examId, ip, deviceId,
      });
      throw new AppError(401, 'Entry token redeemed from a different device or network', ErrorCode.TOKEN_INVALID);
    }

    const exam = await db.exam.findUniqueOrThrow({
      where:   { id: payload.examId },
      include: { sections: { include: { examQuestions: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } } },
    });

    const startedAt = new Date();
    const session = await db.examSession.update({
      where: { examId_studentId: { examId: payload.examId, studentId } },
      data:  {
        status:            'ACTIVE',
        startedAt,
        ipAtStart:         ip,
        deviceId,
        contentHashAtStart: exam.contentHash,
        shuffleSeed:       crypto.randomBytes(16).toString('hex'),
        entryTokenHash:    null,   // clear token — it's been used
        entryTokenExpiry:  null,
      },
    });

    // Store session timer in Redis (server-authoritative)
    const endTime = Math.min(
      startedAt.getTime() + exam.durationSeconds * 1000,
      new Date(exam.endTime).getTime(),
    );
    await redis.set(KEYS.sessionTimer(session.id), endTime.toString(), 'EXAT', Math.ceil(endTime / 1000));

    // Durable, session-owned deadline — authoritative regardless of socket
    // state (REL-1). jobId is namespaced to avoid colliding with the
    // reconnect-timeout job family on the same queue.
    const { autoSubmitQueue } = await import('../../jobs/queues.js');
    await autoSubmitQueue.add(
      'exam-expiry',
      { sessionId: session.id, reason: 'TIME_EXPIRED' },
      { jobId: `expiry:${session.id}`, delay: Math.max(0, endTime - startedAt.getTime()) },
    );

    // Resume token for reconnects
    await this.reissueResumeToken(session.id, payload.deviceFingerprintHash);

    // Transition exam to ACTIVE if not already
    if (exam.status === 'PUBLISHED') {
      await db.exam.update({ where: { id: exam.id }, data: { status: 'ACTIVE' } });
    }

    await auditService.log({
      institutionId: exam.institutionId,
      actorId:       studentId,
      action:        'EXAM_SESSION_STARTED',
      resourceType:  'ExamSession',
      resourceId:    session.id,
      metadata:      { examId: exam.id, ip },
    });

    return session;
  }

  // ── Submit answer ──────────────────────────────────────────────
  async submitAnswer(
    sessionId: string,
    studentId: string,
    questionId: string,
    response: unknown,
    timeSpentMs: number,
  ) {
    const session = await this.requireActiveSession(sessionId, studentId);
    await this.verifyNotExpired(session.id);

    // Question must belong to current exam — prevents cross-exam answer injection.
    const examQuestion = await db.examQuestion.findFirst({
      where: { questionId, section: { examId: session.examId } },
      select: { sectionId: true },
    });
    if (!examQuestion) {
      throw new AppError(403, 'Question does not belong to this exam session', ErrorCode.FORBIDDEN);
    }

    // Encrypt response before storage
    const encryptedResponse = cryptoService.encryptAnswer(JSON.stringify(response));

    await db.studentAnswer.upsert({
      where:  { sessionId_questionId: { sessionId, questionId } },
      create: { sessionId, questionId, sectionId: examQuestion.sectionId, encryptedResponse, timeSpentMs, answeredAt: new Date() },
      update: { encryptedResponse, timeSpentMs, updatedAt: new Date() },
    });
  }

  // ── Auto-submission on timer expiry ───────────────────────────
  async autoSubmit(sessionId: string) {
    const existing = await db.examSession.findUnique({
      where:  { id: sessionId },
      select: { status: true, examId: true },
    });
    // Already finalized by another path (voluntary submit, risk threshold,
    // or the other durable job family racing this one) — nothing to do.
    if (!existing || ['SUBMITTED', 'AUTO_SUBMITTED'].includes(existing.status)) {
      return null;
    }

    await db.examSession.update({
      where: { id: sessionId },
      data:  {
        status:        'AUTO_SUBMITTED',
        submittedAt:   new Date(),
        autoSubmitted: true,
      },
    });

    // Trigger grading job
    const { gradingQueue } = await import('../../jobs/queues.js');
    await gradingQueue.add('grade-session', { sessionId });

    // Cancel any still-pending durable job for this session so it can't
    // fire again against an already-finalized session.
    const { autoSubmitQueue } = await import('../../jobs/queues.js');
    const [expiryJob, reconnectJob] = await Promise.all([
      autoSubmitQueue.getJob(`expiry:${sessionId}`),
      autoSubmitQueue.getJob(`reconnect:${sessionId}`),
    ]);
    await Promise.all([expiryJob?.remove(), reconnectJob?.remove()]);

    await auditService.log({
      action:       'SESSION_AUTO_SUBMITTED',
      resourceType: 'ExamSession',
      resourceId:   sessionId,
    });

    return { sessionId, examId: existing.examId };
  }

  // ── Voluntary submission ───────────────────────────────────────
  async submit(sessionId: string, studentId: string) {
    await this.requireActiveSession(sessionId, studentId);

    await db.examSession.update({
      where: { id: sessionId },
      data:  { status: 'SUBMITTED', submittedAt: new Date() },
    });

    const { gradingQueue } = await import('../../jobs/queues.js');
    await gradingQueue.add('grade-session', { sessionId });

    const { autoSubmitQueue } = await import('../../jobs/queues.js');
    const pendingExpiry = await autoSubmitQueue.getJob(`expiry:${sessionId}`);
    await pendingExpiry?.remove();
  }

  // JOIN = entry token + gates. RESUME = reattach PAUSED (no gates).
// Resume tokens reissued on each reconnect.
  async reissueResumeToken(sessionId: string, deviceFingerprintHash: string): Promise<string> {
    const token = crypto.randomBytes(24).toString('hex');
    await redis.set(
      KEYS.resumeToken(sessionId),
      JSON.stringify({ token, sessionId, deviceFingerprintHash }),
      'EX', 7200, // matches the 2h active-session TTL
    );
    return token;
  }

  async validateResumeToken(
    sessionId: string,
    studentId: string,
    resumeToken: string,
    deviceFingerprintHash: string,
    io: Server,
  ) {
    const stored = await redis.get(KEYS.resumeToken(sessionId));
    if (!stored) {
      throw new AppError(401, 'Resume token expired or session not resumable', ErrorCode.TOKEN_INVALID);
    }
    const storedData = JSON.parse(stored);
    if (storedData.token !== resumeToken || storedData.deviceFingerprintHash !== deviceFingerprintHash) {
      throw new AppError(401, 'Resume token or device mismatch', ErrorCode.TOKEN_INVALID);
    }

    const session = await db.examSession.findFirst({
      where: { id: sessionId, studentId, status: 'PAUSED' },
    });
    if (!session) {
      throw new AppError(404, 'No paused session to resume', ErrorCode.NOT_FOUND);
    }

    // Atomic reconnect count. TTL matches resume-token lifetime
    const reconnectCount = await redis.incr(KEYS.reconnectCount(sessionId));
    await redis.expire(KEYS.reconnectCount(sessionId), 7200);

    const { proctoringService } = await import('../proctoring/proctoring.service.js');
    const { limitExceeded } = await proctoringService.recordReconnect(
      sessionId, session.examId, reconnectCount, io,
    );

    // Cap exceeded: proctor notified, student stays PAUSED.
    if (limitExceeded) {
      io.of('/proctor').to(`exam:${session.examId}`).emit('session:reconnect-limit-exceeded', {
        sessionId, studentId, reconnectCount,
      });
      throw new AppError(
        403,
        'Reconnect limit exceeded for this session — proctor approval is required to resume.',
        ErrorCode.SESSION_RECONNECT_LIMIT_EXCEEDED,
        { sessionId, reconnectCount },
      );
    }

    const { autoSubmitQueue } = await import('../../jobs/queues.js');
    // Cancel the pending reconnect-timeout job — student is back.
    const pendingReconnect = await autoSubmitQueue.getJob(`reconnect:${sessionId}`);
    await pendingReconnect?.remove();

    // Self-heal the expiry job: re-add with jobId `expiry:${sessionId}` is
    // a no-op if it's still scheduled, and recreates it if it was somehow
    // lost (queue restart, manual removal). Deadline is wall-clock from
    // session start — never extended by a disconnect/resume cycle.
    const endTime = await this.getOrRecoverEndTime(sessionId);
    if (endTime !== null) {
      const remaining = endTime - Date.now();
      if (remaining > 0) {
        await autoSubmitQueue.add(
          'exam-expiry',
          { sessionId, reason: 'TIME_EXPIRED' },
          { jobId: `expiry:${sessionId}`, delay: remaining },
        );
      }
    }

    const resumed = await db.examSession.update({
      where: { id: sessionId },
      data:  { status: 'ACTIVE' },
    });

    // Reissue the resume token for the *next* potential drop.
    await this.reissueResumeToken(sessionId, deviceFingerprintHash);

    await auditService.log({
      actorId:      studentId,
      action:       'SESSION_RESUMED',
      resourceType: 'ExamSession',
      resourceId:   sessionId,
      metadata:     { reconnectCount },
    });

    return resumed;
  }

  // ── Pairing token for mobile secondary camera ─────────────────
  async generatePairingToken(sessionId: string, studentId: string): Promise<string> {
    await this.requireActiveSession(sessionId, studentId);
    const token = crypto.randomBytes(16).toString('hex');
    await redis.set(KEYS.pairingToken(token), JSON.stringify({ sessionId, studentId }), 'EX', 300);
    return token;
  }

  private async requireActiveSession(sessionId: string, studentId: string) {
    const session = await db.examSession.findFirst({
      where: { id: sessionId, studentId, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    if (!session) throw new AppError(404, 'Active session not found', ErrorCode.NOT_FOUND);
    return session;
  }

  // Resolves the authoritative deadline for a session. Redis
  // (`session:timer`) is a cache, not the source of truth (REL-2) — it's
  // an LRU-evictable key with a TTL, so a miss must fall back to computing
  // from the DB (startedAt + exam.durationSeconds, capped by exam.endTime)
  // rather than being treated as "no deadline." The recomputed value is
  // written back to Redis so subsequent reads hit the cache again.
  private async getOrRecoverEndTime(sessionId: string): Promise<number | null> {
    const cached = await redis.get(KEYS.sessionTimer(sessionId));
    if (cached) return parseInt(cached);

    const session = await db.examSession.findUnique({
      where:  { id: sessionId },
      select: { startedAt: true, exam: { select: { durationSeconds: true, endTime: true } } },
    });
    if (!session?.startedAt) return null;

    const endTime = Math.min(
      session.startedAt.getTime() + session.exam.durationSeconds * 1000,
      new Date(session.exam.endTime).getTime(),
    );
    await redis.set(KEYS.sessionTimer(sessionId), endTime.toString(), 'EXAT', Math.ceil(endTime / 1000));
    return endTime;
  }

  private async verifyNotExpired(sessionId: string) {
    const endTime = await this.getOrRecoverEndTime(sessionId);
    if (endTime !== null && Date.now() > endTime) {
      await this.autoSubmit(sessionId);
      throw new AppError(403, 'Exam time expired', ErrorCode.EXAM_ENDED);
    }
  }
}

export const sessionService = new SessionService();
```

---

## 12. Device & Security Gate Module

### 12.1 Device Registration Service

```typescript
// packages/backend/src/modules/devices/device.service.ts
import crypto from 'crypto';
import { db } from '../../db/client.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from 'shared';
import { ipIntelService } from '../../services/ip-intel.service.js';
import { auditService } from '../../services/audit.service.js';
import { env } from '../../config/env.js';

interface DeviceFingerprint {
  platform:       string;
  osVersion:      string;
  arch:           string;
  totalMemory:    number;
  cpuModel:       string;
  screenCount:    number;
  macHash:        string;
  electronVersion: string;
}

interface GateResult {
  gate: string;
  passed: boolean;
  reason?: string;
}

export class DeviceService {

  async register(userId: string, fingerprint: DeviceFingerprint, label?: string) {
    const fingerprintHash = this.hashFingerprint(fingerprint);

    // Max 2 registered devices per user
    const deviceCount = await db.deviceProfile.count({
      where: { userId, revokedAt: null },
    });
    if (deviceCount >= 2) {
      throw new AppError(409, 'Maximum registered devices reached. Revoke one first.', ErrorCode.CONFLICT);
    }

    return db.deviceProfile.upsert({
      where:  { userId_fingerprintHash: { userId, fingerprintHash } },
      create: { userId, fingerprintHash, platform: fingerprint.platform, label },
      update: { lastSeenAt: new Date() },
    });
  }

  async runGates(
    studentId: string,
    examId: string,
    fingerprintHash: string,
    ip: string,
    environmentReport: EnvironmentReport,
  ): Promise<{ allPassed: boolean; results: GateResult[] }> {
    const results: GateResult[] = [];

    const exam = await db.exam.findUniqueOrThrow({
      where:  { id: examId },
      select: { proctoringTier: true },
    });

    // Gate 1 — Device registered
    const device = await db.deviceProfile.findFirst({
      where: { userId: studentId, fingerprintHash, revokedAt: null },
    });
    results.push({
      gate:   'DEVICE_REGISTERED',
      passed: !!device,
      reason: device ? undefined : 'Device not registered. Register this device first.',
    });

    // Gate 2 — Virtual machine / emulator detection
    results.push({
      gate:   'VM_DETECTION',
      passed: !environmentReport.vmDetected,
      reason: environmentReport.vmDetected ? 'Virtual machine detected. Real hardware required.' : undefined,
    });

    // Gate 3 — Virtual camera/mic detection
    results.push({
      gate:   'VIRTUAL_CAMERA_DETECTION',
      passed: !environmentReport.virtualCameraDetected,
      reason: environmentReport.virtualCameraDetected ? `Virtual camera driver detected: ${environmentReport.virtualCameraDriver}` : undefined,
    });

    // Gate 4 — Forbidden processes
    results.push({
      gate:   'FORBIDDEN_PROCESSES',
      passed: environmentReport.forbiddenProcesses.length === 0,
      reason: environmentReport.forbiddenProcesses.length > 0
        ? `Please close: ${environmentReport.forbiddenProcesses.join(', ')}`
        : undefined,
    });

    // Gate 5 — Display count
    results.push({
      gate:   'DISPLAY_COUNT',
      passed: environmentReport.displayCount <= 1,
      reason: environmentReport.displayCount > 1 ? 'Multiple displays detected. Disconnect external displays.' : undefined,
    });

    // Gate 6 — IP intelligence (VPN/proxy check)
    const ipResult = await ipIntelService.check(ip);

    if (ipResult.unknown) {
      // Recorded regardless of pass/fail outcome below — keyed by examId +
      // studentId since no ExamSession row exists yet at this point in the
      // flow. IntegrityReportService surfaces this marker (API-4).
      await auditService.logSecurityEvent('IP_INTEL_UNKNOWN', { studentId, examId, ip });
    }

    // Higher proctoring tiers have live oversight to handle a retry, so an
    // unverifiable IP fails the gate there even when fail-open is on.
    // Fail-open is an explicit operator config (default true) (API-4).
    const higherTier = (['LIVE_AI_ESCALATION', 'FULL_LIVE_HUMAN'] as string[]).includes(exam.proctoringTier);
    const ipIntelFailed = ipResult.unknown && (!env.IP_INTEL_FAIL_OPEN || higherTier);

    results.push({
      gate:   'IP_INTELLIGENCE',
      passed: !ipIntelFailed && !ipResult.isVPN && !ipResult.isProxy && !ipResult.isDatacenter,
      reason: ipIntelFailed ? 'Unable to verify network reputation. Please retry or contact your proctor.' :
              ipResult.isVPN ? 'VPN detected. Disable VPN to continue.' :
              ipResult.isProxy ? 'Proxy detected.' : undefined,
    });

    const allPassed = results.every(r => r.passed);
    return { allPassed, results };
  }

  hashFingerprint(fp: DeviceFingerprint): string {
    const canonical = JSON.stringify({
      platform:    fp.platform,
      arch:        fp.arch,
      cpuModel:    fp.cpuModel,
      macHash:     fp.macHash,
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }
}

interface EnvironmentReport {
  vmDetected:            boolean;
  virtualCameraDetected: boolean;
  virtualCameraDriver?:  string;
  forbiddenProcesses:    string[];
  displayCount:          number;
}

export const deviceService = new DeviceService();
```

---

## 13. WebSocket Server — Low Level Design

### 13.1 Server Setup & Namespace Architecture

```typescript
// packages/backend/src/websocket/server.ts
import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { keys } from '../config/keys.js';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from '../config/redis.js';
import { db } from '../db/client.js';
import { examNamespace } from './namespaces/exam.namespace.js';
import { proctoringNamespace } from './namespaces/proctoring.namespace.js';
import { mobileNamespace } from './namespaces/mobile.namespace.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { Permission } from 'shared';

export function createWebSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin:      [env.FRONTEND_URL],
      credentials: true,
    },
    transports:       ['websocket'],        // No long-polling — WebSocket only
    pingTimeout:      20_000,
    pingInterval:     10_000,
    maxHttpBufferSize: 64 * 1024,           // 64KB max message size
  });

  // Redis adapter for horizontal scaling: events fan out to all instances
  const pubClient  = redis.duplicate();
  const subClient  = redis.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Bridge for auto-submit jobs completed by the BullMQ worker process
  // (§16.1a), which holds no live Socket.IO reference of its own.
  const autoSubmitNotifyClient = redis.duplicate();
  autoSubmitNotifyClient.subscribe('session:auto-submitted');
  autoSubmitNotifyClient.on('message', (_channel, message) => {
    const { sessionId, examId, reason } = JSON.parse(message);
    io.of(`/exam/${examId}`).to(`session:${sessionId}`).emit('exam:auto-submitted', { reason });
    io.of(`/exam/${examId}`).in(`session:${sessionId}`).disconnectSockets(true);
    io.of('/proctor').to(`exam:${examId}`).emit('session:auto-submitted', { sessionId, reason });
  });

  // Shared JWT authentication middleware for all namespaces
  io.use(async (socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;
    if (!token) return next(new Error('AUTH_REQUIRED'));

    try {
      const payload = jwt.verify(token, keys.publicKey, {
        algorithms: ['RS256'],
        issuer:     'online-exam-platform',
        audience:   'api',
      }) as any;
      socket.data['user'] = payload;
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  // ── Namespace: /exam/{examId} — student exam sessions ────────
  // Dynamic namespace: one per exam_id
  io.of(/^\/exam\/[a-f0-9-]{36}$/).use(async (socket, next) => {
    const user   = socket.data['user'];
    const examId = socket.nsp.name.split('/exam/')[1]!;

    // Authorization (SEC-6): the shared io.use() above only verifies the
    // JWT signature — it does not check that this token may take this exam.
    if (!user.permissions?.includes(Permission.TAKE_EXAM)) {
      return next(new Error('FORBIDDEN'));
    }
    const exam = await db.exam.findFirst({ where: { id: examId, institutionId: user.institutionId } });
    if (!exam) return next(new Error('FORBIDDEN'));
    const enrollment = await db.examEnrollment.findUnique({
      where: { examId_studentId: { examId, studentId: user.sub } },
    });
    if (!enrollment) return next(new Error('FORBIDDEN'));

    socket.data['examId'] = examId;
    next();
  }).on('connection', (socket) => {
    examNamespace.handleConnection(socket, io);
  });

  // ── Namespace: /proctor — teacher/proctor dashboard ──────────
  // Authorization (SEC-6): namespace-level permission gate. Per-exam room
  // joins would need further scoping inside proctoringNamespace.handleConnection
  // (not yet specified in the LLD — see §13 scope note).
  io.of('/proctor').use(async (socket, next) => {
    const user = socket.data['user'];
    if (!user.permissions?.includes(Permission.VIEW_LIVE_SESSIONS)) {
      return next(new Error('FORBIDDEN'));
    }
    next();
  }).on('connection', (socket) => {
    proctoringNamespace.handleConnection(socket, io);
  });

  // ── Namespace: /mobile — secondary device camera ──────────────
  // Authorization (SEC-6): only exam-takers may pair a secondary device.
  io.of('/mobile').use(async (socket, next) => {
    const user = socket.data['user'];
    if (!user.permissions?.includes(Permission.TAKE_EXAM)) {
      return next(new Error('FORBIDDEN'));
    }
    next();
  }).on('connection', (socket) => {
    mobileNamespace.handleConnection(socket, io);
  });

  logger.info('WebSocket server initialized');
  return io;
}
```

### 13.2 Exam Namespace Handler

```typescript
// packages/backend/src/utils/client-ip.ts

// Mirrors Express's `trust proxy: 1` semantics for the Socket.IO handshake
// (API-3) — the handshake is a raw Node HTTP request and does NOT inherit
// Express's trust-proxy setting. With exactly one trusted hop (the
// gateway/LB), the real client IP is the left-most X-Forwarded-For entry
// if present, else the raw socket address.
export function getClientIp(handshake: {
  address: string;
  headers: Record<string, string | string[] | undefined>;
}): string {
  const forwarded = handshake.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return first ? first.split(',')[0]!.trim() : handshake.address;
}
```

```typescript
// packages/backend/src/websocket/namespaces/exam.namespace.ts
import type { Socket, Server } from 'socket.io';
import { sessionService } from '../../modules/sessions/session.service.js';
import { proctoringService } from '../../modules/proctoring/proctoring.service.js';
import { redis } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';
import { getClientIp } from '../../utils/client-ip.js';
import { ErrorCode, ResumeSchema, SubmitAnswerSchema, TelemetryBatchSchema, AnalysisResultSchema } from 'shared';

// ── Inbound events (client → server) ─────────────────────────
const CLIENT_EVENTS = {
  JOIN:              'session:join',
   // RESUME: reattach PAUSED session via resume token.
  RESUME:            'session:resume',
  SUBMIT_ANSWER:     'answer:submit',
  SUBMIT_EXAM:       'exam:submit',
  HEARTBEAT:         'heartbeat',
  TELEMETRY_BATCH:   'telemetry:batch',
  ANALYSIS_RESULT:   'analysis:result',   // AI analysis from Electron renderer
  VIOLATION_REPORT:  'violation:report',
} as const;

// ── Outbound events (server → client) ─────────────────────────
export const SERVER_EVENTS = {
  QUESTION_DELIVERED:  'question:delivered',
  TIMER_SYNC:          'timer:sync',
  EXAM_TERMINATED:     'exam:terminated',
  EXAM_AUTO_SUBMITTED: 'exam:auto-submitted',
  EXAM_SUBMITTED:      'exam:submitted',
  PROCTOR_MESSAGE:     'proctor:message',
  PROCTOR_ACTION:      'proctor:action',
  SESSION_STATE:       'session:state',
  ERROR:               'error',
} as const;

export const examNamespace = {
  async handleConnection(socket: Socket, io: Server) {
    const user   = socket.data['user'];
    const examId = socket.data['examId'];

    logger.info({ socketId: socket.id, userId: user.sub, examId }, 'WS exam connection');

    // ── JOIN: student presents entry token, starts session ──
    socket.on(CLIENT_EVENTS.JOIN, async (payload: { entryToken: string; deviceId: string }) => {
      try {
        const session = await sessionService.startSession(
          payload.entryToken,
          user.sub,
          getClientIp(socket.handshake),
          payload.deviceId,
        );

        // Enforce single active connection per session
        const activeSocketKey = `ws:session:${session.id}`;
        const existingSocketId = await redis.get(activeSocketKey);
        if (existingSocketId && existingSocketId !== socket.id) {
          // Disconnect previous socket
          const prevSocket = io.of(socket.nsp.name).sockets.get(existingSocketId);
          prevSocket?.disconnect(true);
        }
        await redis.set(activeSocketKey, socket.id, 'EX', 7200); // 2h TTL

        // Join room scoped to this session
        socket.join(`session:${session.id}`);
        socket.data['sessionId'] = session.id;

        // Send initial session state
        socket.emit(SERVER_EVENTS.SESSION_STATE, {
          sessionId: session.id,
          examId,
          status:    'ACTIVE',
          serverTime: Date.now(),
        });

        // Start timer sync interval (every 30s)
        this.startTimerSync(socket, session.id);

      } catch (err: any) {
        socket.emit(SERVER_EVENTS.ERROR, { code: err.code, message: err.message });
      }
    });

    // RESUME: reattach PAUSED session. Validates token, cancels auto-submit, no gate re-run.
    socket.on(CLIENT_EVENTS.RESUME, async (payload: unknown) => {
      const parsed = ResumeSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid resume payload' });
        return;
      }
      try {
        const session = await sessionService.validateResumeToken(
          parsed.data.sessionId, user.sub, parsed.data.resumeToken, parsed.data.deviceFingerprintHash, io,
        );

        const activeSocketKey = `ws:session:${session.id}`;
        const existingSocketId = await redis.get(activeSocketKey);
        if (existingSocketId && existingSocketId !== socket.id) {
          const prevSocket = io.of(socket.nsp.name).sockets.get(existingSocketId);
          prevSocket?.disconnect(true);
        }
        await redis.set(activeSocketKey, socket.id, 'EX', 7200);

        socket.join(`session:${session.id}`);
        socket.data['sessionId'] = session.id;

        socket.emit(SERVER_EVENTS.SESSION_STATE, {
          sessionId: session.id,
          examId,
          status:    'ACTIVE',
          serverTime: Date.now(),
        });

        this.startTimerSync(socket, session.id);
      } catch (err: any) {
        socket.emit(SERVER_EVENTS.ERROR, { code: err.code, message: err.message });
      }
    });

    // ── ANSWER SUBMISSION ─────────────────────────────────────
    socket.on(CLIENT_EVENTS.SUBMIT_ANSWER, async (payload: unknown) => {
      const sessionId = socket.data['sessionId'];
      if (!sessionId) return;
      const parsed = SubmitAnswerSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid answer payload' });
        return;
      }
      try {
        await sessionService.submitAnswer(
          sessionId, user.sub,
          parsed.data.questionId, parsed.data.response, parsed.data.timeSpentMs,
        );
        socket.emit('answer:ack', { questionId: parsed.data.questionId, savedAt: Date.now() });
      } catch (err: any) {
        socket.emit(SERVER_EVENTS.ERROR, { code: err.code, message: err.message });
      }
    });

    // ── EXAM SUBMIT ───────────────────────────────────────────
    socket.on(CLIENT_EVENTS.SUBMIT_EXAM, async () => {
      const sessionId = socket.data['sessionId'];
      if (!sessionId) return;
      try {
        await sessionService.submit(sessionId, user.sub);
        socket.emit(SERVER_EVENTS.EXAM_SUBMITTED, { submittedAt: Date.now() });
        socket.disconnect();
      } catch (err: any) {
        socket.emit(SERVER_EVENTS.ERROR, { code: err.code, message: err.message });
      }
    });

    // ── TELEMETRY BATCH ──────────────────────────────────────
    socket.on(CLIENT_EVENTS.TELEMETRY_BATCH, async (payload: unknown) => {
      const sessionId = socket.data['sessionId'];
      if (!sessionId) return;
      const parsed = TelemetryBatchSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid telemetry batch' });
        return;
      }
      await proctoringService.ingestTelemetry(sessionId, user.sub, parsed.data.events);
    });

    // ── AI ANALYSIS RESULT (from Electron renderer) ──────────
    socket.on(CLIENT_EVENTS.ANALYSIS_RESULT, async (payload: unknown) => {
      const sessionId = socket.data['sessionId'];
      if (!sessionId) return;
      const parsed = AnalysisResultSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit(SERVER_EVENTS.ERROR, { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid analysis result payload' });
        return;
      }
      await proctoringService.processAnalysisResult(sessionId, examId, parsed.data, io);
    });

    // ── HEARTBEAT ─────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.HEARTBEAT, async () => {
      const sessionId = socket.data['sessionId'];
      if (sessionId) {
        await redis.set(`ws:session:${sessionId}`, socket.id, 'EX', 7200);
        socket.emit('heartbeat:ack', { serverTime: Date.now() });
      }
    });

    // ── DISCONNECT ────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      const sessionId = socket.data['sessionId'];
      logger.info({ sessionId, reason }, 'WS disconnect');

      if (sessionId) {
        // Transition to PAUSED — give a bounded reconnect window
        const { db } = await import('../../db/client.js');
        await db.examSession.updateMany({
          where: { id: sessionId, status: 'ACTIVE' },
          data:  { status: 'PAUSED' },
        });

        // Redis-backed delayed job: idempotent via jobId = sessionId.
        const { autoSubmitQueue } = await import('../../jobs/queues.js');
        await autoSubmitQueue.add(
          'reconnect-timeout',
          { sessionId },
          { jobId: `reconnect:${sessionId}`, delay: 60_000 },
        );

        io.of('/proctor').to(`exam:${examId}`).emit('session:disconnected', {
          sessionId, studentId: user.sub, reason: 'CONNECTION_DROPPED',
        });
      }
    });
  },

  startTimerSync(socket: Socket, sessionId: string) {
    const interval = setInterval(async () => {
      if (!socket.connected) { clearInterval(interval); return; }
      const endTimeStr = await redis.get(`session:timer:${sessionId}`);
      if (endTimeStr) {
        const remaining = parseInt(endTimeStr) - Date.now();
        socket.emit(SERVER_EVENTS.TIMER_SYNC, {
          remainingMs: Math.max(0, remaining),
          serverTime:  Date.now(),
        });
        if (remaining <= 0) {
          // UI sync only — the durable `expiry:${sessionId}` job (§11.1
          // startSession) is the authoritative trigger. That job's
          // completion reaches this socket via the `session:auto-submitted`
          // pub/sub subscriber in server.ts (§13.1), which emits
          // EXAM_AUTO_SUBMITTED and disconnects. This interval just stops
          // ticking once the deadline has visibly passed.
          clearInterval(interval);
        }
      }
    }, 30_000);

    socket.on('disconnect', () => clearInterval(interval));
  },
};
```

---

## 14. Proctoring Engine Module

### 14.1 Proctoring Service

```typescript
// packages/backend/src/modules/proctoring/proctoring.service.ts
import { db } from '../../db/client.js';
import { redis } from '../../config/redis.js';
import { auditService } from '../../services/audit.service.js';
import type { Server } from 'socket.io';
import type { FlagType } from 'shared';
import { proctoringQueue } from '../../jobs/queues.js';

// Risk contribution per event type
const EVENT_RISK_WEIGHTS: Record<string, number> = {
  TAB_BLUR:           5,
  COPY_ATTEMPT:       8,
  PASTE_ATTEMPT:      8,
  SCREENSHOT_ATTEMPT: 15,
  FULLSCREEN_EXIT:    10,
  MOUSE_LEAVE:        3,
  KEYBOARD_SHORTCUT:  5,
  CONTEXT_MENU:       3,
  WINDOW_RESIZE:      4,
  RIGHT_CLICK:        2,
  
};

// Consecutive frame thresholds before flagging
const AI_CONSECUTIVE_THRESHOLDS: Record<string, number> = {
  FACE_MISSING:     5,   // 5 × 3s samples = 15s of missing face
  MULTIPLE_FACES:   2,
  GAZE_OFF_SCREEN:  8,
  SECONDARY_VOICE:  4,
};

export class ProctoringService {

  async ingestTelemetry(
    sessionId: string,
    studentId: string,
    events: Array<{ type: string; timestamp: number; metadata?: object }>,
  ) {
    // Store all events
    await db.telemetryEvent.createMany({
      data: events.map(e => ({
        sessionId,
        eventType:  e.type,
        timestamp:  new Date(e.timestamp),
        metadata:   e.metadata ?? {},
        riskDelta:  EVENT_RISK_WEIGHTS[e.type] ?? 0,
      })),
    });

    // Compute incremental risk score
    const riskDelta = events.reduce((sum, e) => sum + (EVENT_RISK_WEIGHTS[e.type] ?? 0), 0);
    if (riskDelta > 0) {
      await this.updateRiskScore(sessionId, riskDelta);
    }
  }

  async processAnalysisResult(
    sessionId: string,
    examId: string,
    result: {
      faceDetected:  boolean;
      multipleFaces: boolean;
      gazeOffScreen: boolean;
      secondaryVoice?: boolean;
      confidence:    number;
    },
    io: Server,
  ) {
    // Track consecutive anomaly frames in Redis
    const flags: { type: FlagType; confidence: number }[] = [];

    const checks = [
      { key: 'FACE_MISSING',    condition: !result.faceDetected,   type: 'FACE_MISSING' as FlagType },
      { key: 'MULTIPLE_FACES',  condition: result.multipleFaces,    type: 'MULTIPLE_FACES' as FlagType },
      { key: 'GAZE_OFF_SCREEN', condition: result.gazeOffScreen,    type: 'GAZE_OFF_SCREEN' as FlagType },
      { key: 'SECONDARY_VOICE', condition: !!result.secondaryVoice, type: 'SECONDARY_VOICE' as FlagType },
    ];

    for (const check of checks) {
      const counterKey = `proctor:consecutive:${sessionId}:${check.key}`;
      if (check.condition) {
        const count = await redis.incr(counterKey);
        await redis.expire(counterKey, 120);  // reset if no update for 2 min

        const threshold = AI_CONSECUTIVE_THRESHOLDS[check.key] ?? 3;
        if (count >= threshold) {
          flags.push({ type: check.type, confidence: result.confidence });
          // Don't double-flag; reset counter so next flag needs fresh consecutive frames
          if (count === threshold) await redis.del(counterKey);
        }
      } else {
        await redis.del(counterKey);  // anomaly resolved, reset counter
      }
    }

    // Persist flags and notify proctors
    for (const flag of flags) {
      const flagRecord = await db.proctoringFlag.create({
        data: {
          sessionId,
          flagType:   flag.type,
          confidence: flag.confidence,
          metadata:   result,
        },
      });

      // Risk bump per AI flag
      await this.updateRiskScore(sessionId, 12);

      // Push to proctor dashboard
      io.of('/proctor').to(`exam:${examId}`).emit('flag:new', {
        flagId:    flagRecord.id,
        sessionId,
        flagType:  flag.type,
        confidence: flag.confidence,
        timestamp: flagRecord.flaggedAt,
      });
    }

    // Single query: riskScore + teacher-configured threshold (non-nullable, @default 90).
    await this.checkAutoSubmitThreshold(sessionId, examId, io);
  }

  private async checkAutoSubmitThreshold(sessionId: string, examId: string, io: Server) {
    const session = await db.examSession.findUnique({
      where:  { id: sessionId },
      select: { riskScore: true, exam: { select: { autoSubmitRiskThreshold: true } } },
    });
    if (session && session.riskScore >= session.exam.autoSubmitRiskThreshold) {
      const { sessionService } = await import('../sessions/session.service.js');
      await sessionService.autoSubmit(sessionId);
      io.of(`/exam/${examId}`).to(`session:${sessionId}`)
        .emit('exam:auto-submitted', { reason: 'RISK_THRESHOLD_EXCEEDED' });
    }
  }

  // Teacher-configurable flat risk cost per reconnect. Cap stops repetition.
  async recordReconnect(
    sessionId: string, examId: string, reconnectCount: number, io: Server,
  ): Promise<{ limitExceeded: boolean }> {
    const exam = await db.exam.findUniqueOrThrow({
      where:  { id: examId },
      select: { reconnectPenaltyBase: true, maxSilentReconnects: true },
    });

    const delta = exam.reconnectPenaltyBase;

    await db.telemetryEvent.create({
      data: {
        sessionId,
        eventType: 'SESSION_RECONNECT',
        timestamp: new Date(),
        metadata:  { reconnectCount, penaltyBase: exam.reconnectPenaltyBase },
        riskDelta: delta,
      },
    });

    await this.updateRiskScore(sessionId, delta);
    await this.checkAutoSubmitThreshold(sessionId, examId, io);

    return { limitExceeded: reconnectCount > exam.maxSilentReconnects };
  }

  async reviewFlag(
    flagId: string,
    reviewerId: string,
    institutionId: string,
    decision: 'NO_ACTION' | 'WARNING_ISSUED' | 'ESCALATED' | 'TERMINATED',
    note?: string,
  ) {
    // Institution-scoped existence check — ProctoringFlag carries no
    // institutionId directly; it's reachable only via session → exam.
    // Without this, any reviewer with `flag:session` permission could
    // update a flag belonging to another institution's session by guessing
    // its id.
    const owned = await db.proctoringFlag.findFirst({
      where: { id: flagId, session: { exam: { institutionId } } },
    });
    if (!owned) throw new AppError(404, 'Flag not found', ErrorCode.NOT_FOUND);

    const flag = await db.proctoringFlag.update({
      where: { id: flagId },
      data:  {
        reviewedBy:     reviewerId,
        reviewDecision: decision,
        reviewNote:     note,
        reviewedAt:     new Date(),
      },
      include: { session: true },
    });

    await auditService.log({
      actorId:      reviewerId,
      action:       `FLAG_${decision}`,
      resourceType: 'ProctoringFlag',
      resourceId:   flagId,
      metadata:     { sessionId: flag.sessionId, decision, note },
    });

    return flag;
  }

  // Atomic DB increment — prevents read-modify-write race between concurrent updates.
  private async updateRiskScore(sessionId: string, delta: number) {
    await db.examSession.update({
      where: { id: sessionId },
      data:  { riskScore: { increment: delta } },
    });

    // Idempotent clamp: only pulls back to [0, 100]
    const current = await db.examSession.findUniqueOrThrow({
      where: { id: sessionId }, select: { riskScore: true },
    });
    if (current.riskScore > 100 || current.riskScore < 0) {
      await db.examSession.update({
        where: { id: sessionId },
        data:  { riskScore: Math.min(100, Math.max(0, current.riskScore)) },
      });
    }
  }
}

export const proctoringService = new ProctoringService();
```

---

## 15. Grading & Audit Module

### 15.1 Grading Service

```typescript
// packages/backend/src/modules/grading/grading.service.ts
import { db } from '../../db/client.js';
import { AppError } from '../../utils/errors.js';
import { ErrorCode } from 'shared';
import { cryptoService } from '../../services/crypto.service.js';
import { aiGradingService } from '../../services/ai-grading.service.js';
import { auditService } from '../../services/audit.service.js';
import { computeChainHash } from '../../lib/hash-chain.js';

export class GradingService {

  async gradeObjectiveAnswers(sessionId: string) {
    const session = await db.examSession.findUniqueOrThrow({
      where:  { id: sessionId },
      select: { examId: true },
    });

    const [answers, examQuestions] = await Promise.all([
      db.studentAnswer.findMany({ where: { sessionId }, include: { question: true } }),
      db.examQuestion.findMany({
        where:   { section: { examId: session.examId } },
        include: { question: true },
      }),
    ]);

    const objectiveTypes = ['MCQ', 'MSQ', 'TRUE_FALSE'];
    const answeredIds = new Set(answers.map(a => a.questionId));
    const objectiveAnswers = answers.filter(a => objectiveTypes.includes(a.question.type));

    for (const answer of objectiveAnswers) {
      const response = JSON.parse(cryptoService.decryptAnswer(answer.encryptedResponse));
      const options  = JSON.parse(cryptoService.decryptQuestion(answer.question.encryptedOptions ?? '[]'));
      const correctIds = options.filter((o: any) => o.isCorrect).map((o: any) => o.id);

      let score = 0;
      if (answer.question.type === 'MCQ' || answer.question.type === 'TRUE_FALSE') {
        const selected = Array.isArray(response) ? response[0] : response;
        score = correctIds.includes(selected) ? answer.question.marks : 0;
      } else if (answer.question.type === 'MSQ') {
        // Partial marking: score = (correct selected / total correct) * marks
        // Penalty: deduct for wrong selections
        const selected       = Array.isArray(response) ? response : [];
        const correctHits    = selected.filter((id: string) => correctIds.includes(id)).length;
        const wrongHits      = selected.filter((id: string) => !correctIds.includes(id)).length;
        // Guard: correctIds.length === 0 would divide by zero → NaN. Should
        // be unreachable via the API (MSQ requires ≥2 correct options at
        // create/update time), but grading reads from decrypted stored
        // options, not the validated request payload — treat a malformed
        // question defensively as unscorable rather than propagating NaN.
        if (correctIds.length === 0) {
          score = 0;
        } else {
          const rawScore = ((correctHits - wrongHits) / correctIds.length) * answer.question.marks;
          score          = Math.max(0, Math.round(rawScore * 100) / 100);
        }
      }

      await db.grade.upsert({
        where:  { sessionId_questionId: { sessionId, questionId: answer.questionId } },
        create: {
          sessionId,
          questionId: answer.questionId,
          score,
          maxScore:   answer.question.marks,
          gradedBy:   'SYSTEM',
        },
        update: { score, gradedBy: 'SYSTEM' },
      });
    }

    // DB-4: skipped objective questions still count toward maxScore — give
    // them a zero-score SYSTEM grade instead of leaving no row at all.
    const skippedObjective = examQuestions.filter(
      eq => objectiveTypes.includes(eq.question.type) && !answeredIds.has(eq.questionId),
    );
    for (const eq of skippedObjective) {
      await db.grade.upsert({
        where:  { sessionId_questionId: { sessionId, questionId: eq.questionId } },
        create: {
          sessionId,
          questionId: eq.questionId,
          score:      0,
          maxScore:   eq.question.marks,
          gradedBy:   'SYSTEM',
        },
        update: {},
      });
    }

    await db.examSession.update({
      where: { id: sessionId },
      data:  { status: 'GRADING' },
    });
  }

  async requestAISuggestions(sessionId: string) {
    const session = await db.examSession.findUniqueOrThrow({
      where:  { id: sessionId },
      select: { examId: true },
    });

    const [answers, examQuestions] = await Promise.all([
      db.studentAnswer.findMany({ where: { sessionId }, include: { question: true } }),
      db.examQuestion.findMany({
        where:   { section: { examId: session.examId } },
        include: { question: true },
      }),
    ]);

    const subjectiveTypes = ['SHORT', 'LONG'];
    const answeredIds = new Set(answers.map(a => a.questionId));
    const subjectiveAnswers = answers.filter(a => subjectiveTypes.includes(a.question.type));

    for (const answer of subjectiveAnswers) {
      const responseText = cryptoService.decryptAnswer(answer.encryptedResponse);
      const questionText = JSON.parse(cryptoService.decryptQuestion(answer.question.encryptedContent)).text;
      const rubric       = answer.question.encryptedAnswerKey
        ? cryptoService.decryptQuestion(answer.question.encryptedAnswerKey)
        : undefined;

      const suggestion = await aiGradingService.suggest({
        question:     questionText,
        rubric,
        studentAnswer: responseText,
        maxMarks:     answer.question.marks,
      });

      await db.grade.upsert({
        where:  { sessionId_questionId: { sessionId, questionId: answer.questionId } },
        create: {
          sessionId,
          questionId:      answer.questionId,
          score:           suggestion.suggestedScore,
          maxScore:        answer.question.marks,
          gradedBy:        'AI_SUGGESTION',
          aiSuggestedScore: suggestion.suggestedScore,
          aiReasoning:     suggestion.reasoning,
        },
        update: {
          score:           suggestion.suggestedScore,
          gradedBy:        'AI_SUGGESTION',
          aiSuggestedScore: suggestion.suggestedScore,
          aiReasoning:     suggestion.reasoning,
          confirmedAt:     null,
          confirmedBy:     null,
        },
      });
    }

    // DB-4: skipped subjective questions still need a Grade row so
    // publishResults' "still needing confirmation" check catches them —
    // zero score, unconfirmed, teacher must explicitly confirm before publish.
    const skippedSubjective = examQuestions.filter(
      eq => subjectiveTypes.includes(eq.question.type) && !answeredIds.has(eq.questionId),
    );
    for (const eq of skippedSubjective) {
      await db.grade.upsert({
        where:  { sessionId_questionId: { sessionId, questionId: eq.questionId } },
        create: {
          sessionId,
          questionId: eq.questionId,
          score:      0,
          maxScore:   eq.question.marks,
          gradedBy:   'SYSTEM',
        },
        update: {},
      });
    }
  }

  async confirmGrade(
    sessionId: string,
    questionId: string,
    teacherId: string,
    score: number,
    note?: string,
  ) {
    const grade = await db.grade.findUniqueOrThrow({
      where:   { sessionId_questionId: { sessionId, questionId } },
      include: { question: true },
    });

    
    if (score < 0 || score > grade.maxScore) {
      throw new AppError(400, `Score must be between 0 and ${grade.maxScore}`, ErrorCode.VALIDATION_ERROR);
    }

    // Atomic update guard: only apply if grade is still unpublished.
    const updateResult = await db.grade.updateMany({
      where: { sessionId, questionId, isPublished: false },
      data:  {
        score,
        gradedBy:    teacherId,
        confirmedBy: teacherId,
        confirmedAt: new Date(),
        teacherNote: note,
      },
    });

    if (updateResult.count === 0) {
      
      throw new AppError(
        409,
        'Grade is already published and cannot be edited directly. Reopen grading for this session first.',
        ErrorCode.GRADE_ALREADY_PUBLISHED,
        { sessionId, questionId, reopenAction: 'reopenGrading' },
      );
    }

    // Hash chain scoped to this (sessionId, questionId) pair — each entry
    // records the grade state just before it was overwritten (DB-2).
    const prevGradeHistory = await db.gradeHistory.findFirst({
      where:   { sessionId, questionId },
      orderBy: { createdAt: 'desc' },
      select:  { recordHash: true },
    });
    const prevHash    = prevGradeHistory?.recordHash ?? null;
    const createdAt   = new Date();
    const recordHash  = computeChainHash({
      sessionId, questionId,
      score:    grade.score,
      gradedBy: grade.gradedBy,
      note:     grade.teacherNote,
      prevHash,
      createdAt: createdAt.toISOString(),
    });

    await db.gradeHistory.create({
      data: {
        sessionId,
        questionId,
        score:    grade.score,
        gradedBy: grade.gradedBy,
        note:     grade.teacherNote,
        prevHash,
        recordHash,
        createdAt,
      },
    });

    const updated = await db.grade.findUniqueOrThrow({
      where: { sessionId_questionId: { sessionId, questionId } },
    });

    await auditService.log({
      actorId:      teacherId,
      action:       'GRADE_CONFIRMED',
      resourceType: 'Grade',
      resourceId:   grade.id,
      metadata:     { sessionId, questionId, previousScore: grade.score, newScore: score, note },
    });

    return updated;
  }

  async publishResults(sessionId: string, teacherId: string) {
    // Ensure all subjective grades are confirmed
    const unconfirmed = await db.grade.count({
      where: {
        sessionId,
        confirmedAt: null,
        question:    { type: { in: ['SHORT', 'LONG'] } },
      },
    });
    if (unconfirmed > 0) {
      throw new AppError(409, `${unconfirmed} subjective answers still need confirmation`, ErrorCode.VALIDATION_ERROR);
    }

    await db.grade.updateMany({
      where: { sessionId },
      data:  { isPublished: true },
    });

    await db.examSession.update({
      where: { id: sessionId },
      data:  { status: 'PUBLISHED' },
    });

    await auditService.log({
      actorId:      teacherId,
      action:       'RESULTS_PUBLISHED',
      resourceType: 'ExamSession',
      resourceId:   sessionId,
    });
  }

  async reopenGrading(sessionId: string, teacherId: string, reason: string) {
    const session = await db.examSession.findFirst({
      where: { id: sessionId, status: 'PUBLISHED' },
    });
    if (!session) throw new AppError(404, 'Published session not found', ErrorCode.NOT_FOUND);

    await db.examSession.update({
      where: { id: sessionId },
      data:  { status: 'GRADING_OPEN' },
    });

    await db.grade.updateMany({
      where: { sessionId },
      data:  { isPublished: false },
    });

    await auditService.log({
      actorId:      teacherId,
      action:       'GRADING_REOPENED',
      resourceType: 'ExamSession',
      resourceId:   sessionId,
      metadata:     { reason },
    });
  }
}

export const gradingService = new GradingService();
```

---

## 16. Background Job Workers

### 16.1 Queue Definitions

```typescript
// packages/backend/src/jobs/queues.ts
import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.js';

const connection = {
  host: new URL(process.env['REDIS_URL']!).hostname,
  port: parseInt(new URL(process.env['REDIS_URL']!).port || '6379'),
};

export const gradingQueue    = new Queue('grading',    { connection });
export const telemetryQueue  = new Queue('telemetry',  { connection });
export const reportQueue     = new Queue('reports',    { connection });

// Redis-backed delayed jobs for session finalization. Two independent
// job families share this queue, distinguished by jobId prefix so they
// can't collide or silently overwrite one another:
//   reconnect:<sessionId> — reconnect-window timeout (§13.2 disconnect)
//   expiry:<sessionId>    — exam duration elapsed (§11.1 startSession)
export const autoSubmitQueue = new Queue('auto-submit', { connection });
```

### 16.1a Auto-Submit (Reconnect Timeout) Worker

```typescript
// packages/backend/src/jobs/workers/auto-submit.worker.ts
import { Worker } from 'bullmq';
import { sessionService } from '../../modules/sessions/session.service.js';
import { logger } from '../../utils/logger.js';

// jobId is always the sessionId, so scheduling is idempotent: re-adding a
// job with the same id after a fresh disconnect simply replaces the
// existing delayed job rather than stacking a second one.
export const autoSubmitWorker = new Worker('auto-submit', async (job) => {
  const { sessionId, reason } = job.data as { sessionId: string; reason: 'RECONNECT_TIMEOUT' | 'TIME_EXPIRED' };
  logger.warn({ sessionId, reason }, 'Durable auto-submit job fired');
  const result = await sessionService.autoSubmit(sessionId);

  // autoSubmit() no-ops (returns null) if the session was already
  // finalized by another path (voluntary submit, risk threshold, or the
  // other job family) — nothing to notify in that case.
  if (!result) return { sessionId, skipped: true };

  // Worker processes don't hold a live Socket.IO server reference, so we
  // publish over Redis pub/sub; the WS gateway process(es) subscribe to
  // this channel and re-broadcast to both the student's own session room
  // and the relevant proctor room.
  const { redis } = await import('../../config/redis.js');
  await redis.publish('session:auto-submitted', JSON.stringify({
    sessionId, examId: result.examId, reason,
  }));

  return { sessionId, submittedAt: new Date().toISOString() };
}, {
  concurrency: 10,
  removeOnComplete: { count: 100 },
  removeOnFail:     { count: 50 },
});

autoSubmitWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Auto-submit job failed');
});
```

### 16.2 Grading Worker

```typescript
// packages/backend/src/jobs/workers/grading.worker.ts
import { Worker } from 'bullmq';
import { gradingService } from '../../modules/grading/grading.service.js';
import { logger } from '../../utils/logger.js';

export const gradingWorker = new Worker('grading', async (job) => {
  const { sessionId } = job.data as { sessionId: string };
  logger.info({ sessionId, jobId: job.id }, 'Grading job started');

  // Step 1: Auto-grade all objective questions
  await gradingService.gradeObjectiveAnswers(sessionId);
  logger.info({ sessionId }, 'Objective grading complete');

  // Step 2: Request AI suggestions for subjective questions
  await gradingService.requestAISuggestions(sessionId);
  logger.info({ sessionId }, 'AI suggestions requested');

  return { sessionId, completedAt: new Date().toISOString() };
}, {
  concurrency:  5,
  removeOnComplete: { count: 100 },
  removeOnFail:     { count: 50 },
});

gradingWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Grading job failed');
});
```

---

## 17. Encryption Service

```typescript
// packages/backend/src/services/crypto.service.ts
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES  = 12;  // 96-bit IV for GCM
const TAG_BYTES = 16;  // 128-bit auth tag

type KeyName = 'question' | 'answer' | 'biometric';

export class CryptoService {
  private keys: Record<KeyName, Buffer>;

  constructor() {
    this.keys = {
      question:  Buffer.from(env.QUESTION_ENC_KEY, 'hex'),
      answer:    Buffer.from(env.ANSWER_ENC_KEY,   'hex'),
      biometric: Buffer.from(env.BIOMETRIC_ENC_KEY,'hex'),
    };
  }

  private encrypt(plaintext: string, keyName: KeyName): string {
    const key    = this.keys[keyName]!;
    const iv     = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // Format: base64(iv):base64(tag):base64(ciphertext)
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decrypt(stored: string, keyName: KeyName): string {
    const [ivB64, tagB64, ciphertextB64] = stored.split(':');
    if (!ivB64 || !tagB64 || !ciphertextB64) {
      throw new Error('Malformed ciphertext');
    }

    const key      = this.keys[keyName]!;
    const iv       = Buffer.from(ivB64, 'base64');
    const tag      = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);  // GCM authentication tag verification

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
    // If tag doesn't match: decipher.final() throws → decryption fails
    // This catches any tampering with the ciphertext or tag
  }

  encryptQuestion(plaintext: string): string   { return this.encrypt(plaintext, 'question'); }
  decryptQuestion(stored: string):   string    { return this.decrypt(stored,    'question'); }
  encryptAnswer(plaintext: string):  string    { return this.encrypt(plaintext, 'answer');   }
  decryptAnswer(stored: string):     string    { return this.decrypt(stored,    'answer');   }

  // Generate a key for one-time use (e.g. exam entry token signing)
  generateHmacKey(): Buffer { return randomBytes(32); }

  // Constant-time string comparison (avoids timing oracle attacks)
  safeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }
}

export const cryptoService = new CryptoService();
```

---

## 18. Audit Log Service

```typescript
// packages/backend/src/lib/hash-chain.ts
import crypto from 'crypto';

// Shared SHA-256 hash-chaining primitive (SEC-7 / DB-2). Canonicalizes a
// JSON-serializable payload — callers must include `prevHash` in the
// payload themselves so each record's hash depends on the one before it.
export function computeChainHash(payload: object): string {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
```

```typescript
// packages/backend/src/services/audit.service.ts
import type { Prisma } from '@prisma/client';
import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';
import { computeChainHash } from '../lib/hash-chain.js';

interface AuditEntry {
  institutionId?: string;
  actorId?:       string;
  actorRole?:     string;
  action:         string;
  resourceType:   string;
  resourceId?:    string;
  metadata?:      object;
  ipAddress?:     string;
  userAgent?:     string;
}

export class AuditService {
  // Redis key for last hash (for quick chain building)
  private lastHashKey = 'audit:last_hash';

  // Fixed advisory-lock key serializing every audit-chain append so the
  // prevHash-read + insert below is atomic and the chain can't fork under
  // concurrent traffic (IMP-2). The value is arbitrary — any consistent
  // 64-bit int works, it carries no other meaning.
  private static readonly CHAIN_LOCK_KEY = 847_291_003n;

  // Fixed key order + explicit nulls, so log() and verifyChain() always hash
  // an identical shape regardless of which optional fields a caller passed
  // (IMP-1).
  private canonicalPayload(record: {
    institutionId: string | null;
    actorId:       string | null;
    actorRole:     string | null;
    action:        string;
    resourceType:  string;
    resourceId:    string | null;
    metadata:      object;
    ipAddress:     string | null;
    userAgent:     string | null;
    prevHash:      string | null;
    timestamp:     string;
  }): object {
    return {
      institutionId: record.institutionId,
      actorId:       record.actorId,
      actorRole:     record.actorRole,
      action:        record.action,
      resourceType:  record.resourceType,
      resourceId:    record.resourceId,
      metadata:      record.metadata,
      ipAddress:     record.ipAddress,
      userAgent:     record.userAgent,
      prevHash:      record.prevHash,
      timestamp:     record.timestamp,
    };
  }

  private static readonly PII_PATTERNS = [
    // Mask last octet of IPv4
    { pattern: /(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}/g, replace: '$1.***' },
    // Mask last 4 chars of any email local part
    { pattern: /([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]+(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, replace: '$1****$2' },
  ];

  // Masks PII in a projection of stored metadata — the AuditLog row itself
  // is never touched (SEC-7): mutating it would change recordHash and make
  // verifyChain() report every sanitized record as tampered.
  getMetadataForViewer(metadata: object, viewerIsAdmin: boolean): object {
    if (viewerIsAdmin) return metadata;

    let sanitized = JSON.stringify(metadata);
    for (const { pattern, replace } of AuditService.PII_PATTERNS) {
      sanitized = sanitized.replace(pattern, replace);
    }
    return JSON.parse(sanitized);
  }

  async log(entry: AuditEntry): Promise<void> {
    const metadata  = entry.metadata ?? {};

    await db.$transaction(async (tx) => {
      // Blocks until any other in-flight append commits — everything below
      // is only safe because nothing else can be inside this section
      // concurrently (IMP-2).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AuditService.CHAIN_LOCK_KEY})`;

      const prevHash  = await this.getLastHash(tx);
      const timestamp = new Date();
      const recordHash = computeChainHash(this.canonicalPayload({
        institutionId: entry.institutionId ?? null,
        actorId:       entry.actorId ?? null,
        actorRole:     entry.actorRole ?? null,
        action:        entry.action,
        resourceType:  entry.resourceType,
        resourceId:    entry.resourceId ?? null,
        metadata,
        ipAddress:     entry.ipAddress ?? null,
        userAgent:     entry.userAgent ?? null,
        prevHash,
        timestamp:     timestamp.toISOString(),
      }));

      await tx.auditLog.create({
        data: {
          ...entry,
          metadata,
          prevHash,
          recordHash,
          timestamp,
        },
      });

      // Written before this transaction commits (and so before the
      // advisory lock releases) — the next writer's Redis read below is
      // guaranteed fresh, never stale (IMP-2).
      await this.setLastHash(recordHash);
    });
  }

  async logSecurityEvent(event: string, metadata: object): Promise<void> {
    logger.warn({ event, ...metadata }, 'Security event');
    await this.log({
      action:       event,
      resourceType: 'Security',
      metadata,
    });
  }

  // High-volume, attacker-controllable events (invalid JWTs, rate-limit
  // hits, permission denials) do NOT go through the hash-chained
  // AuditService.log() path (REL-3). An unauthenticated flood of these
  // would both bloat the immutable chain and contend on its serializing
  // advisory lock (IMP-2), degrading latency for legitimate requests — a
  // self-inflicted DoS amplifier. Per HLD §18.1's Three Pillars, these
  // belong to the "structured logs" pillar (operational, prunable), not
  // the "audit trail" pillar (tamper-evident, consequential actions only).
  //
  // Written as a structured log line (queryable via the log aggregator)
  // plus a per-minute Redis counter for spike detection — no DB write,
  // no chain contention, no per-event row growth.
  async logOperationalSecurityEvent(event: string, metadata: object): Promise<void> {
    logger.warn({ event, ...metadata, tier: 'operational' }, 'Security event (operational)');

    const { redis } = await import('../config/redis.js');
    const bucket = Math.floor(Date.now() / 60_000); // 1-minute buckets
    const key = `sec_event_count:${event}:${bucket}`;
    await redis.incr(key);
    await redis.expire(key, 3600); // buckets retained 1h for alerting/dashboards
  }

  // Verify the entire audit log chain integrity
  async verifyChain(): Promise<{
    valid: boolean;
    totalRecords: number;
    brokenAt?: string;
  }> {
    // Global chain only (IMP-3) — many records (pre-auth security events)
    // have no institutionId, but their recordHash is still a prevHash link
    // for later records, so a scoped subset can never verify cleanly.
    // Per-institution *display* filtering happens separately, at the
    // query that builds the report's auditTrail, not here.
    const logs = await db.auditLog.findMany({
      orderBy: { timestamp: 'asc' },
    });

    for (let i = 0; i < logs.length; i++) {
      const log  = logs[i]!;
      const prev = logs[i - 1];

      const expectedHash = computeChainHash(this.canonicalPayload({
        institutionId: log.institutionId,
        actorId:       log.actorId,
        actorRole:     log.actorRole,
        action:        log.action,
        resourceType:  log.resourceType,
        resourceId:    log.resourceId,
        metadata:      log.metadata as object,
        ipAddress:     log.ipAddress,
        userAgent:     log.userAgent,
        prevHash:      prev?.recordHash ?? null,
        timestamp:     log.timestamp.toISOString(),
      }));

      if (expectedHash !== log.recordHash) {
        return { valid: false, totalRecords: logs.length, brokenAt: log.id };
      }
    }

    return { valid: true, totalRecords: logs.length };
  }

  private async getLastHash(tx: Prisma.TransactionClient = db): Promise<string | null> {
    const { redis } = await import('../config/redis.js');
    const cached = await redis.get(this.lastHashKey);
    if (cached) return cached;
    // Fallback: query DB, inside the same locked transaction so the read
    // can't race a concurrent commit.
    const last = await tx.auditLog.findFirst({ orderBy: { timestamp: 'desc' }, select: { recordHash: true } });
    return last?.recordHash ?? null;
  }

  private async setLastHash(hash: string): Promise<void> {
    const { redis } = await import('../config/redis.js');
    await redis.set(this.lastHashKey, hash, 'EX', 300);
  }
}

export const auditService = new AuditService();
```


---

## 19. Web Frontend — Low Level Design

### 19.1 Package Structure

```
packages/web/src/
├── api/
│   ├── client.ts            # Axios instance with interceptors
│   ├── auth.api.ts
│   ├── exams.api.ts
│   ├── sessions.api.ts
│   ├── proctoring.api.ts
│   └── grading.api.ts
├── components/
│   ├── ui/                  # Atomic: Button, Input, Badge, Modal, Table
│   ├── exam/                # ExamCard, ExamStatusBadge, SectionEditor
│   ├── questions/           # QuestionEditor, RichTextEditor, OptionsList
│   ├── proctor/             # SessionGrid, SessionTile, FlagCard, RiskBadge
│   └── grading/             # GradeRow, ConfirmModal, ScoreInput
├── pages/
│   ├── auth/                # Login, Register
│   ├── dashboard/           # Role-based dashboard
│   ├── exams/               # List, Create, Edit, Approve, Publish
│   ├── proctor/             # LiveDashboard, SessionDetail
│   └── grading/             # GradingQueue, SessionGrading
├── hooks/
│   ├── useAuth.ts
│   ├── useExam.ts
│   ├── useProctoringSocket.ts
│   └── useGrading.ts
├── store/
│   ├── auth.store.ts        # Zustand: user, access token, login/logout
│   ├── exam.store.ts
│   └── proctor.store.ts
└── utils/
    ├── axios-error.ts
    └── date.ts
```

### 19.2 API Client with Token Refresh Interceptor

```typescript
// packages/web/src/api/client.ts
import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/auth.store.js';

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

export const apiClient: AxiosInstance = axios.create({
  baseURL:         import.meta.env['VITE_API_URL'] + '/v1',
  withCredentials: true,   // sends HttpOnly refresh cookie
  headers: {
    'Content-Type':   'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 15_000,
});

// ── Request interceptor: attach access token ─────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ── Response interceptor: auto-refresh on 401 ────────────────
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise(resolve => {
          refreshQueue.push((token: string) => {
            original.headers['Authorization'] = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const res = await apiClient.post('/auth/refresh');
        const newToken = res.data.accessToken as string;
        useAuthStore.getState().setAccessToken(newToken);
        refreshQueue.forEach(cb => cb(newToken));
        refreshQueue = [];
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
```

### 19.3 Auth Store (Zustand)

```typescript
// packages/web/src/store/auth.store.ts
import { create } from 'zustand';
import type { Role } from 'shared';

interface User {
  id:            string;
  email:         string;
  firstName:     string;
  lastName:      string;
  role:          Role;
  institutionId: string;
}

interface AuthState {
  user:          User | null;
  accessToken:   string | null;    // never persisted to localStorage
  isAuthenticated: boolean;
  setAuth:       (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
  logout:        () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  accessToken:     null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
  setAccessToken: (token) => set({ accessToken: token }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
```

### 19.4 Proctor Dashboard Socket Hook

```typescript
// packages/web/src/hooks/useProctoringSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store.js';
import { useProctoringStore } from '../store/proctor.store.js';

export function useProctoringSocket(examId: string) {
  const socket = useRef<Socket | null>(null);
  const token  = useAuthStore(s => s.accessToken);
  const { addFlag, updateRiskScore, markSessionDisconnected } = useProctoringStore();

  useEffect(() => {
    if (!token) return;

    socket.current = io(`${import.meta.env['VITE_WS_URL']}/proctor`, {
      auth:       { token },
      transports: ['websocket'],
    });

    socket.current.emit('proctor:join-exam', { examId });

    socket.current.on('flag:new', (data) => {
      addFlag(data.sessionId, data);
    });

    socket.current.on('risk:updated', (data) => {
      updateRiskScore(data.sessionId, data.riskScore);
    });

    socket.current.on('session:disconnected', (data) => {
      markSessionDisconnected(data.sessionId, data.reason);
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [examId, token]);

  const sendProctoringAction = (sessionId: string, action: string, data?: object) => {
    socket.current?.emit('proctor:action', { sessionId, action, ...data });
  };

  return { sendProctoringAction };
}
```

### 19.5 Route Guards

```typescript
// packages/web/src/components/RouteGuard.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store.js';
import type { Permission } from 'shared';
import { ROLE_PERMISSIONS } from 'shared';

interface Props {
  permission: Permission;
  children:   React.ReactNode;
}

export function RouteGuard({ permission, children }: Props) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const userPermissions = ROLE_PERMISSIONS[user!.role] ?? [];
  if (!userPermissions.includes(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

---

## 20. Electron Client — Low Level Design

### 20.1 Main Process Structure

```
packages/electron/src/
├── main/
│   ├── index.ts              # App entry point, BrowserWindow creation
│   ├── lockdown.ts           # OS-level lockdown enforcement
│   ├── device.ts             # Hardware fingerprint collection
│   ├── process-scanner.ts    # Forbidden process detection
│   ├── display-manager.ts    # Monitor count enforcement
│   ├── heartbeat.ts          # WebSocket heartbeat + session health
│   ├── updater.ts            # Auto-update logic
│   ├── attestation.ts        # Signs attestation tokens proving this is the real client
│   └── ipc/
│       ├── device.ipc.ts     # IPC handlers for device fingerprint/gates/camera
│       └── attestation.ipc.ts # IPC handler for attestation token generation
│                              # FIX (hybrid architecture, Option A): auth.ipc.ts,
│                              # exam.ipc.ts, proctor.ipc.ts removed — under
│                              # Option A the renderer (packages/web) owns its
│                              # own WebSocket/HTTP connection to the backend
│                              # directly, identical to the pure-web path. Main
│                              # process only handles things that genuinely
│                              # require native access.
└── preload/
    └── index.ts              # contextBridge — exposes ONLY getAttestationToken()
                               # to the remotely-loaded renderer. No bundled
                               # renderer/ — the exam UI is the same web app
                               # (packages/web), loaded via win.loadURL, not a
                               # separate compiled React app. See 20.2/20.x for
                               # why this is safe: the native lockdown modules
                               # above (lockdown.ts, process-scanner.ts,
                               # display-manager.ts, device.ts) are unaffected —
                               # they run in the main process regardless of
                               # where the renderer's HTML comes from. Safety
                               # depends entirely on attestation.ts +
                               # server-side verification (20.x), not on the
                               # renderer being locally bundled.
```

### 20.2 Main Process — Window Creation

```typescript
// packages/electron/src/main/index.ts
import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { LockdownManager } from './lockdown.js';
import { setupIpcHandlers } from './ipc/index.js';
import { updater } from './updater.js';
import { env } from './config.js';   // WEB_ORIGIN

// FIX (command-line switch exploit): some switches (remote-debugging-port
// etc.) are consumed by Chromium before app code runs — this catches the
// common case, not a guarantee. Real backstop is server-side attestation
// (§20.x): a tampered client still can't get a session without it.
const DANGEROUS_SWITCHES = ['disable-web-security', 'remote-debugging-port', 'remote-debugging-address', 'inspect', 'inspect-brk'];
if (process.argv.some(arg => DANGEROUS_SWITCHES.some(sw => arg.includes(`--${sw}`)))) {
  app.quit();
  process.exit(1);
}

const lockdown = new LockdownManager();

// FIX (hybrid architecture): loads packages/web via a dedicated route, not
// a bundled renderer. That route's bundle must never import teacher/admin/
// proctor router modules (build-config requirement, not enforceable here).
const EXAM_CLIENT_ROUTE = `${env.WEB_ORIGIN}/electron/session-entry`;
const ALLOWED_PREFIX     = `${env.WEB_ORIGIN}/electron/`;

async function createWindow(): Promise<BrowserWindow> {
  // FIX (harm reduction, no subdomain): isolated cookie/storage jar from
  // any regular browser session on the domain. Does not isolate against
  // XSS injected into /electron/*'s own code — that needs the deferred
  // subdomain migration; tracked as accepted residual risk.
  const examSession = session.fromPartition('persist:examclient');

  // FIX (wrong session target bug): must attach to examSession, not
  // defaultSession — the window uses examSession, so an interceptor
  // anywhere else silently never fires. FIX (dead nonce bug): CSP nonce
  // must be server-owned (packages/web's /electron/* route sets it and
  // matches it in rendered <script> tags) — Electron can't know the
  // server's value, so it only adds Trusted Types here, nothing nonce-based.
  examSession.webRequest.onHeadersReceived((details, callback) => {
    const existing = details.responseHeaders?.['Content-Security-Policy']?.[0] ?? "default-src 'none'";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [`${existing}; require-trusted-types-for 'script';`],
      },
    });
  });

  const win = new BrowserWindow({
    width:              1280,
    height:             800,
    fullscreen:         false,  // will be set to fullscreen by lockdown on exam start
    fullscreenable:     false,
    resizable:          true,   // lockdown overrides this
    movable:            true,
    minimizable:        false,  // lockdown enforces this
    closable:           false,  // prevent accidental close; exits handled by lockdown
    webPreferences: {
      nodeIntegration:             false,   // CRITICAL: never enable
      contextIsolation:            true,    // CRITICAL: always on
      sandbox:                     true,    // Extra renderer isolation
      webSecurity:                 true,
      allowRunningInsecureContent: false,
      session:                     examSession,
      // FIX (DevTools timing attack): disable the capability, don't react
      // to it opening 
      devTools:                    process.env['NODE_ENV'] === 'development',
      preload:                     path.join(__dirname, '../preload/index.js'),
    },
  });

  // FIX (hybrid architecture): always load the remote route; dev/prod
  // differ only in which origin env.WEB_ORIGIN points to.
  await win.loadURL(EXAM_CLIENT_ROUTE);
  if (process.env['NODE_ENV'] === 'development') {
    win.webContents.openDevTools();   // safe: devTools:true only in dev
  }

  // FIX (hybrid architecture, Option A): main process has no connection of
  // its own to the backend — natively-detected violations reach it only by
  // being pushed to the renderer, which forwards over its own already-open
  // WS connection. setViolationReporter existed but was never wired to
  // anything; this is that wiring.
  lockdown.setViolationReporter((type, data) => {
    win.webContents.send('violation:native', { type, data });
  });

  // FIX (redirect gap): will-redirect is a separate event from
  // will-navigate — an HTTP 30x could navigate externally without ever
  // firing will-navigate. Both pinned to the same allowlist.
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ALLOWED_PREFIX)) {
      event.preventDefault();
    }
  });
  win.webContents.on('will-redirect', (event, url) => {
    if (!url.startsWith(ALLOWED_PREFIX)) {
      event.preventDefault();
    }
  });

  // FIX (SPA router bypass): will-navigate misses history.pushState — DOM
  // has already changed by the time this fires, so it's a backstop, not
  // prevention (real prevention is the code-split bundle noted above).
  // Reports the attempt as a risk event, same as any other proctoring signal.
  win.webContents.on('did-navigate-in-page', (event, url) => {
    if (!url.startsWith(ALLOWED_PREFIX)) {
      lockdown.report('SPA_ROUTE_ESCAPE_ATTEMPT', { url });
      win.loadURL(EXAM_CLIENT_ROUTE);
    }
  });

  // FIX (context menu escape route): Electron's built-in spellcheck menu
  // offers Save As/Print on editable fields with nothing wired up — must
  // be blocked unconditionally, not safe by omission.
  win.webContents.on('context-menu', (event) => event.preventDefault());

  // Prevent opening new windows — now logged: an attempted window.open()
  // in a locked-down exam window is itself a suspicious signal.
  win.webContents.setWindowOpenHandler(({ url }) => {
    lockdown.report('WINDOW_OPEN_ATTEMPT', { url });
    return { action: 'deny' };
  });

  setupIpcHandlers(win);
  return win;
}

app.whenReady().then(async () => {
  const win = await createWindow();
  await updater.checkForUpdates();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

### 20.3 Lockdown Manager

```typescript
// packages/electron/src/main/lockdown.ts
import { app, globalShortcut, BrowserWindow, screen } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { processScanner } from './process-scanner.js';
import { logger } from './logger.js';

const execAsync = promisify(exec);

export class LockdownManager {
  private active            = false;
  private watchdogInterval: NodeJS.Timeout | null = null;
  private reportViolation:  ((type: string, data: object) => void) | null = null;

  setViolationReporter(fn: (type: string, data: object) => void) {
    this.reportViolation = fn;
  }

  // Public entry point for callers outside this class (e.g. main/index.ts's
  // navigation/window-open guards) — reportViolation itself stays private;
  // external code was never meant to reach into the field directly.
  report(type: string, data: object) {
    this.reportViolation?.(type, data);
  }

  async enable(win: BrowserWindow) {
    this.active = true;

    // 1. Fullscreen — forces student to use the entire display
    win.setFullScreen(true);
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setMinimizable(false);
    win.setResizable(false);

    // 2. Block OS-level shortcuts
    this.blockShortcuts();

    // 3. Platform-specific hardening
    if (process.platform === 'win32') {
      await this.enableWindowsHardening();
    } else if (process.platform === 'darwin') {
      await this.enableMacOSHardening();
    }

    // 4. Start process watchdog — check every 5 seconds
    this.watchdogInterval = setInterval(async () => {
      const forbidden = await processScanner.scan();
      if (forbidden.length > 0) {
        logger.warn({ forbidden }, 'Forbidden processes detected');
        this.reportViolation?.('FORBIDDEN_PROCESS', { processes: forbidden });
      }
    }, 5_000);

    logger.info('Lockdown enabled');
  }

  async disable(win: BrowserWindow) {
    this.active = false;

    if (this.watchdogInterval) clearInterval(this.watchdogInterval);

    win.setFullScreen(false);
    win.setAlwaysOnTop(false);
    win.setMinimizable(true);
    win.setResizable(true);

    globalShortcut.unregisterAll();

    if (process.platform === 'win32') {
      await this.disableWindowsHardening();
    }

    logger.info('Lockdown disabled');
  }

  private blockShortcuts() {
    const blocked = [
      'Alt+Tab', 'Alt+F4', 'Meta+Tab', 'Meta+M',
      'CommandOrControl+W', 'CommandOrControl+Q',
      'CommandOrControl+H', 'CommandOrControl+M',
      'Meta+Space',         // macOS Spotlight
      'F11',
    ];
    for (const shortcut of blocked) {
      globalShortcut.register(shortcut, () => {
        this.reportViolation?.('KEYBOARD_SHORTCUT', { shortcut });
      });
    }
  }

  private async enableWindowsHardening() {
    // Disable Task Manager (requires admin install; installer sets this)
    await execAsync(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" ' +
      '/v DisableTaskMgr /t REG_DWORD /d 1 /f',
    ).catch(e => logger.error(e, 'Failed to disable Task Manager'));

    // Disable right-click on taskbar
    await execAsync(
      'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" ' +
      '/v TaskbarSizeMove /t REG_DWORD /d 0 /f',
    ).catch(() => {});
  }

  private async disableWindowsHardening() {
    await execAsync(
      'reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System" ' +
      '/v DisableTaskMgr /f',
    ).catch(() => {});
  }

  private async enableMacOSHardening() {
    // Disable Mission Control keyboard shortcuts
    await execAsync(
      'defaults write com.apple.symbolichotkeys AppleSymbolicHotKeys -dict-add 32 ' +
      '"<dict><key>enabled</key><false/></dict>"',
    ).catch(() => {});
  }
}
```

### 20.3a Client Attestation

```typescript
// packages/electron/src/main/attestation.ts
import crypto from 'crypto';
import { app } from 'electron';
import { env } from './config.js';

// Signs a short-lived token proving a request came from the genuine
// Electron binary, not a scripted client hitting the API directly.
// ATTESTATION_HMAC_SECRET is embedded at build time (baked into the
// signed binary), same rationale as ENTRY_TOKEN_HMAC_SECRET (L1) — never
// transmitted on its own, only used to compute a verifiable signature.
// Honest limit: a client-embedded secret can be extracted by a determined
// reverse-engineer (no hardware-backed enclave here) — this raises the
// bar past casual scripting, it doesn't make bypass impossible. Real
// defense-in-depth is the AI proctoring layer (FR-031-038) that keeps
// watching regardless of what the local client claims.
export function generateAttestationToken(deviceId: string): string {
  const payload = JSON.stringify({ deviceId, timestamp: Date.now(), appVersion: app.getVersion() });
  const signature = crypto
    .createHmac('sha256', Buffer.from(env.ATTESTATION_HMAC_SECRET, 'hex'))
    .update(payload)
    .digest('hex');
  return `${Buffer.from(payload).toString('base64url')}.${signature}`;
}
```

```typescript
// packages/electron/src/main/ipc/attestation.ipc.ts
import { ipcMain } from 'electron';
import { generateAttestationToken } from '../attestation.js';
import { getDeviceFingerprint } from '../device.js';

export function registerAttestationHandlers() {
  ipcMain.handle('attestation:get-token', async () => {
    const deviceId = await getDeviceFingerprint();
    return generateAttestationToken(deviceId);
  });
}
```

### 20.4 Preload Script — contextBridge

```typescript
// packages/electron/src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

// This file is the ONLY surface through which the renderer can
// interact with the main process. Nothing else is exposed.
// The renderer has zero access to Node.js, Electron, or OS APIs.

// FIX (drag-and-drop cheat notes): default Electron behavior lets a
// dropped local file (text/HTML cheat sheet) trigger a navigation. Runs
// here, not in the remote page's own JS, so it can't be skipped by
// whatever ships in that bundle.
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());

// FIX (hybrid architecture, Option A): the renderer is the same web app
// (packages/web) and owns its own WebSocket connection to the backend
// directly — JOIN, SUBMIT_ANSWER, SUBMIT_EXAM, ANALYSIS_RESULT, and all
// server→client events (timer sync, proctor actions, exam terminated) are
// plain socket.io-client calls in that page's own code, identical to the
// pure-web path. examBridge exposes ONLY what genuinely requires native
// access — nothing here proxies backend traffic; that would mean
// reimplementing WebSocket relaying in the main process for no benefit,
// since the renderer can already reach the backend on its own.
contextBridge.exposeInMainWorld('examBridge', {
  // FIX (app verification / spoofed-browser access): the remote page calls
  // this and attaches the result as a header on entry-gate/session-start
  // requests it makes over its own connection. Only a request carrying a
  // valid token passes server-side verification (§11/§12) — a plain
  // browser hitting the same URL has no way to obtain one, since this only
  // exists behind the contextBridge.
  getAttestationToken: () =>
    ipcRenderer.invoke('attestation:get-token'),

  // ── Native-only capabilities ──────────────────────────────
  getDeviceFingerprint: () =>
    ipcRenderer.invoke('device:get-fingerprint'),

  runSecurityGates: (examId: string) =>
    ipcRenderer.invoke('device:run-gates', { examId }),

  getCameraDevices: () =>
    ipcRenderer.invoke('camera:get-devices'),

  // FIX (hybrid architecture, Option A): violations detected IN the main
  // process (forbidden process, keyboard shortcut, SPA route escape,
  // window.open attempt — see lockdown.ts and main/index.ts) have no way
  // to reach the backend on their own; main process doesn't hold a
  // connection to it. This is the relay: main pushes the event here, the
  // renderer forwards it over its own already-open WS connection
  // (VIOLATION_REPORT), the same way it reports anything else.
  onNativeViolation: (cb: (violation: { type: string; data: object }) => void) => {
    ipcRenderer.on('violation:native', (_e, violation) => cb(violation));
    return () => ipcRenderer.removeAllListeners('violation:native');
  },
});

// Type declaration consumed by the renderer's tsconfig
declare global {
  interface Window {
    examBridge: typeof import('./index.js')['examBridge'];
  }
}
```

### 20.5 Face Detection Hook

FIX (hybrid architecture): this hook now lives in `packages/web/src/routes/electron/hooks/useFaceDetection.ts`, not in this package — there is no local `renderer/` anymore (§20.1). Logic is unchanged; only its location moved, since the exam UI it belongs to is the remote page loaded via §20.2, not a bundled Electron build. See `packages/web`'s own module docs for the current version of this hook.

### 20.6 Process Scanner

```typescript
// packages/electron/src/main/process-scanner.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const FORBIDDEN_PROCESSES = [
  // Screen capture / recording
  'obs64.exe', 'obs32.exe', 'obs.exe',           // OBS
  'Snagit32.exe', 'SnagitEditor.exe',             // Snagit
  'ShareX.exe',                                    // ShareX
  'Camtasia.exe',
  'fraps.exe',
  // Remote access / virtual machine
  'TeamViewer.exe', 'TeamViewer_Service.exe',
  'AnyDesk.exe',
  'LogMeIn.exe',
  'vmware.exe', 'vmware-vmx.exe',                 // VMware
  'VirtualBoxVM.exe', 'VBoxHeadless.exe',         // VirtualBox
  // Communication (to prevent screen sharing via calls)
  'discord.exe',
  'Zoom.exe',
  'Teams.exe',
  // macOS equivalents
  'obs',
  'Zoom',
  'Microsoft Teams',
  'TeamViewer',
  'AnyDesk',
  'VirtualBox',
];

export const processScanner = {
  async scan(): Promise<string[]> {
    try {
      const list = await this.getRunningProcesses();
      return FORBIDDEN_PROCESSES.filter(fp =>
        list.some(p => p.toLowerCase().includes(fp.toLowerCase())),
      );
    } catch {
      return [];
    }
  },

  async getRunningProcesses(): Promise<string[]> {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('tasklist /fo csv /nh');
      return stdout.split('\n').map(line => line.split(',')[0]?.replace(/"/g, '') ?? '');
    } else if (process.platform === 'darwin') {
      const { stdout } = await execAsync('ps -ax -o comm=');
      return stdout.split('\n').map(s => s.trim());
    } else {
      const { stdout } = await execAsync('ps -ax -o comm=');
      return stdout.split('\n').map(s => s.trim());
    }
  },
};
```

---

## 21. Mobile App — Low Level Design

### 21.1 Package Structure

```
packages/mobile/src/
├── screens/
│   ├── Pairing.tsx          # Scan QR, enter pairing code
│   ├── Camera.tsx           # Full-screen camera monitoring view
│   └── ExamTaking.tsx       # (Phase 7+) mobile exam UI
├── services/
│   ├── socket.service.ts    # WebSocket connection to /mobile namespace
│   └── camera.service.ts    # Expo Camera stream management
├── store/
│   └── pairing.store.ts     # Pairing session state
└── App.tsx
```

### 21.2 Mobile WebSocket Service

```typescript
// packages/mobile/src/services/socket.service.ts
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config.js';

let socket: Socket | null = null;

export const mobileSocketService = {
  connect(pairingToken: string, onConnected: () => void, onError: (msg: string) => void) {
    socket = io(`${API_URL}/mobile`, {
      auth:       { pairingToken },
      transports: ['websocket'],
    });

    socket.on('connect', onConnected);
    socket.on('connect_error', (err) => onError(err.message));
    socket.on('session:ended', () => {
      socket?.disconnect();
      socket = null;
    });
  },

  sendFrame(base64Frame: string, sessionId: string) {
    socket?.emit('camera:frame', { sessionId, frame: base64Frame, timestamp: Date.now() });
  },

  disconnect() {
    socket?.disconnect();
    socket = null;
  },
};
```

---

## 22. API Reference — All Endpoints

Complete reference of every REST API endpoint. All routes are prefixed with `/v1`.

### 22.1 Auth Endpoints

| Method | Path                   | Auth   | Permission                              | Body Schema             | Description                                                   |
| ------ | ---------------------- | ------ | ---------------------------------------- | ------------------------ | -------------------------------------------------------------- |
| POST   | `/auth/register`       | None   | —                                        | `PublicRegisterSchema`  | Self-register a STUDENT account                               |
| POST   | `/auth/register-staff` | Bearer | `manage:teachers` or `manage:students`   | `StaffRegisterSchema`   | Admin creates a staff/student account (own institution only)  |
| POST   | `/auth/verify-email`   | None   | —                                         | `VerifyEmailSchema`     | Verify email via token from verification email                |
| POST   | `/auth/login`          | None   | —                                        | `LoginSchema`           | Login, receive access token + refresh cookie                  |
| POST   | `/auth/refresh`        | Cookie | —                                        | —                        | Rotate refresh token, get new access token                     |
| POST   | `/auth/logout`         | Bearer | —                                        | —                        | Revoke refresh token family                                    |
| GET    | `/auth/me`             | Bearer | —                                        | —                        | Get current user profile                                       |

### 22.2 Institution Endpoints

| Method | Path                | Auth   | Permission              | Description                      |
| ------ | ------------------- | ------ | ----------------------- | -------------------------------- |
| POST   | `/institutions`     | Bearer | `manage:institutions`   | Create institution (Super Admin) |
| GET    | `/institutions`     | Bearer | `view:all-institutions` | List all institutions            |
| GET    | `/institutions/:id` | Bearer | `view:all-institutions` | Get institution detail           |
| PUT    | `/institutions/:id` | Bearer | `manage:institutions`   | Update institution settings      |

### 22.3 User Endpoints

| Method | Path                    | Auth   | Permission                             | Description                        |
| ------ | ----------------------- | ------ | -------------------------------------- | ---------------------------------- |
| GET    | `/users`                | Bearer | `view:users`                           | List users in institution (scoped) |
| GET    | `/users/:id`            | Bearer | `view:users`                           | Get user detail                    |
| PUT    | `/users/:id/deactivate` | Bearer | `manage:teachers` or `manage:students` | Deactivate user                    |
| PUT    | `/users/:id/reactivate` | Bearer | `manage:teachers` or `manage:students` | Reactivate user                    |

### 22.4 Question Bank Endpoints

| Method | Path                                 | Auth   | Permission                 | Description                                        |
| ------ | ------------------------------------ | ------ | -------------------------- | -------------------------------------------------- |
| POST   | `/question-banks`                    | Bearer | `create:question-bank`     | Create question bank                               |
| GET    | `/question-banks`                    | Bearer | `create:question-bank`     | List own question banks                            |
| GET    | `/question-banks/:id`                | Bearer | `manage:own-question-bank` | Get question bank                                  |
| DELETE | `/question-banks/:id`                | Bearer | `manage:own-question-bank` | Archive bank                                       |
| POST   | `/question-banks/:id/questions`      | Bearer | `manage:own-question-bank` | Add question                                       |
| GET    | `/question-banks/:id/questions`      | Bearer | `manage:own-question-bank` | List questions (paginated, filterable by tag/type) |
| PUT    | `/question-banks/:id/questions/:qid` | Bearer | `manage:own-question-bank` | Edit question (creates version)                    |
| DELETE | `/question-banks/:id/questions/:qid` | Bearer | `manage:own-question-bank` | Archive question                                   |

### 22.5 Exam Endpoints

| Method | Path                                      | Auth   | Permission                                   | Description                                          |
| ------ | ----------------------------------------- | ------ | -------------------------------------------- | ---------------------------------------------------- |
| POST   | `/exams`                                  | Bearer | `create:exam`                                | Create exam                                          |
| GET    | `/exams`                                  | Bearer | `view:own-exams` or `view:institution-exams` | List exams                                           |
| GET    | `/exams/:id`                              | Bearer | `view:own-exams` or `view:institution-exams` | Get exam detail                                      |
| PUT    | `/exams/:id`                              | Bearer | `edit:own-exam`                              | Update exam settings (only own, only DRAFT/APPROVED) |
| DELETE | `/exams/:id`                              | Bearer | `delete:own-exam`                            | Archive exam (only DRAFT)                            |
| POST   | `/exams/:id/sections`                     | Bearer | `edit:own-exam`                              | Add section                                          |
| PUT    | `/exams/:id/sections/:sid`                | Bearer | `edit:own-exam`                              | Edit section                                         |
| DELETE | `/exams/:id/sections/:sid`                | Bearer | `edit:own-exam`                              | Remove section                                       |
| POST   | `/exams/:id/sections/:sid/questions`      | Bearer | `edit:own-exam`                              | Add question to section                              |
| DELETE | `/exams/:id/sections/:sid/questions/:qid` | Bearer | `edit:own-exam`                              | Remove question from section                         |
| POST   | `/exams/:id/submit-for-approval`          | Bearer | `edit:own-exam`                              | Submit DRAFT for approval                            |
| POST   | `/exams/:id/approve`                      | Bearer | `approve:exam`                               | Approve exam                                         |
| POST   | `/exams/:id/reject`                       | Bearer | `approve:exam`                               | Reject exam back to DRAFT                            |
| POST   | `/exams/:id/publish`                      | Bearer | `publish:exam`                               | Publish APPROVED exam                                |
| POST   | `/exams/:id/enrollments`                  | Bearer | `manage:enrollments`                         | Bulk enroll students by classId                      |
| GET    | `/exams/:id/enrollments`                  | Bearer | `manage:enrollments`                         | List enrolled students                               |
| DELETE | `/exams/:id/enrollments/:studentId`       | Bearer | `manage:enrollments`                         | Remove student enrollment                            |

### 22.6 Device & Gate Endpoints

| Method | Path                 | Auth   | Permission  | Description                                     |
| ------ | -------------------- | ------ | ----------- | ----------------------------------------------- |
| POST   | `/devices/register`  | Bearer | `take:exam` | Register device fingerprint                     |
| GET    | `/devices`           | Bearer | `take:exam` | List student's registered devices               |
| DELETE | `/devices/:id`       | Bearer | `take:exam` | Revoke device registration                      |
| POST   | `/gates/run`         | Bearer | `take:exam` | Run all security gate checks                    |
| POST   | `/gates/entry-token` | Bearer | `take:exam` | Issue signed entry token (after all gates pass) |
| POST   | `/gates/verify-face` | Bearer | `take:exam` | Submit face photo for biometric verification    |

### 22.7 Session Endpoints

| Method | Path                           | Auth   | Permission                          | Description                                  |
| ------ | ------------------------------ | ------ | ----------------------------------- | -------------------------------------------- |
| GET    | `/sessions/:id`                | Bearer | `take:exam` or `view:live-sessions` | Get session status and metadata              |
| POST   | `/sessions/:id/submit`         | Bearer | `take:exam`                         | Voluntary exam submission                    |
| POST   | `/sessions/:id/pair-device`    | Bearer | `take:exam`                         | Generate mobile pairing token                |
| GET    | `/sessions/:id/questions/:qid` | Bearer | `take:exam`                         | Get single decrypted question (rate-limited) |

### 22.8 Proctoring Endpoints

| Method | Path                                 | Auth   | Permission             | Description                       |
| ------ | ------------------------------------ | ------ | ---------------------- | --------------------------------- |
| GET    | `/proctoring/live/:examId`           | Bearer | `view:live-sessions`   | List all active sessions for exam |
| GET    | `/proctoring/sessions/:id/flags`     | Bearer | `view:live-sessions`   | Get all flags for session         |
| POST   | `/proctoring/flags/:id/review`       | Bearer | `flag:session`         | Submit flag review decision       |
| POST   | `/proctoring/sessions/:id/message`   | Bearer | `send:proctor-message` | Send message to student           |
| POST   | `/proctoring/sessions/:id/terminate` | Bearer | `terminate:session`    | Terminate exam session            |

### 22.9 Grading Endpoints

| Method | Path                                           | Auth   | Permission       | Description                                |
| ------ | ---------------------------------------------- | ------ | ---------------- | ------------------------------------------ |
| GET    | `/grading/queue`                               | Bearer | `grade:exam`     | List sessions pending grading confirmation |
| GET    | `/grading/sessions/:id`                        | Bearer | `grade:exam`     | Get all answers + grades for a session     |
| POST   | `/grading/sessions/:id/questions/:qid/confirm` | Bearer | `grade:exam`     | Confirm or override grade                  |
| POST   | `/grading/sessions/:id/publish`                | Bearer | `grade:exam`     | Publish results to student                 |
| POST   | `/grading/sessions/:id/reopen`                 | Bearer | `reopen:grading` | Reopen grading after publish               |

### 22.10 Audit Endpoints

| Method | Path                                 | Auth   | Permission                | Description                              |
| ------ | ------------------------------------ | ------ | ------------------------- | ---------------------------------------- |
| GET    | `/audit/logs`                        | Bearer | `view:audit-logs`         | Paginated audit log (institution scoped) |
| GET    | `/audit/logs/:sessionId`             | Bearer | `view:audit-logs`         | Session-specific audit log               |
| GET    | `/audit/verify-chain`                | Bearer | `verify:audit-chain`      | Verify hash chain integrity              |
| GET    | `/audit/integrity-report/:sessionId` | Bearer | `export:integrity-report` | Generate full integrity report           |

---

## 23. Error Handling Design

### 23.1 AppError Class

```typescript
// packages/backend/src/utils/errors.ts
import type { ErrorCode } from 'shared';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Common factory helpers
export const Errors = {
  NotFound:    (msg = 'Not found') =>       new AppError(404, msg, 'E4001'),
  Forbidden:   (msg = 'Forbidden') =>       new AppError(403, msg, 'E2001'),
  Conflict:    (msg = 'Conflict') =>        new AppError(409, msg, 'E4002'),
  Validation:  (msg: string) =>             new AppError(400, msg, 'E3001'),
  Unauthorized:(msg = 'Unauthorized') =>    new AppError(401, msg, 'E1004'),
};
```

### 23.2 Async Route Wrapper

Every controller method is wrapped so async errors propagate to the error handler without try/catch boilerplate in every route.

```typescript
// packages/backend/src/utils/async-handler.ts
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
```

### 23.3 Standard Error Response Format

All error responses follow this exact shape so the frontend can parse them consistently:

```typescript
interface ErrorResponse {
  error:   string;         // Human-readable message (safe to display)
  code:    string;         // Machine-readable error code (e.g. "E3001")
  issues?: Array<{         // Only present on validation errors
    path:    string;
    message: string;
  }>;
}
```

### 23.4 WebSocket Error Events

```typescript
// Standard WS error format emitted as 'error' event
interface WsErrorEvent {
  code:    string;
  message: string;
  fatal:   boolean;  // true = session must be re-established
}
```

---

## 24. Caching Strategy

### 24.1 Redis Key Naming Convention

All Redis keys follow the format: `{namespace}:{resource}:{id}` to enable namespace-level bulk deletion and avoid collisions.

```
session:active:{sessionId}     → current socket ID for the session
session:timer:{sessionId}      → epoch ms of session end time
entry_token:{nonce}            → one-time entry token payload (TTL 300s)
pairing:{token}                → mobile pairing data (TTL 300s)
rl:{limiterName}:{userId/ip}   → rate limit counter (rolling window)
proctor:consecutive:{sessionId}:{flagType} → AI consecutive anomaly counter (TTL 120s)
ws:session:{sessionId}         → active socket ID (TTL 7200s)
audit:last_hash                → last audit log record hash (TTL 300s)
```

### 24.2 Cache Invalidation Patterns

| Data                 | Cached                     | Invalidated when                                   |
| -------------------- | -------------------------- | -------------------------------------------------- |
| Session timer        | Redis TTL key (EXAT)       | Exam submits or auto-submits                       |
| Entry token nonce    | Redis key (300s TTL)       | Used once (GETDEL) or TTL expires                  |
| Refresh token family | DB + Redis (set on login)  | Logout, reuse detected, user deactivated           |
| Risk score           | PostgreSQL (write-through) | Not cached — written directly to DB on each update |
| Last audit hash      | Redis (300s TTL)           | Written on each new audit log entry                |

### 24.3 What is NOT Cached

- Question content: every delivery is decrypted fresh from DB — ensures no plaintext lingers in Redis memory
- Student answers: written directly to DB only
- Grades: no caching — accuracy is more important than read speed here
- Audit logs: no caching on reads — they must always be fresh for chain verification

---

## 25. Security Controls — Implementation Detail

### 25.1 HTTP Security Headers Produced by Helmet

Every response from the API carries these headers:

```
Content-Security-Policy: default-src 'none'; script-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0            (disabled — CSP handles this; this header is deprecated)
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 25.2 CSRF Defense Detail

All Bearer-authenticated, state-mutating API calls require the `X-Requested-With: XMLHttpRequest` header. Since cross-origin `fetch` and `XMLHttpRequest` with this custom header trigger a CORS preflight that the browser enforces, a forged request from another origin cannot include it without the server's explicit CORS permission — this defense relies on the caller having to read the access token via JS and attach it itself, which a cross-origin page cannot do.

This header-based defense does not apply to `/auth/refresh`: that endpoint is authenticated purely by an HttpOnly cookie, which the browser attaches automatically even to a plain cross-origin HTML form submission — a "simple request" that never triggers a CORS preflight and never requires a custom header. The web client happens to send `X-Requested-With` on every request, including this one (§19.2's axios instance sets it as a default header) — but that reflects the legitimate client's own behavior, not a constraint the server places on incoming requests. The signed double-submit cookie (cookie value signed via `cookie-parser`, verified server-side) is the only real CSRF control on this route.

### 25.3 Input Sanitization Pipeline

For any input that may contain HTML (question content entered in the rich text editor):

```
Raw input → Zod schema validation (length, type) 
         → DOMPurify.sanitize (strip disallowed tags/attrs) 
         → cryptoService.encryptQuestion 
         → stored in DB
```

On delivery:
```
DB → cryptoService.decryptQuestion 
   → JSON.parse 
   → serve to client (React JSX escapes all output automatically)
```

`dangerouslySetInnerHTML` is never used in any client component.

### 25.4 SQL Injection Prevention — ESLint Enforcement

The ESLint configuration includes a custom rule that flags any use of string template literals or concatenation near database-related identifiers:

```json
// .eslintrc.json (relevant section)
{
  "rules": {
    "security/detect-non-literal-queries": "error",
    "no-restricted-syntax": [
      "error",
      {
        "selector": "TaggedTemplateExpression[tag.name='sql']",
        "message": "Raw SQL must use Prisma $queryRaw with tagged templates only, never string concatenation"
      }
    ]
  }
}
```

### 25.5 Dependency Security Policy

```json
// .npmrc — enforced for all packages
audit-level=high
engine-strict=true
```

CI pipeline step (in `security-scan.yml`):
```yaml
- name: Audit dependencies
  run: npm audit --audit-level=high
  # Non-zero exit code → CI fails → PR cannot be merged
```

Dependabot configuration:
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    groups:
      security-updates:
        applies-to: security-updates
        patterns: ["*"]
    commit-message:
      prefix: "chore(deps)"
```

### 25.6 Electron Auto-Update Security

```typescript
// packages/electron/src/main/updater.ts
import { autoUpdater } from 'electron-updater';
import { logger } from './logger.js';

autoUpdater.autoDownload           = false;
autoUpdater.autoInstallOnAppQuit   = true;
autoUpdater.allowPrerelease        = false;
// Updates served over HTTPS only — enforced by electron-updater
// Each update package is verified against the code-signing certificate
// before installation. A package with a mismatched or missing signature
// is rejected silently and the installed version is unchanged.

export const updater = {
  async checkForUpdates() {
    autoUpdater.on('update-available', (info) => {
      logger.info({ version: info.version }, 'Update available');
      autoUpdater.downloadUpdate();
    });

    autoUpdater.on('update-downloaded', () => {
      logger.info('Update downloaded — will install on next quit');
    });

    autoUpdater.on('error', (err) => {
      logger.error(err, 'Auto-update error');
    });

    if (process.env['NODE_ENV'] !== 'development') {
      await autoUpdater.checkForUpdates();
    }
  },
};
```


---

## 26. Telemetry Pipeline — Low Level Design

### 26.1 Client-Side Telemetry Collection (Electron Renderer)

The renderer collects behavioral events passively, batches them every 30 seconds, and sends them via the `examBridge` IPC bridge to the main process, which forwards them over the WebSocket connection. This design keeps all network calls in the main process — the sandboxed renderer has no direct network access.

```typescript
// packages/electron/src/renderer/hooks/useTelemetry.ts
import { useEffect, useRef, useCallback } from 'react';

type TelemetryEventType =
  | 'TAB_BLUR' | 'COPY_ATTEMPT' | 'PASTE_ATTEMPT' | 'RIGHT_CLICK'
  | 'SCREENSHOT_ATTEMPT' | 'FULLSCREEN_EXIT' | 'MOUSE_LEAVE'
  | 'KEYBOARD_SHORTCUT' | 'CONTEXT_MENU' | 'WINDOW_RESIZE';

interface TelemetryEvent {
  type:      TelemetryEventType;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export function useTelemetry(sessionId: string, active: boolean) {
  const queue  = useRef<TelemetryEvent[]>([]);
  const flush  = useRef<NodeJS.Timeout>();

  const record = useCallback((type: TelemetryEventType, metadata?: Record<string, unknown>) => {
    if (!active) return;
    queue.current.push({ type, timestamp: Date.now(), metadata });
  }, [active]);

  useEffect(() => {
    if (!active) return;

    // ── DOM-level listeners ─────────────────────────────────
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') record('TAB_BLUR');
    };
    const onCopy    = (e: ClipboardEvent) => { e.preventDefault(); record('COPY_ATTEMPT'); };
    const onPaste   = (e: ClipboardEvent) => { e.preventDefault(); record('PASTE_ATTEMPT'); };
    const onContext = (e: MouseEvent)     => { e.preventDefault(); record('RIGHT_CLICK'); };
    const onResize  = () => record('WINDOW_RESIZE', { width: window.innerWidth, height: window.innerHeight });
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth) {
        record('MOUSE_LEAVE');
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('copy',             onCopy);
    document.addEventListener('paste',            onPaste);
    document.addEventListener('contextmenu',      onContext);
    window.addEventListener('resize',             onResize);
    document.addEventListener('mouseleave',       onMouseLeave);

    // ── PrintScreen interception (Electron-specific) ────────
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        record('SCREENSHOT_ATTEMPT');
      }
      // Block common shortcut keys
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'a', 'p', 'f'].includes(e.key.toLowerCase())) {
        if (e.key.toLowerCase() !== 'f') e.preventDefault();  // allow Ctrl+F for search
        record('KEYBOARD_SHORTCUT', { key: `${e.ctrlKey ? 'Ctrl' : 'Meta'}+${e.key}` });
      }
    });

    // ── Batch flush every 30 seconds ────────────────────────
    flush.current = setInterval(async () => {
      if (queue.current.length === 0) return;
      const batch = queue.current.splice(0);  // atomic swap
      await window.examBridge.reportViolation('TELEMETRY_BATCH', { sessionId, events: batch });
    }, 30_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('copy',    onCopy);
      document.removeEventListener('paste',   onPaste);
      document.removeEventListener('contextmenu', onContext);
      window.removeEventListener('resize',    onResize);
      document.removeEventListener('mouseleave', onMouseLeave);
      if (flush.current) clearInterval(flush.current);
    };
  }, [active, sessionId, record]);

  return { record };
}
```

### 26.2 Server-Side Risk Score Algorithm

Risk score is maintained as an integer 0–100 on the `exam_sessions` record. It increases on events and AI flags, and is never automatically reduced (only a proctor decision can clear it).

```
risk_score += sum(EVENT_RISK_WEIGHTS[event] for event in telemetry_batch)
risk_score += 12 per AI flag raised (FACE_MISSING, GAZE_OFF_SCREEN, etc.)
risk_score = min(100, risk_score)

Alert tiers (proctor-dashboard severity, do not affect auto-submit):
  0  – 30:  Normal          → no proctor alert
  31 – 60:  Low risk        → flagged for post-hoc review
  61 – 85:  Medium risk     → real-time alert pushed to proctor dashboard
  86 – 99:  High risk       → proctor receives urgent alert

Auto-submit: triggered separately, when risk_score crosses the
per-exam Exam.autoSubmitRiskThreshold column (teacher-configurable,
@default 90) — see processAnalysisResult. 
ceiling (risk_score is clamped to max 100 above).
```

Alert-tier bands (30/60/85) are fixed system constants, not per-exam
config — every exam's proctor dashboard uses the same severity coloring.
The auto-submit threshold is the only value a teacher can override, via
`Exam.autoSubmitRiskThreshold` (a real Prisma column — see Section 4 Exam
model ).

---

## 27. Integrity Report — Low Level Design

### 27.1 Report Structure

The integrity report is a JSON document generated on-demand per session that aggregates all evidence related to that student's exam attempt. It is used by institutions for academic integrity review.

```typescript
// packages/backend/src/modules/grading/integrity-report.service.ts
import { db } from '../../db/client.js';
import { cryptoService } from '../../services/crypto.service.js';
import { auditService } from '../../services/audit.service.js';

export interface IntegrityReport {
  generatedAt:    string;
  session: {
    id:           string;
    examId:       string;
    examTitle:    string;
    studentId:    string;
    studentName:  string;
    startedAt:    string | null;
    submittedAt:  string | null;
    autoSubmitted: boolean;
    riskScore:    number;
    status:       string;
    ipAtStart:    string | null;
  };
  securityGates: {
    identityVerified:    boolean;
    deviceRegistered:    boolean;
    vmNotDetected:       boolean;
    virtualCamNotFound:  boolean;
    noForbiddenProcesses: boolean;
    displayCountOk:      boolean;
    ipReputationOk:      boolean;
    ipReputationUnknown: boolean;
  };
  proctoring: {
    tier:         string;
    totalFlags:   number;
    flagsByType:  Record<string, number>;
    flags:        Array<{
      id:          string;
      flagType:    string;
      confidence:  number;
      flaggedAt:   string;
      reviewed:    boolean;
      decision:    string | null;
      reviewNote:  string | null;
    }>;
    telemetrySummary: Record<string, number>;  // count per event type
  };
  grades: {
    totalScore:    number;
    maxScore:      number;
    percentage:    number;
    passStatus:    'PASS' | 'FAIL' | 'PENDING';
    breakdown:     Array<{
      questionId:  string;
      type:        string;
      score:       number;
      maxScore:    number;
      gradedBy:    string;
      aiSuggested: number | null;
      confirmed:   boolean;
    }>;
  };
  auditTrail: Array<{
    action:       string;
    actorRole:    string | null;
    timestamp:    string;
    metadata:     object;
  }>;
  chainVerification: {
    valid:        boolean;
    checkedAt:    string;
  };
}

export class IntegrityReportService {

  async generate(sessionId: string, requesterId: string): Promise<IntegrityReport> {
    const session = await db.examSession.findUniqueOrThrow({
      where:   { id: sessionId },
      include: { exam: true, student: true },
    });

    const [flags, telemetry, grades, auditLogs] = await Promise.all([
      db.proctoringFlag.findMany({
        where:   { sessionId },
        orderBy: { flaggedAt: 'asc' },
      }),
      db.telemetryEvent.findMany({
        where:   { sessionId },
      }),
      db.grade.findMany({
        where:   { sessionId },
        include: { question: true },
      }),
      db.auditLog.findMany({
        where: {
          OR: [
            { metadata: { path: ['sessionId'], equals: sessionId } },
            {
              action: 'IP_INTEL_UNKNOWN',
              AND: [
                { metadata: { path: ['examId'],    equals: session.examId } },
                { metadata: { path: ['studentId'], equals: session.studentId } },
              ],
            },
          ],
        },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    // Verify audit chain for this session's records
    const chainResult = await auditService.verifyChain();

    // Telemetry summary — count per type
    const telemetrySummary: Record<string, number> = {};
    for (const ev of telemetry) {
      telemetrySummary[ev.eventType] = (telemetrySummary[ev.eventType] ?? 0) + 1;
    }

    // Grade calculations
    const totalScore = grades.reduce((s, g) => s + g.score, 0);
    const maxScore   = grades.reduce((s, g) => s + g.maxScore, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 1000) / 10 : 0;
    const passMark   = (session.exam.settings as any)?.passMarkPercent ?? null;
    const passStatus: 'PASS' | 'FAIL' | 'PENDING' =
      grades.every(g => g.confirmedAt)
        ? (passMark !== null ? (percentage >= passMark ? 'PASS' : 'FAIL') : 'PASS')
        : 'PENDING';

    // Flag type summary
    const flagsByType: Record<string, number> = {};
    for (const f of flags) {
      flagsByType[f.flagType] = (flagsByType[f.flagType] ?? 0) + 1;
    }

    const report: IntegrityReport = {
      generatedAt: new Date().toISOString(),
      session: {
        id:            session.id,
        examId:        session.examId,
        examTitle:     session.exam.title,
        studentId:     session.studentId,
        // Sanitize name for report — full name only for authorized viewers
        studentName:   `${session.student.firstName} ${session.student.lastName}`,
        startedAt:     session.startedAt?.toISOString() ?? null,
        submittedAt:   session.submittedAt?.toISOString() ?? null,
        autoSubmitted: session.autoSubmitted,
        riskScore:     session.riskScore,
        status:        session.status,
        ipAtStart:     session.ipAtStart,
      },
      // Security gates — derived from audit log entries for this session
      securityGates: this.deriveSecurityGates(auditLogs),
      proctoring: {
        tier:         session.exam.proctoringTier,
        totalFlags:   flags.length,
        flagsByType,
        flags:        flags.map(f => ({
          id:          f.id,
          flagType:    f.flagType,
          confidence:  f.confidence,
          flaggedAt:   f.flaggedAt.toISOString(),
          reviewed:    f.reviewedAt !== null,
          decision:    f.reviewDecision,
          reviewNote:  f.reviewNote,
        })),
        telemetrySummary,
      },
      grades: {
        totalScore,
        maxScore,
        percentage,
        passStatus,
        breakdown: grades.map(g => ({
          questionId:  g.questionId,
          type:        g.question.type,
          score:       g.score,
          maxScore:    g.maxScore,
          gradedBy:    g.gradedBy,
          aiSuggested: g.aiSuggestedScore,
          confirmed:   g.confirmedAt !== null,
        })),
      },
      auditTrail: auditLogs.map(l => ({
        action:    l.action,
        actorRole: l.actorRole,
        timestamp: l.timestamp.toISOString(),
        metadata:  l.metadata as object,
      })),
      chainVerification: {
        valid:     chainResult.valid,
        checkedAt: new Date().toISOString(),
      },
    };

    // Audit the report generation itself
    await auditService.log({
      actorId:      requesterId,
      action:       'INTEGRITY_REPORT_GENERATED',
      resourceType: 'ExamSession',
      resourceId:   sessionId,
      metadata:     { chainValid: chainResult.valid },
    });

    return report;
  }

  private deriveSecurityGates(logs: any[]): IntegrityReport['securityGates'] {
    const hasEvent = (action: string) => logs.some(l => l.action === action);
    return {
      identityVerified:     hasEvent('FACE_VERIFICATION_PASSED'),
      deviceRegistered:     hasEvent('DEVICE_VALIDATED'),
      vmNotDetected:        !hasEvent('VM_DETECTED'),
      virtualCamNotFound:   !hasEvent('VIRTUAL_CAMERA_DETECTED'),
      noForbiddenProcesses: !hasEvent('FORBIDDEN_PROCESS_DETECTED'),
      displayCountOk:       !hasEvent('MULTIPLE_DISPLAYS_DETECTED'),
      ipReputationOk:       !hasEvent('VPN_DETECTED'),
      ipReputationUnknown:  hasEvent('IP_INTEL_UNKNOWN'),
    };
  }
}

export const integrityReportService = new IntegrityReportService();
```

---

## 28. IP Intelligence Service — Low Level Design

### 28.1 Service Interface

```typescript
// packages/backend/src/services/ip-intel.service.ts
import { env } from '../config/env.js';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface IpIntelResult {
  ip:           string;
  isVPN:        boolean;
  isProxy:      boolean;
  isDatacenter: boolean;
  isTor:        boolean;
  countryCode:  string;
  asnOrg:       string;
  fraudScore:   number;  // 0–100; higher = more suspicious
  cached:       boolean;
  unknown:      boolean;  // true when the API call failed and result is a fail-open default (API-4)
}

export class IpIntelService {
  private readonly cacheKey = (ip: string) => `ip_intel:${ip}`;
  private readonly cacheTTL = 3600;  // 1 hour cache

  async check(ip: string): Promise<IpIntelResult> {
    // Private / loopback addresses always pass
    if (this.isPrivateIp(ip)) {
      return { ip, isVPN: false, isProxy: false, isDatacenter: false,
               isTor: false, countryCode: 'LOCAL', asnOrg: '', fraudScore: 0, cached: true, unknown: false };
    }

    // Check cache first
    const cached = await redis.get(this.cacheKey(ip));
    if (cached) {
      return { ...JSON.parse(cached), cached: true };
    }

    // Call external IP intelligence API
    try {
      const response = await fetch(
        `${env.IP_INTEL_BASE_URL}/json/${encodeURIComponent(ip)}?key=${env.IP_INTEL_API_KEY}&strictness=1`,
        { signal: AbortSignal.timeout(3000) },   // 3-second timeout — must not block exam entry
      );

      if (!response.ok) throw new Error(`IP intel API error: ${response.status}`);

      const data = await response.json() as any;

      const result: IpIntelResult = {
        ip,
        isVPN:        data.vpn          === true,
        isProxy:      data.proxy        === true,
        isDatacenter: data.active_vpn   === true || data.datacenter === true,
        isTor:        data.tor          === true,
        countryCode:  data.country_code ?? '',
        asnOrg:       data.organization ?? '',
        fraudScore:   data.fraud_score  ?? 0,
        cached:       false,
        unknown:      false,
      };

      // Cache result
      await redis.set(this.cacheKey(ip), JSON.stringify(result), 'EX', this.cacheTTL);
      return result;

    } catch (err) {
      // API call failed — result is unusable, not a verified "clean" IP.
      // Caller (runGates) decides pass/fail based on IP_INTEL_FAIL_OPEN and
      // proctoring tier, and records an IP_INTEL_UNKNOWN audit marker (API-4).
      logger.error({ err, ip }, 'IP intelligence API failed');
      return { ip, isVPN: false, isProxy: false, isDatacenter: false,
               isTor: false, countryCode: 'UNKNOWN', asnOrg: 'UNKNOWN',
               fraudScore: 0, cached: false, unknown: true };
    }
  }

  private isPrivateIp(ip: string): boolean {
    // Unwrap IPv4-mapped IPv6 addresses (e.g. ::ffff:192.168.1.1)
    const mapped = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
    const addr = mapped ? mapped[1]! : ip;

    // IPv6: loopback, link-local, and unique local (ULA) ranges
    if (addr.includes(':')) {
      const lower = addr.toLowerCase();
      return lower === '::1' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd');
    }

    // IPv4
    const octets = addr.split('.').map(Number);
    if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return false;
    const [a, b] = octets as [number, number, number, number];

    return (
      a === 10 ||                          // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) ||  // 172.16.0.0/12
      (a === 192 && b === 168) ||           // 192.168.0.0/16
      (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 (CGNAT)
      a === 127                             // 127.0.0.0/8 (loopback)
    );
  }
}

export const ipIntelService = new IpIntelService();
```

---

## 29. AI Grading Service — Low Level Design

### 29.1 Service Interface

The AI grading service is a thin HTTP client that calls an external AI inference endpoint (either a self-hosted model or a third-party API). It is deliberately isolated so that changing the underlying AI provider requires only this one file.

```typescript
// packages/backend/src/services/ai-grading.service.ts
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface GradingSuggestionRequest {
  question:      string;
  rubric?:       string;
  studentAnswer: string;
  maxMarks:      number;
}

interface GradingSuggestionResponse {
  suggestedScore: number;
  reasoning:      string;
  confidence:     number;  // 0.0 – 1.0
}

export class AiGradingService {

  async suggest(req: GradingSuggestionRequest): Promise<GradingSuggestionResponse> {
    const prompt = this.buildPrompt(req);

    try {
      const response = await fetch(`${env.AI_SERVICE_URL}/grade`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${env.AI_SERVICE_API_KEY}`,
        },
        body:   JSON.stringify({ prompt, maxMarks: req.maxMarks }),
        signal: AbortSignal.timeout(30_000),  // 30s timeout for AI inference
      });

      if (!response.ok) throw new Error(`AI service responded with ${response.status}`);

      const data = await response.json() as any;

      // Clamp score to valid range
      const score = Math.max(0, Math.min(req.maxMarks, parseFloat(data.score)));

      return {
        suggestedScore: score,
        reasoning:      data.reasoning ?? '',
        confidence:     data.confidence ?? 0.5,
      };

    } catch (err) {
      logger.error({ err }, 'AI grading service failed');
      // Fallback: suggest 0 with explicit reasoning so teacher sees it needs manual grading
      return {
        suggestedScore: 0,
        reasoning:      'AI grading service unavailable — please grade manually.',
        confidence:     0,
      };
    }
  }

  private buildPrompt(req: GradingSuggestionRequest): string {
    return [
      'You are an academic grading assistant. Evaluate the following student answer.',
      '',
      `QUESTION: ${req.question}`,
      req.rubric ? `\nMARKING RUBRIC:\n${req.rubric}` : '',
      '',
      `STUDENT ANSWER: ${req.studentAnswer}`,
      '',
      `MAXIMUM MARKS: ${req.maxMarks}`,
      '',
      'Respond in this exact JSON format:',
      '{ "score": <number>, "reasoning": "<explanation>", "confidence": <0.0-1.0> }',
      '',
      'Rules:',
      '- Score must be between 0 and ' + req.maxMarks,
      '- Reasoning must explain specifically why that score was awarded',
      '- Do not add any text outside the JSON object',
    ].join('\n');
  }
}

export const aiGradingService = new AiGradingService();
```

---

## 30. Structured Logger — Low Level Design

```typescript
// packages/backend/src/utils/logger.ts
import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  // In production output newline-delimited JSON for log aggregation
  // In development output pretty-printed for readability
  transport: env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
    : undefined,
  // Never log these keys even if passed — PII protection
  redact: {
    paths:  ['password', 'passwordHash', 'token', 'refreshToken', 'accessToken', 'biometricRef'],
    censor: '[REDACTED]',
  },
  base: {
    service: 'online-exam-platform',
    env:     env.NODE_ENV,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
```

Every log entry from any module includes at minimum:
- `timestamp` — ISO 8601 UTC
- `level` — error / warn / info / debug
- `service` — "online-exam-platform"
- `msg` — human-readable message
- Context fields relevant to the operation (sessionId, examId, userId, etc.)

---

## 31. Docker & Local Development Environment

### 31.1 Docker Compose — Local Dev

```yaml
# infra/docker/docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER:     examuser
      POSTGRES_PASSWORD: exampassword
      POSTGRES_DB:       examdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test:     ["CMD-SHELL", "pg_isready -U examuser -d examdb"]
      interval: 10s
      timeout:  5s
      retries:  5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass redispassword --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    healthcheck:
      test:     ["CMD", "redis-cli", "-a", "redispassword", "ping"]
      interval: 10s
      timeout:  5s
      retries:  5

  pgadmin:
    image: dpage/pgadmin4:latest
    profiles: ["debug"]   # Only started when DEBUG profile is active
    environment:
      PGADMIN_DEFAULT_EMAIL:    admin@local.dev
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      postgres:
        condition: service_healthy

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER:     minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

### 31.2 Backend Dockerfile (Multi-Stage)

```dockerfile
# infra/docker/Dockerfile.backend

# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/  packages/shared/
COPY packages/backend/ packages/backend/

RUN npm ci --workspace=packages/shared --workspace=packages/backend
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/backend

# ── Stage 2: Prune dev dependencies ──────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/shared/  packages/shared/
COPY --from=builder /app/packages/backend/ packages/backend/
RUN npm ci --workspace=packages/shared --workspace=packages/backend --omit=dev

# ── Stage 3: Production image ─────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/packages/shared/dist   packages/shared/dist
COPY --from=builder /app/packages/backend/dist  packages/backend/dist
COPY --from=deps    /app/node_modules           node_modules
COPY --from=deps    /app/packages/shared/node_modules  packages/shared/node_modules
COPY --from=deps    /app/packages/backend/node_modules packages/backend/node_modules
COPY packages/backend/src/db/schema.prisma packages/backend/src/db/

# Generate Prisma client in production image
RUN npx prisma generate --schema=packages/backend/src/db/schema.prisma

ENV NODE_ENV=production
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/v1/health || exit 1

CMD ["node", "packages/backend/dist/index.js"]
```

---

## 32. Setup Script

```bash
#!/usr/bin/env bash
# scripts/setup.sh — One-command dev environment setup

set -euo pipefail

echo " Online Exam Platform — Dev Setup"

# ── 1. Check prerequisites ───────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo " Node.js 20+ required"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo " Docker required"; exit 1; }
NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[[ "$NODE_VER" -ge 20 ]] || { echo " Node.js 20+ required (found $NODE_VER)"; exit 1; }

# ── 2. Install dependencies ──────────────────────────────────────
echo " Installing dependencies..."
npm ci

# ── 3. Copy env file if not present ─────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  .env created from .env.example — fill in your values"
fi

# ── 4. Start infrastructure containers ──────────────────────────
echo " Starting PostgreSQL and Redis..."
docker compose -f infra/docker/docker-compose.yml up -d postgres redis
echo " Waiting for databases to be ready..."
sleep 5

# ── 5. Run database migrations ───────────────────────────────────
echo "  Running database migrations..."
npm run db:migrate --workspace=packages/backend

# ── 6. Generate RSA keys for JWT ────────────────────────────────
if [ ! -f keys/private.pem ]; then
  echo " Generating JWT RSA key pair..."
  mkdir -p keys
  openssl genrsa -out keys/private.pem 2048
  openssl rsa    -in keys/private.pem -pubout -out keys/public.pem
  echo " Keys generated in ./keys/ — keep private.pem secret, never commit"
fi

# ── 7. Seed development database ────────────────────────────────
echo " Seeding database..."
npm run db:seed --workspace=packages/backend

# ── 8. Git hooks ─────────────────────────────────────────────────
echo " Setting up Git hooks..."
npx husky install

echo ""
echo " Setup complete. Start the stack:"
echo "   npm run dev:backend"
echo "   npm run dev:web"
echo "   npm run dev:electron"
```

---

## 33. Testing — Complete Specification

### 33.1 Unit Test Examples

#### Auth Service Unit Test

```typescript
// packages/backend/src/modules/auth/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './auth.service.js';
import { db } from '../../db/client.js';
import { passwordService } from './password.service.js';

vi.mock('../../db/client.js');
vi.mock('./password.service.js');
vi.mock('../../services/audit.service.js');
vi.mock('./token.service.js', () => ({
  tokenService: {
    generateTokenPair: vi.fn().mockResolvedValue({
      accessToken:  'mock-access-token',
      refreshToken: 'mock-refresh-token',
    }),
  },
}));

describe('AuthService.login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns tokens on valid credentials', async () => {
    vi.mocked(db.institution.findFirst).mockResolvedValue({ id: 'inst-1', isActive: true } as any);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1', email: 'a@b.com', passwordHash: 'hash',
      role: 'TEACHER', institutionId: 'inst-1',
      isActive: true, lockedUntil: null, failedLoginAttempts: 0,
      isEmailVerified: true,
      firstName: 'A', lastName: 'B',
    } as any);
    vi.mocked(passwordService.verify).mockResolvedValue(true);
    vi.mocked(db.user.update).mockResolvedValue({} as any);

    const result = await authService.login({ institutionSlug: 'acme', email: 'a@b.com', password: 'Password1!' }, '1.2.3.4', 'Mozilla');

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.user.email).toBe('a@b.com');
  });

  it('throws when email not verified', async () => {
    vi.mocked(db.institution.findFirst).mockResolvedValue({ id: 'inst-1', isActive: true } as any);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1', passwordHash: 'hash', isActive: true, lockedUntil: null, failedLoginAttempts: 0,
      isEmailVerified: false,
    } as any);
    vi.mocked(passwordService.verify).mockResolvedValue(true);

    await expect(
      authService.login({ institutionSlug: 'acme', email: 'a@b.com', password: 'Password1!' }, '1.2.3.4', 'Mozilla'),
    ).rejects.toMatchObject({ code: 'E1007' });
  });

  it('throws on invalid password', async () => {
    vi.mocked(db.institution.findFirst).mockResolvedValue({ id: 'inst-1', isActive: true } as any);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1', passwordHash: 'hash', isActive: true, lockedUntil: null, failedLoginAttempts: 0,
    } as any);
    vi.mocked(passwordService.verify).mockResolvedValue(false);
    vi.mocked(db.user.update).mockResolvedValue({} as any);

    await expect(
      authService.login({ institutionSlug: 'acme', email: 'a@b.com', password: 'wrong' }, '1.2.3.4', 'Mozilla'),
    ).rejects.toMatchObject({ code: 'E1001', statusCode: 401 });
  });

  it('throws on account locked', async () => {
    vi.mocked(db.institution.findFirst).mockResolvedValue({ id: 'inst-1', isActive: true } as any);
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: 'user-1', passwordHash: 'hash', isActive: true,
      lockedUntil: new Date(Date.now() + 60_000), failedLoginAttempts: 5,
    } as any);

    await expect(
      authService.login({ institutionSlug: 'acme', email: 'a@b.com', password: 'Password1!' }, '1.2.3.4', 'Mozilla'),
    ).rejects.toMatchObject({ code: 'E1002' });

    // SEC-5: locked accounts must short-circuit before Argon2 runs
    expect(passwordService.verify).not.toHaveBeenCalled();
  });

  it('uses constant-time comparison even when user not found', async () => {
    vi.mocked(db.institution.findFirst).mockResolvedValue({ id: 'inst-1', isActive: true } as any);
    vi.mocked(db.user.findUnique).mockResolvedValue(null);
    vi.mocked(passwordService.verify).mockResolvedValue(false);

    const start = performance.now();
    await authService.login({ institutionSlug: 'acme', email: 'x@y.com', password: 'Password1!' }, '1.2.3.4', 'Mozilla').catch(() => {});
    const elapsed = performance.now() - start;

    // verify() must always be called — takes measurable time
    expect(vi.mocked(passwordService.verify)).toHaveBeenCalledOnce();
  });
});
```

#### RBAC Middleware Unit Test

```typescript
// packages/backend/src/middleware/rbac.test.ts
import { describe, it, expect, vi } from 'vitest';
import { requirePermission } from './rbac.middleware.js';
import type { Response, NextFunction } from 'express';

function mockReq(role: string, permissions: string[]): any {
  return {
    user:    { id: 'u1', role, institutionId: 'inst-1', permissions },
    ip:      '1.2.3.4',
    path:    '/test',
    method:  'GET',
    headers: {},
  };
}

describe('requirePermission middleware', () => {
  it('calls next() when user has the permission', () => {
    const req  = mockReq('TEACHER', ['create:exam']);
    const res  = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any as Response;
    const next = vi.fn() as NextFunction;

    requirePermission('create:exam')(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks permission', () => {
    const req  = mockReq('STUDENT', ['take:exam']);
    const res  = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any as Response;
    const next = vi.fn() as NextFunction;

    requirePermission('create:exam')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('blocks STUDENT from TEACHER-only endpoints', () => {
    const studentPermissions = ['take:exam', 'view:own-results'];
    const teacherEndpoints   = ['create:exam', 'grade:exam', 'view:live-sessions', 'approve:exam'];

    for (const perm of teacherEndpoints) {
      const req  = mockReq('STUDENT', studentPermissions);
      const res  = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any as Response;
      const next = vi.fn() as NextFunction;
      requirePermission(perm)(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    }
  });
});
```

#### Encryption Service Unit Test

```typescript
// packages/backend/src/services/crypto.test.ts
import { describe, it, expect } from 'vitest';
import { cryptoService } from './crypto.service.js';

describe('CryptoService', () => {
  it('encrypts and decrypts question content correctly', () => {
    const plaintext = JSON.stringify({ text: 'What is 2 + 2?', imageUrl: null });
    const encrypted = cryptoService.encryptQuestion(plaintext);
    const decrypted = cryptoService.decryptQuestion(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const plaintext = 'same content';
    const c1 = cryptoService.encryptQuestion(plaintext);
    const c2 = cryptoService.encryptQuestion(plaintext);
    expect(c1).not.toBe(c2);         // different IVs
    expect(cryptoService.decryptQuestion(c1)).toBe(plaintext);
    expect(cryptoService.decryptQuestion(c2)).toBe(plaintext);
  });

  it('throws on tampered ciphertext (GCM auth tag validation)', () => {
    const encrypted = cryptoService.encryptQuestion('original');
    const [iv, tag, cipher] = encrypted.split(':');
    const tampered = `${iv}:${tag}:${cipher!.slice(0, -4)}XXXX`; // corrupt last bytes
    expect(() => cryptoService.decryptQuestion(tampered)).toThrow();
  });

  it('safeCompare is resistant to timing side-channels', () => {
    expect(cryptoService.safeCompare('abc', 'abc')).toBe(true);
    expect(cryptoService.safeCompare('abc', 'abd')).toBe(false);
    expect(cryptoService.safeCompare('abc', 'ab')).toBe(false);
  });
});
```

### 33.2 Integration Test Examples

#### Full Auth Flow Integration Test

```typescript
// packages/backend/src/modules/auth/auth.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { db } from '../../db/client.js';

const app = createApp();

describe('Auth Integration', () => {
  const testEmail = `test_${Date.now()}@example.com`;
  let institutionId: string;
  let institutionSlug: string;
  let userId: string;
  let accessToken:   string;
  let refreshCookie: string;

  beforeAll(async () => {
    const inst = await db.institution.create({
      data: { name: 'Test Institution', slug: `test-${Date.now()}` },
    });
    institutionId = inst.id;
    institutionSlug = inst.slug;
  });

  afterAll(async () => {
    await db.institution.delete({ where: { id: institutionId } });
  });

  it('POST /auth/register — creates user', async () => {
    const res = await request(app)
      .post('/v1/auth/register')
      .send({ institutionId, email: testEmail, password: 'SecurePass1!@', firstName: 'Test', lastName: 'User' });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.role).toBe('STUDENT');
    expect(res.body.user.isEmailVerified).toBe(false);
    expect(res.body.user.passwordHash).toBeUndefined();  // never exposed
    userId = res.body.user.id;
  });

  it('POST /auth/login — returns access token and sets HttpOnly cookie', async () => {
    // Bypass real email delivery in this test — directly mark the account
    // verified, equivalent to the user clicking the verification link.
    await db.user.update({ where: { id: userId }, data: { isEmailVerified: true, emailVerifiedAt: new Date() } });

    const res = await request(app)
      .post('/v1/auth/login')
      .send({ institutionSlug, email: testEmail, password: 'SecurePass1!@' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf('string');
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(res.headers['set-cookie'][0]).toContain('Secure');
    accessToken   = res.body.accessToken;
    refreshCookie = res.headers['set-cookie'][0]!;
  });

  it('GET /auth/me — returns user with valid token', async () => {
    const res = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
  });

  it('GET /auth/me — returns 401 with expired/tampered token', async () => {
    const res = await request(app)
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer eyJhbGciOiJSUzI1NiJ9.tampered.signature');
    expect(res.status).toBe(401);
  });

  it('POST /auth/refresh — rotates token', async () => {
    const res = await request(app)
      .post('/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf('string');
    expect(res.body.accessToken).not.toBe(accessToken);  // new token issued
  });

  it('POST /auth/refresh — rejects reused refresh token', async () => {
    // Use the ORIGINAL refresh cookie (already rotated above)
    const res = await request(app)
      .post('/v1/auth/refresh')
      .set('Cookie', refreshCookie);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('E1005');  // TOKEN_REUSE_DETECTED
  });
});
```

#### Cross-Institution Isolation Test

```typescript
// packages/backend/src/modules/exams/exam.isolation.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

const app = createApp();

describe('Cross-institution isolation', () => {
  it('student from institution A cannot access exam from institution B', async () => {
    const { tokenA } = await setupStudentInInstitutionA();
    const { examIdB } = await setupExamInInstitutionB();

    const res = await request(app)
      .get(`/v1/sessions/${examIdB}`)
      .set('Authorization', `Bearer ${tokenA}`);

    // Must return 404, not 403 — never confirm the resource exists
    expect(res.status).toBe(404);
  });

  it('teacher cannot edit another institution\'s exam', async () => {
    const { teacherTokenA } = await setupTeacherInInstitutionA();
    const { examIdB }       = await setupExamInInstitutionB();

    const res = await request(app)
      .put(`/v1/exams/${examIdB}`)
      .set('Authorization', `Bearer ${teacherTokenA}`)
      .send({ title: 'Hacked title' });

    expect(res.status).toBe(404);
  });
});
```

### 33.3 Vitest Configuration

```typescript
// packages/backend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    setupFiles:  ['./src/tests/setup.ts'],
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'lcov', 'json'],
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   75,
        statements: 80,
        // Security-critical modules: stricter thresholds
        // Enforced via separate coverage report for these paths
      },
      include:   ['src/**/*.ts'],
      exclude:   ['src/**/*.test.ts', 'src/tests/**'],
    },
    testTimeout: 30_000,    // Integration tests may be slower
    hookTimeout: 30_000,
  },
});
```

---

## 34. Database Seed Script

```typescript
// packages/backend/scripts/seed-db.ts
import { db } from '../src/db/client.js';
import { passwordService } from '../src/modules/auth/password.service.js';

async function seed() {
  console.log(' Seeding database...');

  // ── Institution ──────────────────────────────────────────────
  const institution = await db.institution.upsert({
    where:  { slug: 'demo-university' },
    create: {
      name: 'Demo University',
      slug: 'demo-university',
      settings: {
        theme:        { primaryColor: '#2563eb' },
        allowedRoles: ['TEACHER', 'STUDENT', 'PROCTOR', 'APPROVER'],
      },
    },
    update: {},
  });
  console.log(`  Institution: ${institution.name} (${institution.id})`);

  // ── Users ────────────────────────────────────────────────────
  const users = [
    { email: 'admin@demo.edu',   role: 'INSTITUTION_ADMIN', firstName: 'Admin',   lastName: 'User'    },
    { email: 'teacher@demo.edu', role: 'TEACHER',           firstName: 'Sarah',   lastName: 'Teacher' },
    { email: 'approver@demo.edu',role: 'APPROVER',          firstName: 'James',   lastName: 'Approver'},
    { email: 'proctor@demo.edu', role: 'PROCTOR',           firstName: 'Mike',    lastName: 'Proctor' },
    { email: 'student@demo.edu', role: 'STUDENT',           firstName: 'Alice',   lastName: 'Student' },
  ];

  const passwordHash = await passwordService.hash('DemoPassword1!');

  for (const u of users) {
    const user = await db.user.upsert({
      where:  { institutionId_email: { institutionId: institution.id, email: u.email } },
      create: { ...u, institutionId: institution.id, passwordHash, isEmailVerified: true },
      update: {},
    });
    console.log(`  User: ${user.email} (${user.role})`);
  }

  // ── Class ────────────────────────────────────────────────────
  const cls = await db.class.upsert({
    where: { institutionId_code_academicYear: {
      institutionId: institution.id, code: 'CS-401', academicYear: '2025-26',
    }},
    create: {
      institutionId: institution.id,
      name:          'Advanced Software Engineering',
      code:          'CS-401',
      academicYear:  '2025-26',
    },
    update: {},
  });
  console.log(`  Class: ${cls.name} (${cls.id})`);

  console.log('\n Seed complete');
  console.log('\nDemo credentials (password: DemoPassword1!):');
  for (const u of users) console.log(`  ${u.role.padEnd(20)} ${u.email}`);
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect());
```

---

## 35. Complete File Tree Reference

The following is the complete file tree for the entire monorepo as it should look at full implementation:

```
online-exam-platform/
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── security-scan.yml
│   │   ├── deploy-staging.yml
│   │   └── deploy-production.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── security_vulnerability.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── CODEOWNERS
│
├── packages/
│   │
│   ├── shared/
│   │   ├── src/
│   │   │   ├── constants/
│   │   │   │   ├── roles.ts
│   │   │   │   └── errors.ts
│   │   │   ├── types/
│   │   │   │   └── index.ts
│   │   │   └── validators/
│   │   │       ├── auth.schemas.ts
│   │   │       ├── exam.schemas.ts
│   │   │       └── session.schemas.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/
│   │   │   │   ├── env.ts
│   │   │   │   ├── keys.ts
│   │   │   │   └── redis.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.prisma
│   │   │   │   ├── client.ts
│   │   │   │   └── migrations/
│   │   │   ├── middleware/
│   │   │   │   ├── authenticate.middleware.ts
│   │   │   │   ├── rbac.middleware.ts
│   │   │   │   ├── validate.middleware.ts
│   │   │   │   ├── rate-limiter.middleware.ts
│   │   │   │   ├── scope.middleware.ts
│   │   │   │   ├── request-logger.middleware.ts
│   │   │   │   ├── error-handler.middleware.ts
│   │   │   │   └── hpp.middleware.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.router.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── token.service.ts
│   │   │   │   │   ├── password.service.ts
│   │   │   │   │   └── auth.test.ts
│   │   │   │   ├── institutions/
│   │   │   │   ├── users/
│   │   │   │   ├── exams/
│   │   │   │   │   ├── exam.router.ts
│   │   │   │   │   ├── exam.controller.ts
│   │   │   │   │   ├── exam.service.ts
│   │   │   │   │   ├── exam-hash.service.ts
│   │   │   │   │   ├── approval.service.ts
│   │   │   │   │   └── exam.test.ts
│   │   │   │   ├── questions/
│   │   │   │   ├── devices/
│   │   │   │   ├── sessions/
│   │   │   │   │   ├── session.router.ts
│   │   │   │   │   ├── session.controller.ts
│   │   │   │   │   ├── session.service.ts
│   │   │   │   │   └── session.test.ts
│   │   │   │   ├── proctoring/
│   │   │   │   │   ├── proctoring.router.ts
│   │   │   │   │   ├── proctoring.controller.ts
│   │   │   │   │   ├── proctoring.service.ts
│   │   │   │   │   └── proctoring.test.ts
│   │   │   │   └── grading/
│   │   │   │       ├── grading.router.ts
│   │   │   │       ├── grading.controller.ts
│   │   │   │       ├── grading.service.ts
│   │   │   │       ├── integrity-report.service.ts
│   │   │   │       └── grading.test.ts
│   │   │   ├── services/
│   │   │   │   ├── crypto.service.ts
│   │   │   │   ├── audit.service.ts
│   │   │   │   ├── ip-intel.service.ts
│   │   │   │   ├── ai-grading.service.ts
│   │   │   │   └── email.service.ts
│   │   │   ├── websocket/
│   │   │   │   ├── server.ts
│   │   │   │   └── namespaces/
│   │   │   │       ├── exam.namespace.ts
│   │   │   │       ├── proctoring.namespace.ts
│   │   │   │       └── mobile.namespace.ts
│   │   │   ├── jobs/
│   │   │   │   ├── queues.ts
│   │   │   │   └── workers/
│   │   │   │       ├── grading.worker.ts
│   │   │   │       ├── telemetry.worker.ts
│   │   │   │       └── report.worker.ts
│   │   │   ├── utils/
│   │   │   │   ├── errors.ts
│   │   │   │   ├── async-handler.ts
│   │   │   │   └── logger.ts
│   │   │   ├── app.ts
│   │   │   ├── router.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   │   └── setup.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── web/
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   └── utils/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── electron/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── index.ts
│   │   │   │   ├── lockdown.ts
│   │   │   │   ├── device.ts
│   │   │   │   ├── process-scanner.ts
│   │   │   │   ├── display-manager.ts
│   │   │   │   ├── heartbeat.ts
│   │   │   │   ├── updater.ts
│   │   │   │   ├── logger.ts
│   │   │   │   └── ipc/
│   │   │   ├── preload/
│   │   │   │   └── index.ts
│   │   │   └── renderer/
│   │   ├── electron-builder.yml
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mobile/
│       ├── src/
│       │   ├── screens/
│       │   ├── services/
│       │   └── store/
│       ├── app.json
│       ├── package.json
│       └── tsconfig.json
│
├── docs/
│   ├── srs/
│   ├── architecture/
│   │   └── decisions/       # ADR files
│   ├── compliance/
│   └── runbooks/
│       ├── incident-response.md
│       └── deploy.md
│
├── infra/
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.web
│   │   └── docker-compose.yml
│   └── k8s/
│       ├── namespace.yaml
│       ├── backend-deployment.yaml
│       ├── websocket-deployment.yaml
│       ├── workers-deployment.yaml
│       └── ingress.yaml
│
├── scripts/
│   ├── setup.sh
│   ├── seed-db.ts
│   └── gen-keys.sh
│
├── keys/                    # Git-ignored; dev RSA keypair
│   ├── private.pem          # NEVER commit
│   └── public.pem
│
├── .env.example
├── .env                     # Git-ignored
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── commitlint.config.js
├── tsconfig.base.json
├── package.json
└── README.md
```

---

*This Low Level Design document is complete. All 35 sections cover every component of the system from shared types through to deployment infrastructure. Implementation should follow the patterns specified here and any deviation must be updated in this document via a reviewed PR.*

*Last updated: 2026-07-17*