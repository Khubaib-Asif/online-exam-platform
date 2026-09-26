import { createApi } from '@reduxjs/toolkit/query/react';

let baseQueryInstance: any = null;
const getBaseQuery = async () => {
  if (!baseQueryInstance) {
    const { axiosBaseQuery } = await import('@/lib/axiosBaseQuery');
    baseQueryInstance = axiosBaseQuery({ baseUrl: '/v1' });
  }
  return baseQueryInstance;
};

export interface GradingQueueItem {
  submissionId: string;
  sessionId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  sessionStatus: string;
  objectiveScore: number;
  objectiveTotal: number;
  subjectiveStatus: 'AUTO_GRADED' | 'PENDING_REVIEW' | 'CONFIRMED';
  isPublished: boolean;
  submittedAt: string;
}

export interface QuestionGradeDetail {
  id: string;
  examQuestionId: string;
  questionPrompt: string;
  questionType: string;
  maxMarks: number;
  awardedMarks: number | null;
  state: 'NOT_REQUIRED' | 'PENDING_AI_REVIEW' | 'TEACHER_CONFIRMED';
  source: string;
  studentAnswer: string;
  rubric: string | null;
  keywords: string[];
  aiSuggestion: {
    suggestedMarks: number | null;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    rationale: string;
    matchedKeywords: string[];
  };
  confirmedAt: string | null;
}

export interface SessionGradingDetailResponse {
  submissionId: string;
  sessionId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  sessionStatus: string;
  isPublished: boolean;
  submittedAt: string;
  totals: {
    objectiveScore: number;
    subjectiveScore: number;
    totalAwarded: number;
    totalMax: number;
    isReadyForPublication: boolean;
  };
  grades: QuestionGradeDetail[];
}

export interface ConfirmGradeRequest {
  sessionId: string;
  gradeId: string;
  awardedMarks: number;
  feedback?: string;
}

export interface ConfirmGradeResponse {
  gradeId: string;
  awardedMarks: number;
  state: string;
  remainingPending: number;
}

export interface PublishResultsRequest {
  examId: string;
  sessionId?: string;
}

export interface PublishResultsResponse {
  examId: string;
  publishedCount: number;
  publishedAt: string;
  results: Array<{
    sessionId: string;
    publicationId: string;
    resultHash: string;
  }>;
}

export interface StudentResultItem {
  resultId: string;
  sessionId: string;
  examId: string;
  examTitle: string;
  teacherName: string;
  awardedMarks: number;
  totalMarks: number;
  gradePercentage: string;
  publishedAt: string;
  status: 'PASSED' | 'FAILED';
}

export interface StudentResultDetailResponse {
  resultId: string;
  sessionId: string;
  examId: string;
  examTitle: string;
  teacherName: string;
  publishedAt: string;
  resultHash: string;
  totalAwarded: number;
  totalMax: number;
  percentage: string;
  status: 'PASSED' | 'FAILED';
  items: Array<{
    id: string;
    title: string;
    type: string;
    awarded: number;
    max: number;
  }>;
  teacherFeedback: string;
}

export interface AuditEventItem {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  targetRef: string;
  hash: string;
  fullHash?: string;
  metadata?: any;
}

export interface AuditLogsResponse {
  events: AuditEventItem[];
  total: number;
  limit: number;
  offset: number;
}

export const gradingApi = createApi({
  reducerPath: 'gradingApi',
  baseQuery: async (args, api, extraOptions) => {
    const baseQuery = await getBaseQuery();
    return baseQuery(args, api, extraOptions);
  },
  tagTypes: ['GradingQueue', 'SessionGradeDetail', 'StudentResults', 'StudentResultDetail', 'AuditLogs'],
  endpoints: (builder) => ({
    // 1. Teacher Grading Queue (M8-S01)
    getGradingQueue: builder.query<GradingQueueItem[], { examId?: string; status?: string } | void>({
      query: (params) => ({
        url: '/grading/queue',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['GradingQueue'],
    }),

    // 2. Session Grade Review Projection (M8-S02)
    getSessionGradingDetail: builder.query<SessionGradingDetailResponse, string>({
      query: (sessionId) => ({
        url: `/grading/sessions/${sessionId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'SessionGradeDetail', id }],
    }),

    // 3. Confirm Teacher Marks (M8-S03)
    confirmGrade: builder.mutation<ConfirmGradeResponse, ConfirmGradeRequest>({
      query: ({ sessionId, gradeId, ...body }) => ({
        url: `/grading/sessions/${sessionId}/grades/${gradeId}/confirm`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        'GradingQueue',
        { type: 'SessionGradeDetail', id: sessionId },
        'AuditLogs',
      ],
    }),

    // 4. Publish Results (M8-S04)
    publishResults: builder.mutation<PublishResultsResponse, PublishResultsRequest>({
      query: ({ examId, ...body }) => ({
        url: `/grading/exams/${examId}/publish`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['GradingQueue', 'SessionGradeDetail', 'StudentResults', 'AuditLogs'],
    }),

    // 5. Trigger / Re-run Auto-Grading
    triggerAutoGrading: builder.mutation<{ sessionId: string; status: string }, string>({
      query: (sessionId) => ({
        url: `/grading/sessions/${sessionId}/auto-grade`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, sessionId) => [
        'GradingQueue',
        { type: 'SessionGradeDetail', id: sessionId },
      ],
    }),

    // 6. Student Results Overview (M8-S05)
    getStudentResults: builder.query<StudentResultItem[], void>({
      query: () => ({
        url: '/grading/student/results',
        method: 'GET',
      }),
      providesTags: ['StudentResults'],
    }),

    // 7. Student Result Detail Projection (M8-S07)
    getStudentResultDetail: builder.query<StudentResultDetailResponse, string>({
      query: (resultId) => ({
        url: `/grading/student/results/${resultId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'StudentResultDetail', id }],
    }),

    // 8. Audit Log Ledger (M8-S06)
    getAuditLogs: builder.query<AuditLogsResponse, { search?: string; limit?: number; offset?: number } | void>({
      query: (params) => ({
        url: '/audit/events',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['AuditLogs'],
    }),
  }),
});

export const {
  useGetGradingQueueQuery,
  useGetSessionGradingDetailQuery,
  useConfirmGradeMutation,
  usePublishResultsMutation,
  useTriggerAutoGradingMutation,
  useGetStudentResultsQuery,
  useGetStudentResultDetailQuery,
  useGetAuditLogsQuery,
} = gradingApi;
