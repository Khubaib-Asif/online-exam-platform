import { createApi } from '@reduxjs/toolkit/query/react';

export interface LiveSessionItem {
  sessionId: string;
  studentName: string;
  studentEmail: string;
  examTitle: string;
  examId: string;
  sessionState: 'ACTIVE' | 'RECONNECTING' | 'SUBMITTED' | 'REVIEW_REQUIRED';
  riskScore: number;
  riskLevel: 'CLEAR' | 'LOW' | 'MEDIUM' | 'HIGH';
  cameraStatus: 'OK' | 'DEGRADED' | 'OFF';
  micStatus: 'OK' | 'OFF';
  openFlagsCount: number;
  startedAt: string;
  rawStatus: string;
}

export interface LiveSessionsResponse {
  sessions: LiveSessionItem[];
  stats: {
    totalActive: number;
    clearCount: number;
    reconnectingCount: number;
    reviewRequiredCount: number;
  };
}

export interface GetLiveSessionsParams {
  examId?: string;
  search?: string;
  riskFilter?: string;
}

export interface IntegritySignalItem {
  id: string;
  eventId: string;
  time: string;
  timestamp: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  riskDelta: number;
  note: string;
}

export interface ProctoringFlagItem {
  id: string;
  flagType: string;
  confidence: number;
  decision: string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export interface SessionIntegrityDetailResponse {
  session: {
    id: string;
    studentName: string;
    studentEmail: string;
    examTitle: string;
    examId: string;
    riskScore: number;
    riskLevel: 'CLEAR' | 'LOW' | 'MEDIUM' | 'HIGH';
    status: string;
    startedAt: string | null;
    reconnectCount: number;
  };
  signals: IntegritySignalItem[];
  flags: ProctoringFlagItem[];
}

export interface SendTelemetryRequest {
  sessionId: string;
  clientSequence?: number;
  events: Array<{
    eventId?: string;
    eventType: string;
    occurredAtClientMs?: number;
    metadata?: Record<string, any>;
  }>;
}

export interface RecordReviewDecisionRequest {
  sessionId: string;
  decision: 'CLEARED' | 'FLAGGED' | 'INCONCLUSIVE';
  reviewNote?: string;
}

export interface RecordReconnectDecisionRequest {
  sessionId: string;
  granted: boolean;
  extensionSeconds?: number;
  reasonNote?: string;
}

let baseQueryInstance: any = null;

const getBaseQuery = async () => {
  if (!baseQueryInstance) {
    const { axiosBaseQuery } = await import('@/lib/axiosBaseQuery');
    baseQueryInstance = axiosBaseQuery({ baseUrl: '/v1' });
  }
  return baseQueryInstance;
};

export const proctoringApi = createApi({
  reducerPath: 'proctoringApi',
  baseQuery: async (args, api, extraOptions) => {
    const baseQuery = await getBaseQuery();
    return baseQuery(args, api, extraOptions);
  },
  tagTypes: ['LiveSessions', 'SessionIntegrity'],
  endpoints: (builder) => ({
    // 1. Ingest Telemetry Micro-batch
    sendTelemetry: builder.mutation<{ success: boolean; processedCount: number; currentRiskScore: number }, SendTelemetryRequest>({
      query: (body) => ({
        url: '/proctoring/telemetry',
        method: 'POST',
        data: body,
      }),
    }),

    // 2. Fetch Live Monitored Sessions
    getLiveSessions: builder.query<LiveSessionsResponse, GetLiveSessionsParams | void>({
      query: (params) => ({
        url: '/proctoring/live-sessions',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['LiveSessions'],
    }),

    // 3. Fetch Single Session Integrity Detail
    getSessionIntegrityDetail: builder.query<SessionIntegrityDetailResponse, string>({
      query: (sessionId) => ({
        url: `/proctoring/sessions/${sessionId}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, id) => [{ type: 'SessionIntegrity', id }],
    }),

    // 4. Record Teacher Review Decision
    recordReviewDecision: builder.mutation<{ success: boolean; sessionId: string; decision: string }, RecordReviewDecisionRequest>({
      query: ({ sessionId, ...body }) => ({
        url: `/proctoring/sessions/${sessionId}/review`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        'LiveSessions',
        { type: 'SessionIntegrity', id: sessionId },
      ],
    }),

    // 5. Record Reconnect Decision
    recordReconnectDecision: builder.mutation<{ success: boolean; sessionId: string; action: string }, RecordReconnectDecisionRequest>({
      query: ({ sessionId, ...body }) => ({
        url: `/proctoring/sessions/${sessionId}/reconnect-decision`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: (_result, _error, { sessionId }) => [
        'LiveSessions',
        { type: 'SessionIntegrity', id: sessionId },
      ],
    }),
  }),
});

export const {
  useSendTelemetryMutation,
  useGetLiveSessionsQuery,
  useGetSessionIntegrityDetailQuery,
  useRecordReviewDecisionMutation,
  useRecordReconnectDecisionMutation,
} = proctoringApi;
