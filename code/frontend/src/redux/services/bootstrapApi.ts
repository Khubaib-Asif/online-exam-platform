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

export interface TeacherInvitationItem {
    id: string;
    email: string;
    role: string;
    status: 'ISSUED' | 'REDEEMED' | 'REVOKED' | 'EXPIRED';
    expiresAt: string;
    createdAt: string;
    redeemedAt?: string | null;
    revokedAt?: string | null;
    issuedBy?: string;
    redeemedBy?: string;
}

export interface CreateTeacherInvitationResponse {
    message: string;
    invitationId: string;
    email: string;
    expiresAt: string;
    invitationToken: string;
}

export interface ValidateTeacherInvitationResponse {
    isValid: boolean;
    email: string;
    status: 'ISSUED' | 'REDEEMED' | 'REVOKED' | 'EXPIRED' | 'INVALID' | 'ALREADY_REGISTERED';
    expiresAt?: string;
    message: string;
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
    tagTypes: ['Bootstrap', 'TeacherInvitations'],
    endpoints: (builder) => ({
        // System Owner creation (Bootstrapping)
        createOwner: builder.mutation<CreateOwnerResponse, CreateOwnerRequest>({
            query: (data) => ({
                url: '/bootstrap/owner',
                method: 'POST',
                data,
            }),
        }),

        // Owner lists Teacher Invitations
        getTeacherInvitations: builder.query<TeacherInvitationItem[], void>({
            query: () => ({
                url: '/owner/teacher-invitations',
                method: 'GET',
            }),
            providesTags: ['TeacherInvitations'],
        }),

        // Owner invites Teacher
        createTeacherInvitation: builder.mutation<CreateTeacherInvitationResponse, CreateTeacherInvitationRequest>({
            query: (data) => ({
                url: '/owner/teacher-invitations',
                method: 'POST',
                data,
            }),
            invalidatesTags: ['TeacherInvitations'],
        }),

        // Owner revokes Teacher Invitation
        revokeTeacherInvitation: builder.mutation<{ message: string }, string>({
            query: (invitationId) => ({
                url: `/owner/teacher-invitations/${invitationId}/revoke`,
                method: 'POST',
            }),
            invalidatesTags: ['TeacherInvitations'],
        }),

        // Validate Teacher Invitation Token (Public)
        validateTeacherInvitation: builder.query<ValidateTeacherInvitationResponse, string>({
            query: (token) => ({
                url: '/teacher-invitations/validate',
                method: 'GET',
                params: { token },
            }),
            keepUnusedDataFor: 0,
        }),

        // Teacher redeems invitation
        redeemTeacherInvitation: builder.mutation<RedeemTeacherInvitationResponse, RedeemTeacherInvitationRequest>({
            query: (data) => ({
                url: '/teacher-invitations/redeem',
                method: 'POST',
                data,
            }),
            invalidatesTags: ['TeacherInvitations'],
        }),
    }),
});

export const {
    useCreateOwnerMutation,
    useGetTeacherInvitationsQuery,
    useCreateTeacherInvitationMutation,
    useRevokeTeacherInvitationMutation,
    useValidateTeacherInvitationQuery,
    useLazyValidateTeacherInvitationQuery,
    useRedeemTeacherInvitationMutation,
} = bootstrapApi;