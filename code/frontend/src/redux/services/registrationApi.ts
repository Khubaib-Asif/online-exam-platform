import { createApi } from '@reduxjs/toolkit/query/react';

export interface CatalogueExam {
  id: string;
  title: string;
  description: string | null;
  accessPolicy: 'PUBLIC' | 'INVITATION_ONLY' | 'APPROVAL_REQUIRED';
  startsAt: string;
  closesAt: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  teacherName: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  registrationState: 'NOT_REGISTERED' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  registrationId: string | null;
}

export interface ExamDetailsResponse extends CatalogueExam {
  timingMode: string;
  revisionId: string | null;
}

export interface StudentRegistrationItem {
  id: string;
  examId: string;
  examTitle: string;
  teacherName: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  startsAt: string;
  closesAt: string;
  requestedAt: string;
  approvedAt: string | null;
}

export interface PendingRegistrationRequest {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  requestedAt: string;
  status: string;
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

export const registrationApi = createApi({
  reducerPath: 'registrationApi',
  baseQuery: async (args, api, extraOptions) => {
    const baseQuery = await getBaseQuery();
    return baseQuery(args, api, extraOptions);
  },
  tagTypes: ['Registration', 'Catalogue'],
  endpoints: (builder) => ({
    // Student Catalogue Discovery
    getExamCatalogue: builder.query<CatalogueExam[], { search?: string; policy?: string } | void>({
      query: (params) => ({
        url: '/exams/catalogue',
        method: 'GET',
        params: params || {},
      }),
      providesTags: ['Catalogue', 'Registration'],
    }),

    // Detailed Exam Specs
    getExamDetails: builder.query<ExamDetailsResponse, string>({
      query: (examId) => ({
        url: `/exams/${examId}/details`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Registration', id }],
    }),

    // Register / Request Access for Exam
    registerForExam: builder.mutation<any, string>({
      query: (examId) => ({
        url: `/exams/${examId}/register`,
        method: 'POST',
      }),
      invalidatesTags: ['Registration', 'Catalogue'],
    }),

    // Redeem Invitation Token
    redeemExamInvitation: builder.mutation<any, { token: string }>({
      query: (data) => ({
        url: '/exams/invitations/redeem',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Registration', 'Catalogue'],
    }),

    // Student Active Registrations List
    getStudentRegistrations: builder.query<StudentRegistrationItem[], void>({
      query: () => ({
        url: '/student/registrations',
        method: 'GET',
      }),
      providesTags: ['Registration'],
    }),

    // Teacher Pending Approval Queue
    getTeacherPendingRequests: builder.query<PendingRegistrationRequest[], void>({
      query: () => ({
        url: '/teacher/registrations/requests',
        method: 'GET',
      }),
      providesTags: ['Registration'],
    }),

    // Teacher Approve / Reject Decision Action
    decideRegistrationRequest: builder.mutation<any, { registrationId: string; decision: 'APPROVED' | 'REJECTED' }>({
      query: ({ registrationId, decision }) => ({
        url: `/teacher/registrations/${registrationId}/decide`,
        method: 'POST',
        data: { decision },
      }),
      invalidatesTags: ['Registration'],
    }),

    // Teacher Issue Exam Invitation (Shared Code or Emailed Direct Invite)
    createExamInvitation: builder.mutation<any, { examId: string; recipientEmail?: string; maxUses?: number }>({
      query: ({ examId, ...data }) => ({
        url: `/teacher/exams/${examId}/invitations`,
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Registration'],
    }),

    // Teacher Exam Distribution Metrics Dashboard
    getExamDistributionStatus: builder.query<any, string>({
      query: (examId) => ({
        url: `/teacher/exams/${examId}/distribution`,
        method: 'GET',
      }),
      providesTags: ['Registration'],
    }),
  }),
});

export const {
  useGetExamCatalogueQuery,
  useGetExamDetailsQuery,
  useRegisterForExamMutation,
  useRedeemExamInvitationMutation,
  useGetStudentRegistrationsQuery,
  useGetTeacherPendingRequestsQuery,
  useDecideRegistrationRequestMutation,
  useCreateExamInvitationMutation,
  useGetExamDistributionStatusQuery,
} = registrationApi;
