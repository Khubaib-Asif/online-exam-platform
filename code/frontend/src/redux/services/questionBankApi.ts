import { createApi } from '@reduxjs/toolkit/query/react';

export interface QuestionBankItem {
  id: string;
  name: string;
  description: string | null;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType = 'MCQ' | 'MSQ' | 'TRUE_FALSE' | 'SHORT' | 'LONG';

export interface QuestionItem {
  id: string;
  bankId: string;
  active: boolean;
  versionId: string;
  versionNumber: number;
  type: QuestionType;
  content: string;
  options: string[];
  answerKey: string | string[] | null;
  rubric: string | null;
  keywords: string[];
  marks: number;
  tags: string[];
  contentHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionInput {
  type: QuestionType;
  content: string;
  options?: string[];
  answerKey?: string | string[];
  rubric?: string;
  keywords?: string[];
  marks: number;
  tags?: string[];
}

export interface QuestionVersionHistory {
  id: string;
  versionNumber: number;
  type: QuestionType;
  content: string;
  options: string[];
  answerKey: string | string[] | null;
  rubric: string | null;
  keywords: string[];
  marks: number;
  tags: string[];
  contentHash: string;
  createdAt: string;
}

export interface QuestionDetailsResponse {
  id: string;
  bankId: string;
  bankName: string;
  active: boolean;
  versions: QuestionVersionHistory[];
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

export const questionBankApi = createApi({
  reducerPath: 'questionBankApi',
  baseQuery: async (args, api, extraOptions) => {
    const baseQuery = await getBaseQuery();
    return baseQuery(args, api, extraOptions);
  },
  tagTypes: ['QuestionBank', 'Question'],
  endpoints: (builder) => ({
    // Question Banks List
    getQuestionBanks: builder.query<QuestionBankItem[], void>({
      query: () => ({
        url: '/question-banks',
        method: 'GET',
      }),
      providesTags: ['QuestionBank'],
    }),

    // Create Question Bank
    createQuestionBank: builder.mutation<QuestionBankItem, { name: string; description?: string }>({
      query: (data) => ({
        url: '/question-banks',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['QuestionBank'],
    }),

    // Get Questions in a Bank
    getBankQuestions: builder.query<QuestionItem[], { bankId: string; search?: string; type?: string; tag?: string; activeOnly?: boolean }>({
      query: ({ bankId, search, type, tag, activeOnly }) => ({
        url: `/question-banks/${bankId}/questions`,
        method: 'GET',
        params: { search, type, tag, activeOnly },
      }),
      providesTags: ['Question'],
    }),

    // Create Question inside Bank
    createQuestion: builder.mutation<any, { bankId: string; question: QuestionInput }>({
      query: ({ bankId, question }) => ({
        url: `/question-banks/${bankId}/questions`,
        method: 'POST',
        data: question,
      }),
      invalidatesTags: ['Question', 'QuestionBank'],
    }),

    // Update Question (New Version)
    updateQuestion: builder.mutation<any, { questionId: string; question: QuestionInput }>({
      query: ({ questionId, question }) => ({
        url: `/questions/${questionId}`,
        method: 'PUT',
        data: question,
      }),
      invalidatesTags: ['Question'],
    }),

    // Get Question Details & Version History
    getQuestionDetails: builder.query<QuestionDetailsResponse, string>({
      query: (questionId) => ({
        url: `/questions/${questionId}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Question', id }],
    }),

    // Toggle Active / Archive Status
    toggleQuestionActive: builder.mutation<any, string>({
      query: (questionId) => ({
        url: `/questions/${questionId}/toggle-active`,
        method: 'POST',
      }),
      invalidatesTags: ['Question', 'QuestionBank'],
    }),

    // Import Questions
    importQuestions: builder.mutation<any, { bankId: string; questions: QuestionInput[] }>({
      query: ({ bankId, questions }) => ({
        url: `/question-banks/${bankId}/import`,
        method: 'POST',
        data: { questions },
      }),
      invalidatesTags: ['Question', 'QuestionBank'],
    }),

    // Delete Tag Across All Questions
    deleteTag: builder.mutation<any, string>({
      query: (tagName) => ({
        url: `/tags/${encodeURIComponent(tagName)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Question', 'QuestionBank'],
    }),
  }),
});

export const {
  useGetQuestionBanksQuery,
  useCreateQuestionBankMutation,
  useGetBankQuestionsQuery,
  useCreateQuestionMutation,
  useUpdateQuestionMutation,
  useGetQuestionDetailsQuery,
  useToggleQuestionActiveMutation,
  useImportQuestionsMutation,
  useDeleteTagMutation,
} = questionBankApi;
