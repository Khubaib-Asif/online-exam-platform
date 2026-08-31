import { createApi } from '@reduxjs/toolkit/query/react';
import { type UserProfile } from '@redux/slices/authSlice';

export interface CreateOwnerRequest {
    bootstrapSecret: string;
    email: string;
    firstName: string;
    lastName: string;
    password: string;
}

export interface CreateOwnerResponse {
    user: UserProfile;
    message: string;
    platformState: 'INITIALISED';
}

export interface CreateTeacherInvitationRequest {
    email: string;
}

export interface CreateTeacherInvitationResponse {
    message: string;
    token: string; // Only for testing, in production this would be emailed
}

export interface RedeemTeacherInvitationRequest {
    token: string;
    firstName: string;
    lastName: string;
    password: string;
}

export interface RedeemTeacherInvitationResponse {
    user: UserProfile;
    message: string;
}

// ============================================
// LAZY LOAD BASE QUERY
// ============================================

// Store the base query instance once loaded
let baseQueryInstance: any = null;

// Function to get or create base query
const getBaseQuery = async () => {
    if (!baseQueryInstance) {
        console.log('Loading axiosBaseQuery...');
        // Dynamic import to avoid circular dependency
        const { axiosBaseQuery } = await import('@/lib/axiosBaseQuery');
        console.log('axiosBaseQuery loaded successfully');
        baseQueryInstance = axiosBaseQuery({ baseUrl: '/v1' });
        console.log('Base query initialized');
    }
    return baseQueryInstance;
};


export const bootstrapApi = createApi({
    reducerPath: 'bootstrapApi',
    baseQuery: async (args, api, extraOptions) => {
        const baseQuery = await getBaseQuery();
        return baseQuery(args, api, extraOptions);
    },
    tagTypes: ['Bootstrap'],
    endpoints: (builder) => ({
        // System Owner creation (Bootstrapping)
        createOwner: builder.mutation<CreateOwnerResponse, CreateOwnerRequest>({
            query: (data) => ({
                url: '/bootstrap/owner',
                method: 'POST',
                data,
            }),
        }),

        // Owner invites Teacher
        createTeacherInvitation: builder.mutation<CreateTeacherInvitationResponse, CreateTeacherInvitationRequest>({
            query: (data) => ({
                url: '/owner/teacher-invitations',
                method: 'POST',
                data,
            }),
        }),

        // Teacher redeems invitation
        redeemTeacherInvitation: builder.mutation<RedeemTeacherInvitationResponse, RedeemTeacherInvitationRequest>({
            query: (data) => ({
                url: '/teacher-invitations/redeem',
                method: 'POST',
                data,
            }),
        }),
    }),
});

export const {
    useCreateOwnerMutation,
    useCreateTeacherInvitationMutation,
    useRedeemTeacherInvitationMutation,
} = bootstrapApi;