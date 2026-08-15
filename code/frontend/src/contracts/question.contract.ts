import { z } from "zod";

export const QuestionTypeSchema = z.enum([
  "MCQ",
  "MSQ",
  "TRUE_FALSE",
  "SHORT",
  "LONG",
]);

export const QuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Option text cannot be empty"),
  isCorrect: z.boolean().default(false),
});

export const QuestionDraftSchema = z.object({
  title: z.string().min(2, "Title is required"),
  prompt: z.string().min(5, "Prompt must be at least 5 characters"),
  type: QuestionTypeSchema,
  options: z.array(QuestionOptionSchema).optional(),
  sampleAnswer: z.string().optional(),
  rubric: z.string().optional(),
  pointValue: z.number().int().positive("Point value must be positive"),
  tags: z.array(z.string()).default([]),
});

export const QuestionVersionProjectionSchema = z.object({
  questionId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  prompt: z.string(),
  type: QuestionTypeSchema,
  createdAtIso: z.string(),
});

export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;
export type QuestionDraftInput = z.infer<typeof QuestionDraftSchema>;
export type QuestionVersionProjection = z.infer<
  typeof QuestionVersionProjectionSchema
>;