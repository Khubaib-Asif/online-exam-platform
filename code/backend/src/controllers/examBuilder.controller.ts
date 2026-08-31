import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ExamBuilderService } from '../services/examBuilder.service';
import { z } from 'zod';

const CreateExamSchema = z.object({
  title: z.string().trim().min(1, 'Exam title is required'),
  description: z.string().trim().optional(),
  accessPolicy: z.enum(['PUBLIC', 'INVITATION_ONLY', 'APPROVAL_REQUIRED']).default('INVITATION_ONLY'),
  capacity: z.number().int().positive().optional(),
  registrationOpensAt: z.coerce.date().optional().default(() => new Date()),
  registrationClosesAt: z.coerce.date().optional().default(() => new Date(Date.now() + 86400000 * 7)),
  startsAt: z.coerce.date().optional().default(() => new Date(Date.now() + 86400000 * 7)),
  closesAt: z.coerce.date().optional().default(() => new Date(Date.now() + 86400000 * 8)),
  timingMode: z.enum(['WHOLE_PAPER', 'SECTION_TIMED', 'QUESTION_TIMED', 'MIXED']).default('WHOLE_PAPER'),
  paperDurationSeconds: z.number().int().positive('Paper duration must be a positive integer').default(7200),
});

const UpdateExamSettingsSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  accessPolicy: z.enum(['PUBLIC', 'INVITATION_ONLY', 'APPROVAL_REQUIRED']).optional(),
  capacity: z.number().int().positive().optional(),
  registrationOpensAt: z.coerce.date().optional(),
  registrationClosesAt: z.coerce.date().optional(),
  startsAt: z.coerce.date().optional(),
  closesAt: z.coerce.date().optional(),
  timingMode: z.enum(['WHOLE_PAPER', 'SECTION_TIMED', 'QUESTION_TIMED', 'MIXED']).optional(),
  paperDurationSeconds: z.number().int().positive().optional(),
});

const AddSectionSchema = z.object({
  title: z.string().trim().min(1, 'Section title is required'),
  description: z.string().trim().optional(),
  durationSeconds: z.number().int().positive().optional(),
});

const UpdateSectionSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  durationSeconds: z.number().int().nullable().optional(),
});

const AddQuestionToSectionSchema = z.object({
  questionVersionId: z.string().min(1, 'Question version ID is required'),
  marksOverride: z.number().int().positive().optional().nullable(),
  timeLimitSeconds: z.number().int().positive().optional().nullable(),
});

const UpdateSectionQuestionSchema = z.object({
  marksOverride: z.number().int().nullable().optional(),
  timeLimitSeconds: z.number().int().nullable().optional(),
});

export class ExamBuilderController {
  // 1. GET /v1/teacher/exams
  static async getTeacherExams(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const exams = await ExamBuilderService.getTeacherExams(req.user!.id);
      res.json({ data: exams });
    } catch (error) {
      next(error);
    }
  }

  // 2. POST /v1/teacher/exams
  static async createExam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const validated = CreateExamSchema.parse(req.body);
      const exam = await ExamBuilderService.createExam(req.user!.id, validated);
      res.status(201).json({ data: exam, message: 'Draft exam created successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 3. GET /v1/teacher/exams/:id
  static async getExamDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const details = await ExamBuilderService.getExamDetails(req.user!.id, examId);
      res.json({ data: details });
    } catch (error) {
      next(error);
    }
  }

  // 4. PUT /v1/teacher/exams/:id/settings
  static async updateExamSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const validated = UpdateExamSettingsSchema.parse(req.body);
      const updated = await ExamBuilderService.updateExamSettings(req.user!.id, examId, validated);
      res.json({ data: updated, message: 'Exam settings updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 5. POST /v1/teacher/exams/:id/sections
  static async addSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const validated = AddSectionSchema.parse(req.body);
      const section = await ExamBuilderService.addSection(
        req.user!.id,
        examId,
        validated.title,
        validated.description,
        validated.durationSeconds
      );
      res.status(201).json({ data: section, message: 'Exam section created successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 6. PUT /v1/teacher/sections/:id
  static async updateSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sectionId = req.params.id as string;
      const validated = UpdateSectionSchema.parse(req.body);
      const updated = await ExamBuilderService.updateSection(req.user!.id, sectionId, validated);
      res.json({ data: updated, message: 'Section updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 7. DELETE /v1/teacher/sections/:id
  static async deleteSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sectionId = req.params.id as string;
      const deleted = await ExamBuilderService.deleteSection(req.user!.id, sectionId);
      res.json({ data: deleted, message: 'Section deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 8. POST /v1/teacher/sections/:id/questions
  static async addQuestionToSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sectionId = req.params.id as string;
      const validated = AddQuestionToSectionSchema.parse(req.body);
      const examQuestion = await ExamBuilderService.addQuestionToSection(
        req.user!.id,
        sectionId,
        validated.questionVersionId,
        validated.marksOverride,
        validated.timeLimitSeconds
      );
      res.status(201).json({ data: examQuestion, message: 'Question version attached to section successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 9. PUT /v1/teacher/exam-questions/:id
  static async updateSectionQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examQuestionId = req.params.id as string;
      const validated = UpdateSectionQuestionSchema.parse(req.body);
      const updated = await ExamBuilderService.updateSectionQuestion(req.user!.id, examQuestionId, validated);
      res.json({ data: updated, message: 'Question timing/marks updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 10. DELETE /v1/teacher/exam-questions/:id
  static async removeQuestionFromSection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examQuestionId = req.params.id as string;
      const deleted = await ExamBuilderService.removeQuestionFromSection(req.user!.id, examQuestionId);
      res.json({ data: deleted, message: 'Question removed from section successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 11. POST /v1/teacher/exams/:id/publish
  static async publishExam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const publishedExam = await ExamBuilderService.publishExam(req.user!.id, examId);
      res.json({ data: publishedExam, message: 'Exam published successfully' });
    } catch (error) {
      next(error);
    }
  }

  // 12. POST /v1/teacher/exams/:id/close
  static async closeExam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const examId = req.params.id as string;
      const closedExam = await ExamBuilderService.closeExam(req.user!.id, examId);
      res.json({ data: closedExam, message: 'Exam closed successfully' });
    } catch (error) {
      next(error);
    }
  }
}
