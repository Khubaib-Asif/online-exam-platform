import { createApi } from '@reduxjs/toolkit/query/react';

export type GateName = 'IDENTITY' | 'DEVICE' | 'ENVIRONMENT' | 'LOCKDOWN' | 'CONSENT' | 'ATTESTATION';
export type GateStatus = 'PASSED' | 'FAILED' | 'REVIEW_REQUIRED';

export interface GateOutcome {
  gateName: GateName;
  status: GateStatus;
  details: string;
  evaluatedAt: string;
}

export interface LaunchTicketResponse {
  launchTicket: string;
  ticketId: string;
  examId: string;
  examTitle: string;
  deviceId: string;
  startsAt: string;
  closesAt: string;
  durationMinutes: number;
  deepLinkUrl: string;
  webGateUrl: string;
}

export interface VerifyTicketResponse {
  valid: boolean;
  ticketId: string;
  exam: {
    id: string;
    title: string;
    description?: string;
    startsAt: string;
    closesAt: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  deviceId: string;
}

export interface EvaluateGatesRequest {
  examId: string;
  launchTicket: string;
  deviceId?: string;
  telemetry: {
    cameraAllowed: boolean;
    microphoneAllowed: boolean;
    singleDisplay: boolean;
    displaysCount?: number;
    kioskActive: boolean;
    virtualMachineDetected: boolean;
    blacklistedProcessesCount: number;
    candidateConsentGiven: boolean;
    platform?: string;
    appVersion?: string;
    faceSnapshot?: string;
    cameraLuma?: number;
    cameraVariance?: number;
    audioLevelRms?: number;
  };
}

export interface EvaluateGatesResponse {
  allPassed: boolean;
  gates: GateOutcome[];
  sessionId: string;
  entryToken?: string;
  failedGate?: GateName;
  remediation?: string;
  message?: string;
}

// Store the base query instance once loaded
let baseQueryInstance: any = null;

const getBaseQuery = async () => {
  if (!baseQueryInstance) {
    const { axiosBaseQuery } = await import('@/lib/axiosBaseQuery');
    baseQueryInstance = axiosBaseQuery({ baseUrl: '/v1' });
  }
  return baseQueryInstance;
};

export const gateApi = createApi({
  reducerPath: 'gateApi',
  baseQuery: async (args, api, extraOptions) => {
    const baseQuery = await getBaseQuery();
    return baseQuery(args, api, extraOptions);
  },
  tagTypes: ['Gate', 'ExamSession'],
  endpoints: (builder) => ({
    // 1. Create Launch Ticket
    createLaunchTicket: builder.mutation<LaunchTicketResponse, string>({
      query: (examId) => ({
        url: `/exams/${examId}/launch-ticket`,
        method: 'POST',
      }),
      invalidatesTags: ['Gate'],
    }),

    // 2. Verify Launch Ticket
    verifyLaunchTicket: builder.query<VerifyTicketResponse, string>({
      query: (ticket) => ({
        url: `/exams/launch-ticket/verify?ticket=${encodeURIComponent(ticket)}`,
        method: 'GET',
      }),
      providesTags: ['Gate'],
    }),

    // 3. Evaluate the 6 Security Gates
    evaluateGates: builder.mutation<EvaluateGatesResponse, EvaluateGatesRequest>({
      query: ({ examId, ...body }) => ({
        url: `/exams/${examId}/evaluate-gates`,
        method: 'POST',
        data: body,
      }),
      invalidatesTags: ['Gate', 'ExamSession'],
    }),
  }),
});

export const {
  useCreateLaunchTicketMutation,
  useVerifyLaunchTicketQuery,
  useEvaluateGatesMutation,
} = gateApi;
