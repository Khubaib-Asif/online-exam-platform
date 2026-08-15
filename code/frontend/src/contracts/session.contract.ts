import { z } from "zod";
import { QuestionTypeSchema } from "./question.contract";

export const AttemptStatusSchema = z.enum([
  "CREATED",
  "ACTIVE",
  "PAUSED_RECONNECT",
  "SUBMITTED",
  "AUTO_SUBMITTED",
  "TERMINATED",
  "GRADING_PENDING",
]);

export const QuestionStateSchema = z.enum([
  "UNSEEN",
  "ACTIVE",
  "ANSWERED",
  "SKIPPED",
  "TIMED_OUT",
  "LOCKED",
]);

export const SessionProjectionSchema = z.object({
  attemptId: z.string().uuid(),
  status: AttemptStatusSchema,
  sequence: z.number().int().nonnegative(),
  currentQuestionId: z.string().uuid().nullable(),
  questionDeadline: z.string().nullable(),
  paperDeadline: z.string().nullable(),
  sectionDeadline: z.string().nullable(),
  navigation: z.literal("FORWARD_ONLY"),
});

export const ActiveQuestionSchema = z.object({
  questionId: z.string().uuid(),
  sequenceIndex: z.number().int().nonnegative(),
  prompt: z.string(),
  type: QuestionTypeSchema,
  options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  timeRemainingSeconds: z.number().int().nonnegative().nullable(),
  isLocked: z.boolean(),
});

export const SubmitAnswerPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerData: z.union([
    z.object({ selectedOptionId: z.string() }),
    z.object({ selectedOptionIds: z.array(z.string()) }),
    z.object({ booleanValue: z.boolean() }),
    z.object({ textValue: z.string().max(10000) }),
  ]),
  clientTimestampMs: z.number().int(),
  idempotencyKey: z.string().uuid(),
});

export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;
export type QuestionState = z.infer<typeof QuestionStateSchema>;
export type SessionProjection = z.infer<typeof SessionProjectionSchema>;
export type ActiveQuestion = z.infer<typeof ActiveQuestionSchema>;
export type SubmitAnswerPayload = z.infer<typeof SubmitAnswerPayloadSchema>;