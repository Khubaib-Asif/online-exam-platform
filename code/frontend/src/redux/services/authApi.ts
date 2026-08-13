import { createApi } from '@reduxjs/toolkit/query/react';
import { type UserProfile } from '@redux/slices/authSlice';

// ============================================
// RESPONSE TYPES
// ============================================

export interface LoginResponse {
    user: UserProfile;
    accessToken: string;
}

export interface RegisterResponse {
    user: UserProfile;
    accessToken: string;
    refreshToken: string;
}

export interface ForgotPasswordResponse {
    message: string;
}

export interface ResetPasswordResponse {
    message: string;
}

export interface VerifyEmailResponse {
    message: string;
}

export interface RefreshTokenResponse {
    accessToken: string;
}

export interface ValidateResetTokenResponse {
    isValid: boolean;
    isUsed: boolean;
    expiresAt: string;
    email: string;
}

export interface ValidateEmailTokenResponse {
    isValid: boolean;
    email: string;
}

// ============================================
// REQUEST TYPES
// ============================================

export interface LoginRequest {
    email: string;
    password: string;
    keepMeSignedIn?: boolean;
}

export interface RegisterRequest {
    ProfilePic?: File | null;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    termsAccepted?: boolean;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    newPassword: string;
}

export interface VerifyEmailRequest {
    token: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
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
        baseQueryInstance = axiosBaseQuery({ baseUrl: '/v1/auth' });
        console.log('Base query initialized');
    }
    return baseQueryInstance;
};

// ============================================
// API SERVICE
// ============================================


export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: async (args, api, extraOptions) => {
        const baseQuery = await getBaseQuery();
        return baseQuery(args, api, extraOptions);
    },
    tagTypes: ['Auth', 'User'],
    endpoints: (builder) => ({
        // ------------------------------
        // AUTHENTICATION ENDPOINTS
        // ------------------------------

        // Login
        login: builder.mutation<LoginResponse, LoginRequest>({
            query: (credentials) => ({
                url: '/login',
                method: 'POST',
                data: credentials,
            }),
            invalidatesTags: ['Auth'],
        }),

        // Register (Student self-registration)
        register: builder.mutation<RegisterResponse, RegisterRequest>({
            query: (userData) => ({
                url: '/register',
                method: 'POST',
                data: userData,
            }),
        }),

        // Forgot Password
        forgotPassword: builder.mutation<ForgotPasswordResponse, ForgotPasswordRequest>({
            query: (data) => ({
                url: '/forgot-password',
                method: 'POST',
                data,
            }),
        }),

        // Reset Password
        resetPassword: builder.mutation<ResetPasswordResponse, ResetPasswordRequest>({
            query: (data) => ({
                url: '/reset-password',
                method: 'POST',
                data,
            }),
            invalidatesTags: ['Auth'],
        }),

        // Verify Email
        verifyEmail: builder.mutation<VerifyEmailResponse, VerifyEmailRequest>({
            query: (data) => ({
                url: '/verify-email',
                method: 'POST',
                data,
            }),
            invalidatesTags: ['User'],
        }),

        // Refresh Token
        refreshToken: builder.mutation<RefreshTokenResponse, RefreshTokenRequest>({
            query: (data) => ({
                url: '/refresh-token',
                method: 'POST',
                data,
            }),
        }),

        // Logout
        logout: builder.mutation<{ message: string }, void>({
            query: () => ({
                url: '/logout',
                method: 'POST',
            }),
            invalidatesTags: ['Auth'],
        }),

        // ------------------------------
        // TOKEN VALIDATION ENDPOINTS
        // ------------------------------

        // Validate Reset Token
        validateResetToken: builder.query<ValidateResetTokenResponse, string>({
            query: (token) => ({
                url: `/validate-reset-token`,
                method: 'GET',
                params: { token },
            }),
            // Important: Don't cache token validation
            keepUnusedDataFor: 0,
            // Provide tags so we can invalidate if needed
            providesTags: (token) => [{ type: 'Auth', id: `reset-token-${token}` }],
        }),

        // Validate Email Verification Token
        validateEmailToken: builder.query<ValidateEmailTokenResponse, string>({
            query: (token) => ({
                url: `/validate-email-token`,
                method: 'GET',
                params: { token },
            }),
            // Important: Don't cache token validation
            keepUnusedDataFor: 0,
            // Provide tags so we can invalidate if needed
            providesTags: (token) => [{ type: 'Auth', id: `email-token-${token}` }],
        }),
    }),
});

// ============================================
// EXPORT HOOKS
// ============================================

export const {
    // Auth mutations
    useLoginMutation,
    useRegisterMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useVerifyEmailMutation,
    useRefreshTokenMutation,
    useLogoutMutation,

    // Token validation queries
    useValidateResetTokenQuery,
    useValidateEmailTokenQuery,

    // Utility hooks
    useLazyValidateResetTokenQuery,
    useLazyValidateEmailTokenQuery,
} = authApi;

// ============================================
// EXPORT TYPES
// ============================================

export type AuthApi = typeof authApi;