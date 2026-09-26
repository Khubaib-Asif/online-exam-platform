import { createApi } from '@reduxjs/toolkit/query/react';

export interface DeviceItem {
    id: string;
    name: string;
    os?: string;
    platform?: string;
    appVersion?: string;
    isActive: boolean;
    isCurrent?: boolean;
    lastSeen?: string;
    registeredAt?: string;
    revokedAt?: string;
}

export interface RegisterDeviceRequest {
    label?: string;
    platform?: string;
    appVersion?: string;
    fingerprintHash?: string;
}

export interface RegisterDeviceResponse {
    device: DeviceItem;
    message: string;
    activeDeviceCount: number;
    maxDevices: number;
}

export interface RevokeDeviceResponse {
    message: string;
    activeDeviceCount: number;
}

export interface DeviceListResponse {
    devices: DeviceItem[];
    activeDevices?: DeviceItem[];
    revokedDevices?: DeviceItem[];
    activeCount: number;
    maxAllowed?: number;
}

// ============================================
// LAZY LOAD BASE QUERY
// ============================================

// Store the base query instance once loaded
let baseQueryInstance: any = null;

// Function to get or create base query
const getBaseQuery = async () => {
    if (!baseQueryInstance) {
        // Dynamic import to avoid circular dependency
        const { axiosBaseQuery } = await import('@/lib/axiosBaseQuery');
        baseQueryInstance = axiosBaseQuery({ baseUrl: '/v1/devices' });
    }
    return baseQueryInstance;
};


export const deviceApi = createApi({
    reducerPath: 'deviceApi',
    baseQuery: async (args, api, extraOptions) => {
        const baseQuery = await getBaseQuery();
        return baseQuery(args, api, extraOptions);
    },
    tagTypes: ['Device'],
    endpoints: (builder) => ({
        // Get all devices for current user
        getDevices: builder.query<DeviceListResponse, void>({
            query: () => ({
                url: '',
                method: 'GET',
            }),
            providesTags: ['Device'],
        }),

        // Register a new device
        registerDevice: builder.mutation<RegisterDeviceResponse, RegisterDeviceRequest>({
            query: (deviceData) => ({
                url: '',
                method: 'POST',
                data: deviceData,
            }),
            invalidatesTags: ['Device'],
        }),

        // Revoke a device
        revokeDevice: builder.mutation<RevokeDeviceResponse, string>({
            query: (deviceId) => ({
                url: `/${deviceId}/revoke`,
                method: 'POST',
            }),
            invalidatesTags: ['Device'],
        }),

        // Revoke all other devices (Telegram style)
        revokeOtherDevices: builder.mutation<{ revokedCount: number; success: boolean }, { currentDeviceId?: string } | void>({
            query: (body) => ({
                url: '/revoke-others',
                method: 'POST',
                data: body || {},
            }),
            invalidatesTags: ['Device'],
        }),
    }),
});

export const {
    useGetDevicesQuery,
    useRegisterDeviceMutation,
    useRevokeDeviceMutation,
    useRevokeOtherDevicesMutation,
} = deviceApi;