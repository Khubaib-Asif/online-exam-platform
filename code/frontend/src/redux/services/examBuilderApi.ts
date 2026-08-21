import { createApi } from '@reduxjs/toolkit/query/react';

export interface TeacherExamItem {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  accessPolicy: 'PUBLIC' | 'INVITATION_ONLY' | 'APPROVAL_REQUIRED';
  capacity: number | null;
  startsAt: string;
  closesAt: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  publishedAt: string | null;
  closedAt: string | null;
  registeredCount: number;
  revisionNumber: number;
  durationMinutes: number;
  timingMode: 'WHOLE_PAPER' | 'SECTION_TIMED' | 'QUESTION_TIMED' | 'MIXED';
  totalQuestions: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestionItem {
  id: string;
  questionVersionId: string;
  orderIndex: number;
  marksOverride: number | null;
  timeLimitSeconds: number | null;
  type: string;
  prompt: string;
  options: string[];
  marks: number;
  tags: string[];
}

export interface ExamSectionItem {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  durationSeconds: number | null;
  questions: ExamQuestionItem[];
}

export interface DetailedExamResponse extends TeacherExamItem {
  revisionId: string;
  revisionStatus: string;
  paperDurationSeconds: number;
  proctoringPolicy: any;
  gradingPolicy: any;
  settings: any;
  contentHash: string;
  sections: ExamSectionItem[];
}

export interface CreateExamPayload {
  title: string;
  description?: string;
  accessPolicy?: 'PUBLIC' | 'INVITATION_ONLY' | 'APPROVAL_REQUIRED';
  capacity?: number;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  startsAt?: string;
  closesAt?: string;
  timingMode?: 'WHOLE_PAPER' | 'SECTION_TIMED' | 'QUESTION_TIMED' | 'MIXED';
  paperDurationSeconds?: number;
}

// Lazy Load Base Query
let baseQueryInstance: any = null;

const getBaseQuery = async () => {
  if (!baseQueryInstance) {
    const { axiosBaseQuery } = await import('@/lib/axiosBaseQuery');
    baseQueryInstance = axiosBaseQuery({ baseUrl: '/v1' });
  }
  return baseQueryInstance;
};

export const examBuilderApi = createApi({
  reducerPath: 'examBuilderApi',
  baseQuery: async (args, api, extraOptions) => {
    const baseQuery = await getBaseQuery();
    return baseQuery(args, api, extraOptions);
  },
  tagTypes: ['ExamBuilder'],
  endpoints: (builder) => ({
    // 1. Get Teacher Owned Exams
    getTeacherExams: builder.query<TeacherExamItem[], void>({
      query: () => ({
        url: '/teacher/exams',
        method: 'GET',
      }),
      providesTags: ['ExamBuilder'],
    }),

    // 2. Create Draft Exam
    createExam: builder.mutation<any, CreateExamPayload>({
      query: (data) => ({
        url: '/teacher/exams',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 3. Get Full Exam Structure
    getExamDetails: builder.query<DetailedExamResponse, string>({
      query: (examId) => ({
        url: `/teacher/exams/${examId}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'ExamBuilder', id }],
    }),

    // 4. Update Exam Settings
    updateExamSettings: builder.mutation<any, { examId: string; data: Partial<CreateExamPayload> }>({
      query: ({ examId, data }) => ({
        url: `/teacher/exams/${examId}/settings`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 5. Add Section to Draft Revision
    addSection: builder.mutation<any, { examId: string; title: string; description?: string; durationSeconds?: number }>({
      query: ({ examId, ...data }) => ({
        url: `/teacher/exams/${examId}/sections`,
        method: 'POST',
        data,
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 6. Update Section
    updateSection: builder.mutation<any, { sectionId: string; title?: string; description?: string; durationSeconds?: number | null }>({
      query: ({ sectionId, ...data }) => ({
        url: `/teacher/sections/${sectionId}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 7. Delete Section
    deleteSection: builder.mutation<any, string>({
      query: (sectionId) => ({
        url: `/teacher/sections/${sectionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 8. Attach M3 Question Version to Section
    addQuestionToSection: builder.mutation<any, { sectionId: string; questionVersionId: string; marksOverride?: number; timeLimitSeconds?: number }>({
      query: ({ sectionId, ...data }) => ({
        url: `/teacher/sections/${sectionId}/questions`,
        method: 'POST',
        data,
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 9. Update Section Question (Marks Override & Time Limit)
    updateSectionQuestion: builder.mutation<any, { examQuestionId: string; marksOverride?: number | null; timeLimitSeconds?: number | null }>({
      query: ({ examQuestionId, ...data }) => ({
        url: `/teacher/exam-questions/${examQuestionId}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 10. Remove Question from Section
    removeQuestionFromSection: builder.mutation<any, string>({
      query: (examQuestionId) => ({
        url: `/teacher/exam-questions/${examQuestionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 11. Publish Exam
    publishExam: builder.mutation<any, string>({
      query: (examId) => ({
        url: `/teacher/exams/${examId}/publish`,
        method: 'POST',
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 12. Close Exam
    closeExam: builder.mutation<any, string>({
      query: (examId) => ({
        url: `/teacher/exams/${examId}/close`,
        method: 'POST',
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 13. Create Exam Invitation
    createExamInvitation: builder.mutation<
      any,
      { examId: string; recipientEmail?: string; maxUses?: number; expiresInSeconds?: number }
    >({
      query: ({ examId, ...data }) => ({
        url: `/teacher/exams/${examId}/invitations`,
        method: 'POST',
        data,
      }),
      invalidatesTags: ['ExamBuilder'],
    }),

    // 14. Get Exam Distribution & Invitations Status
    getExamDistributionStatus: builder.query<any, string>({
      query: (examId) => ({
        url: `/teacher/exams/${examId}/distribution`,
        method: 'GET',
      }),
      providesTags: ['ExamBuilder'],
    }),
  }),
});

export const {
  useGetTeacherExamsQuery,
  useCreateExamMutation,
  useGetExamDetailsQuery,
  useUpdateExamSettingsMutation,
  useAddSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  useAddQuestionToSectionMutation,
  useUpdateSectionQuestionMutation,
  useRemoveQuestionFromSectionMutation,
  usePublishExamMutation,
  useCloseExamMutation,
  useCreateExamInvitationMutation,
  useGetExamDistributionStatusQuery,
} = examBuilderApi;
