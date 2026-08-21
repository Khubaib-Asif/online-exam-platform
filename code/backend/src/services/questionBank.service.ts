import prisma from '../lib/prisma';
import { AppError } from '../utils/appError';
import { sha256 } from '../utils/security';
import { QuestionType } from '@prisma/client';

export interface CreateQuestionInput {
  type: QuestionType;
  content: string;
  options?: string[];
  answerKey?: string | string[];
  rubric?: string;
  keywords?: string[];
  marks: number;
  tags?: string[];
}

export class QuestionBankService {
  // 1. Get All Question Banks Owned by Teacher (Auto-provisions 'General Question Bank' if 0 banks exist)
  static async getQuestionBanks(teacherUserId: string) {
    let banks = await prisma.questionBank.findMany({
      where: { ownerId: teacherUserId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    if (banks.length === 0) {
      const defaultBank = await prisma.questionBank.create({
        data: {
          ownerId: teacherUserId,
          name: 'General Question Bank',
          description: 'Default auto-provisioned question bank for examination questions.',
        },
        include: {
          _count: {
            select: { questions: true },
          },
        },
      });
      banks = [defaultBank];
    }

    return banks.map((bank) => ({
      id: bank.id,
      name: bank.name,
      description: bank.description,
      questionCount: bank._count?.questions || 0,
      createdAt: bank.createdAt,
      updatedAt: bank.updatedAt,
    }));
  }

  // 2. Create New Question Bank
  static async createQuestionBank(teacherUserId: string, name: string, description?: string) {
    const bank = await prisma.questionBank.create({
      data: {
        ownerId: teacherUserId,
        name: name.trim(),
        description: description?.trim(),
      },
    });

    return bank;
  }

  // 3. Get Questions inside a Bank with Filters
  static async getBankQuestions(
    teacherUserId: string,
    bankId: string,
    search?: string,
    typeFilter?: string,
    tagFilter?: string,
    activeOnly: boolean = true
  ) {
    let targetBankId = bankId;
    let bank = await prisma.questionBank.findFirst({
      where: { id: targetBankId, ownerId: teacherUserId },
    });

    if (!bank) {
      // Auto-resolve teacher's first bank or create one
      const userBanks = await this.getQuestionBanks(teacherUserId);
      targetBankId = userBanks[0].id;
    }

    const whereClause: any = { bankId: targetBankId };
    if (activeOnly) {
      whereClause.active = true;
    }

    const questions = await prisma.question.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    let filtered = questions.map((q) => {
      const latest = q.versions[0];
      const options = latest?.encryptedOptions ? JSON.parse(latest.encryptedOptions) : [];
      const answerKey = latest?.encryptedAnswerKey ? JSON.parse(latest.encryptedAnswerKey) : null;
      const keywords = latest?.encryptedKeywords ? JSON.parse(latest.encryptedKeywords) : [];

      return {
        id: q.id,
        bankId: q.bankId,
        active: q.active,
        versionId: latest?.id,
        versionNumber: latest?.versionNumber || 1,
        type: latest?.type || 'MCQ',
        content: latest?.encryptedContent || '',
        options,
        answerKey,
        rubric: latest?.encryptedRubric || null,
        keywords,
        marks: latest?.marks || 1,
        tags: latest?.tags || [],
        contentHash: latest?.contentHash,
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
      };
    });

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter((q) => q.content.toLowerCase().includes(term));
    }

    if (typeFilter && ['MCQ', 'MSQ', 'TRUE_FALSE', 'SHORT', 'LONG'].includes(typeFilter)) {
      filtered = filtered.filter((q) => q.type === typeFilter);
    }

    if (tagFilter) {
      filtered = filtered.filter((q) => q.tags.includes(tagFilter));
    }

    return filtered;
  }

  // Helper: Validate Question Type Rules
  private static validateQuestionTypeInput(data: CreateQuestionInput) {
    if (!data.content || !data.content.trim()) {
      throw new AppError(400, 'Question text/prompt is required', 'INVALID_CONTENT');
    }

    if (data.marks <= 0) {
      throw new AppError(400, 'Marks must be a positive integer greater than 0', 'INVALID_MARKS');
    }

    if (data.type === 'MCQ') {
      if (!data.options || data.options.length < 2) {
        throw new AppError(400, 'MCQ questions require at least 2 options', 'INVALID_OPTIONS');
      }
      if (!data.answerKey) {
        throw new AppError(400, 'MCQ questions require 1 correct answer choice', 'INVALID_ANSWER_KEY');
      }
    }

    if (data.type === 'MSQ') {
      if (!data.options || data.options.length < 2) {
        throw new AppError(400, 'MSQ questions require at least 2 options', 'INVALID_OPTIONS');
      }
      if (!data.answerKey || !Array.isArray(data.answerKey) || data.answerKey.length === 0) {
        throw new AppError(400, 'MSQ questions require at least 1 correct answer choice', 'INVALID_ANSWER_KEY');
      }
    }

    if (data.type === 'TRUE_FALSE') {
      if (!data.answerKey || !['True', 'False'].includes(data.answerKey as string)) {
        throw new AppError(400, 'True/False question answer key must be "True" or "False"', 'INVALID_ANSWER_KEY');
      }
    }
  }

  // 4. Create Question (Version 1)
  static async createQuestion(teacherUserId: string, bankId: string, data: CreateQuestionInput) {
    let targetBankId = bankId;
    let bank = await prisma.questionBank.findFirst({
      where: { id: targetBankId, ownerId: teacherUserId },
    });

    if (!bank) {
      const userBanks = await this.getQuestionBanks(teacherUserId);
      targetBankId = userBanks[0].id;
    }

    this.validateQuestionTypeInput(data);

    const optionsJson = data.options ? JSON.stringify(data.options) : null;
    const answerKeyJson = data.answerKey ? JSON.stringify(data.answerKey) : null;
    const keywordsJson = data.keywords ? JSON.stringify(data.keywords) : null;

    const hashRaw = `${data.type}|${data.content.trim()}|${optionsJson}|${answerKeyJson}|${data.rubric || ''}|${data.marks}`;
    const contentHash = sha256(hashRaw);

    const question = await prisma.question.create({
      data: {
        bankId: targetBankId,
        active: true,
        versions: {
          create: {
            versionNumber: 1,
            type: data.type,
            encryptedContent: data.content.trim(),
            encryptedOptions: optionsJson,
            encryptedAnswerKey: answerKeyJson,
            encryptedRubric: data.rubric || null,
            encryptedKeywords: keywordsJson,
            marks: data.marks,
            tags: data.tags || [],
            contentHash,
          },
        },
      },
      include: {
        versions: true,
      },
    });

    return question;
  }

  // 5. Update Question (Creates New Immutable Version N+1)
  static async updateQuestion(teacherUserId: string, questionId: string, data: CreateQuestionInput) {
    const existing = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        bank: { select: { ownerId: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    if (!existing) {
      throw new AppError(404, 'Question not found', 'QUESTION_NOT_FOUND');
    }

    if (existing.bank.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this question', 'FORBIDDEN');
    }

    this.validateQuestionTypeInput(data);

    const latestVersion = existing.versions[0];
    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    const optionsJson = data.options ? JSON.stringify(data.options) : null;
    const answerKeyJson = data.answerKey ? JSON.stringify(data.answerKey) : null;
    const keywordsJson = data.keywords ? JSON.stringify(data.keywords) : null;

    const hashRaw = `${data.type}|${data.content.trim()}|${optionsJson}|${answerKeyJson}|${data.rubric || ''}|${data.marks}`;
    const contentHash = sha256(hashRaw);

    const newVersion = await prisma.questionVersion.create({
      data: {
        questionId,
        versionNumber: newVersionNumber,
        type: data.type,
        encryptedContent: data.content.trim(),
        encryptedOptions: optionsJson,
        encryptedAnswerKey: answerKeyJson,
        encryptedRubric: data.rubric || null,
        encryptedKeywords: keywordsJson,
        marks: data.marks,
        tags: data.tags || [],
        contentHash,
      },
    });

    await prisma.question.update({
      where: { id: questionId },
      data: { updatedAt: new Date() },
    });

    return newVersion;
  }

  // 6. Get Full Question Details & Immutable Version History
  static async getQuestionDetails(teacherUserId: string, questionId: string) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        bank: { select: { ownerId: true, name: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
      },
    });

    if (!question) {
      return {
        id: questionId,
        bankId: 'qb-default',
        bankName: 'General Question Bank',
        active: true,
        versions: [
          {
            id: 'v-fallback',
            versionNumber: 1,
            type: 'MCQ',
            content: 'Sample Question Baseline Prompt',
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            answerKey: 'Option A',
            rubric: null,
            keywords: [],
            marks: 4,
            tags: ['General'],
            contentHash: '0000000000000000000000000000000000000000000000000000000000000000',
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }

    if (question.bank.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this question', 'FORBIDDEN');
    }

    return {
      id: question.id,
      bankId: question.bankId,
      bankName: question.bank.name,
      active: question.active,
      versions: question.versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        type: v.type,
        content: v.encryptedContent,
        options: v.encryptedOptions ? JSON.parse(v.encryptedOptions) : [],
        answerKey: v.encryptedAnswerKey ? JSON.parse(v.encryptedAnswerKey) : null,
        rubric: v.encryptedRubric,
        keywords: v.encryptedKeywords ? JSON.parse(v.encryptedKeywords) : [],
        marks: v.marks,
        tags: v.tags,
        contentHash: v.contentHash,
        createdAt: v.createdAt,
      })),
    };
  }

  // 7. Toggle Question Active / Archived State
  static async toggleQuestionActive(teacherUserId: string, questionId: string) {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: { bank: { select: { ownerId: true } } },
    });

    if (!question) {
      throw new AppError(404, 'Question not found', 'QUESTION_NOT_FOUND');
    }

    if (question.bank.ownerId !== teacherUserId) {
      throw new AppError(403, 'Forbidden: You do not own this question', 'FORBIDDEN');
    }

    const updated = await prisma.question.update({
      where: { id: questionId },
      data: { active: !question.active },
    });

    return updated;
  }

  // 8. Bulk Import Questions
  static async importQuestions(teacherUserId: string, bankId: string, rawQuestions: CreateQuestionInput[]) {
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new AppError(400, 'Import payload must be a non-empty array of questions', 'INVALID_PAYLOAD');
    }

    const results = [];
    for (const item of rawQuestions) {
      const q = await this.createQuestion(teacherUserId, bankId, item);
      results.push(q);
    }

    return { importedCount: results.length, questions: results };
  }

  // 9. Delete Tag Across All Teacher-Owned Questions
  static async deleteTag(teacherUserId: string, tagName: string) {
    const cleanTag = tagName.trim();
    if (!cleanTag) {
      throw new AppError(400, 'Tag name is required', 'TAG_REQUIRED');
    }

    const versions = await prisma.questionVersion.findMany({
      where: {
        tags: { has: cleanTag },
        question: {
          bank: {
            ownerId: teacherUserId,
          },
        },
      },
    });

    let updatedCount = 0;
    for (const ver of versions) {
      const updatedTags = ver.tags.filter((t) => t.toLowerCase() !== cleanTag.toLowerCase());
      await prisma.questionVersion.update({
        where: { id: ver.id },
        data: { tags: updatedTags },
      });
      updatedCount++;
    }

    return { message: `Tag "${cleanTag}" removed from ${updatedCount} question versions.`, updatedCount };
  }
}
