import { z } from "zod";

export const TimingModeSchema = z.enum([
  "WHOLE_PAPER",
  "SECTION_TIMED",
  "QUESTION_TIMED",
  "MIXED",
]);

export const ExamSectionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Section title is required"),
  sequenceIndex: z.number().int().nonnegative(),
  timeLimitMinutes: z.number().int().positive().nullable(),
  questionIds: z.array(z.string().uuid()),
});

export const ExamDraftSchema = z.object({
  title: z.string().min(3, "Exam title must be at least 3 characters"),
  description: z.string().optional(),
  timingMode: TimingModeSchema,
  totalDurationMinutes: z.number().int().positive("Duration must be positive"),
  forwardOnlyNav: z.boolean().default(true),
  randomizeQuestions: z.boolean().default(false),
  randomizeOptions: z.boolean().default(false),
  sections: z.array(ExamSectionSchema).min(1, "At least one section is required"),
});

export const PublishExamSchema = z.object({
  examId: z.string().uuid(),
  startWindowIso: z.string(),
  endWindowIso: z.string(),
});

export type TimingMode = z.infer<typeof TimingModeSchema>;
export type ExamSection = z.infer<typeof ExamSectionSchema>;
export type ExamDraftInput = z.infer<typeof ExamDraftSchema>;
export type PublishExamInput = z.infer<typeof PublishExamSchema>;