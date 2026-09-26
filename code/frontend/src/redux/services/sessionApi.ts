import { createApi } from '@reduxjs/toolkit/query/react';

export interface SafeOption {
  id: string;
  text: string;
}

export interface ActiveQuestion {
  id: string;
  sequenceIndex: number;
  type: 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'SHORT' | 'LONG' | string;
  prompt: string;
  options?: SafeOption[];
  marks: number;
  timeLimitSeconds?: number | null;
  isLocked: boolean;
}

export interface SessionProjection {
  sessionId: string;
  examId: string;
  examTitle: string;
  timingMode: 'WHOLE_PAPER' | 'SECTION_TIMED' | 'QUESTION_TIMED' | 'MIXED' | string;
  status: 'ACTIVE' | 'PAUSED_RECONNECT' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'TERMINATED' | string;
  clientSequence: number;
  serverTime: string;
  paperDeadline: string;
  sectionDeadline: string | null;
  questionDeadline: string | null;
  totalQuestions: number;
  currentQuestionIndex: number;
  currentSectionIndex: number;
  sectionTitle: string;
  currentQuestion: ActiveQuestion | null;
  isComplete: boolean;
}

export interface StartSessionRequest {
  examId: string;
  entryToken?: string;
}

export interface SubmitQuestionRequest {
  sessionId: string;
  examQuestionId: string;
  answer?: any;
  clientSequence: number;
  idempotencyKey?: string;
}

export interface SkipQuestionRequest {
  sessionId: string;
  examQuestionId: string;
  clientSequence: number;
}

export interface HeartbeatResponse {
  status: string;
  serverTime: string;
  remainingSeconds: number;
  paperDeadline?: string;
  sectionDeadline?: string | null;
  questionDeadline?: string | null;
}

export interface PauseReconnectResponse {
  status: string;
  reconnectCount: number;
  reconnectDeadline: string;
}

let baseQueryInstance: any = null;

const getBaseQuery = async () => {
  if (!baseQueryInstance) {
    const { axiosBaseQuery } = await import('@/lib/axiosBaseQuery');
    baseQueryInstance = axiosBaseQuery({ baseUrl: '/v1' });
  }
  return baseQueryInstance;
};

export const sessionApi = createApi({
  reducerPath: 'sessionApi',
  baseQuery: async (args, api, extraOptions) => {
    const baseQuery = await getBaseQuery();
    return baseQuery(args, api, extraOptions);
  },
  tagTypes: ['ExamSession', 'ActiveQuestion'],
  endpoints: (builder) => ({
    // 1. Start or Resume Session with Entry Token
    startSession: builder.mutation<SessionProjection, StartSessionRequest>({
      query: (body) => ({
        url: '/sessions/start',
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['ExamSession', 'ActiveQuestion'],
    }),

    // 2. Fetch Current Question & Timing Projection
    getCurrentQuestion: builder.query<SessionProjection, string>({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}/current`,
        method: 'GET',
      }),
      providesTags: ['ActiveQuestion'],
    }),

    // 3. Submit Question Answer (Forward-Only)
    submitQuestion: builder.mutation<SessionProjection, SubmitQuestionRequest>({
      query: ({ sessionId, ...body }) => ({
        url: `/sessions/${sessionId}/submit-question`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['ActiveQuestion'],
    }),

    // 4. Skip Question (Permanently Locked)
    skipQuestion: builder.mutation<SessionProjection, SkipQuestionRequest>({
      query: ({ sessionId, ...body }) => ({
        url: `/sessions/${sessionId}/skip-question`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['ActiveQuestion'],
    }),

    // 5. Submit Exam Explicitly
    submitExam: builder.mutation<SessionProjection, string>({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}/submit-exam`,
        method: 'POST',
      }),
      invalidatesTags: ['ExamSession', 'ActiveQuestion'],
    }),

    // 6. Liveness Heartbeat
    heartbeat: builder.mutation<HeartbeatResponse, string>({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}/heartbeat`,
        method: 'POST',
      }),
    }),

    // 7. Pause Session for Reconnect
    pauseReconnect: builder.mutation<PauseReconnectResponse, string>({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}/pause-reconnect`,
        method: 'POST',
      }),
      invalidatesTags: ['ExamSession'],
    }),

    // 8. Resume Reconnected Session
    resumeSession: builder.mutation<SessionProjection, string>({
      query: (sessionId) => ({
        url: `/sessions/${sessionId}/resume`,
        method: 'POST',
      }),
      invalidatesTags: ['ExamSession', 'ActiveQuestion'],
    }),
  }),
});

export const {
  useStartSessionMutation,
  useGetCurrentQuestionQuery,
  useSubmitQuestionMutation,
  useSkipQuestionMutation,
  useSubmitExamMutation,
  useHeartbeatMutation,
  usePauseReconnectMutation,
  useResumeSessionMutation,
} = sessionApi;
