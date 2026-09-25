import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type SystemRole = "OWNER" | "TEACHER" | "STUDENT" | "PROCTOR";
export type BootstrapStatus = "UNINITIALISED" | "INITIALISED";

export interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    role: SystemRole;
    isEmailVerified: boolean;
}

interface AuthState {
    user: UserProfile | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    bootstrapStatus: BootstrapStatus;
    deviceCap: {
        activeDevices: number;
        maxDevices: number;
    };
}

const getInitialAuthState = (): AuthState => {
    let storedToken: string | null = null;
    let storedUser: UserProfile | null = null;

    if (typeof window !== 'undefined') {
        try {
            storedToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
            const userJson = localStorage.getItem('user') || sessionStorage.getItem('user');
            if (userJson) {
                storedUser = JSON.parse(userJson);
            }
        } catch (e) {
            console.warn('Failed to parse stored auth:', e);
        }
    }

    return {
        user: storedUser,
        accessToken: storedToken,
        isAuthenticated: !!(storedToken && storedUser),
        bootstrapStatus: storedUser ? "INITIALISED" : "UNINITIALISED",
        deviceCap: {
            activeDevices: 0,
            maxDevices: 2,
        },
    };
};

const initialState: AuthState = getInitialAuthState();

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuth: (
            state,
            action: PayloadAction<{
                user: UserProfile;
                accessToken: string;
            }>
        ) => {
            state.user = action.payload.user;
            state.accessToken = action.payload.accessToken;
            state.isAuthenticated = true;
        },

        updateUser: (
            state,
            action: PayloadAction<Partial<UserProfile>>
        ) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        },

        setBootstrapStatus: (
            state,
            action: PayloadAction<BootstrapStatus>
        ) => {
            state.bootstrapStatus = action.payload;
        },

        updateDeviceCap: (
            state,
            action: PayloadAction<{ activeDevices: number; maxDevices?: number }>
        ) => {
            state.deviceCap.activeDevices = action.payload.activeDevices;
            if (action.payload.maxDevices) {
                state.deviceCap.maxDevices = action.payload.maxDevices;
            }
        },

        setAccessToken: (
            state,
            action: PayloadAction<string>
        ) => {
            state.accessToken = action.payload;
        },

        logout: (state) => {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
            state.deviceCap.activeDevices = 0;
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                sessionStorage.removeItem('accessToken');
                sessionStorage.removeItem('user');
            }
        },
    },
});

export const {
    setAuth,
    updateUser,
    setBootstrapStatus,
    updateDeviceCap,
    setAccessToken,
    logout,
} = authSlice.actions;

export default authSlice.reducer;