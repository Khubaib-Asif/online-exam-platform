import { z } from "zod";

export const GradeSourceSchema = z.enum([
  "OBJECTIVE_KEY",
  "TEACHER",
  "AI_SUGGESTION",
]);

export const GradeStatusSchema = z.enum([
  "AUTO_GRADED",
  "PENDING_REVIEW",
  "CONFIRMED",
]);

export const GradeItemSchema = z.object({
  questionId: z.string().uuid(),
  questionVersionId: z.string().uuid(),
  awardedMarks: z.number().nullable(),
  maxMarks: z.number().positive(),
  source: GradeSourceSchema,
  status: GradeStatusSchema,
});

export const ResultPublicationCommandSchema = z.object({
  attemptId: z.string().uuid(),
  expectedGradeVersion: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
});

export const PublishedResultProjectionSchema = z.object({
  resultId: z.string().uuid(),
  attemptId: z.string().uuid(),
  publishedAt: z.string(),
  totalMarks: z.number(),
  items: z.array(
    z.object({
      questionId: z.string().uuid(),
      awardedMarks: z.number().nullable(),
      maxMarks: z.number(),
    })
  ),
});

export type GradeSource = z.infer<typeof GradeSourceSchema>;
export type GradeStatus = z.infer<typeof GradeStatusSchema>;
export type GradeItem = z.infer<typeof GradeItemSchema>;
export type ResultPublicationCommand = z.infer<typeof ResultPublicationCommandSchema>;
export type PublishedResultProjection = z.infer<typeof PublishedResultProjectionSchema>;