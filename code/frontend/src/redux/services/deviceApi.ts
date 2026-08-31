import { createApi } from '@reduxjs/toolkit/query/react';

// Types
export interface Device {
    id: string;
    userId: string;
    label: string;
    os: string;
    deviceType: string;
    isActive: boolean;
    lastUsedAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface RegisterDeviceRequest {
    label?: string;
    platform?: string;
    appVersion?: string;
}

export interface RegisterDeviceResponse {
    device: Device;
    message: string;
    activeDeviceCount: number;
    maxDevices: number;
}

export interface RevokeDeviceResponse {
    message: string;
    activeDeviceCount: number;
}

export interface DeviceListResponse {
    devices: Device[];
    activeCount: number;
    maxDevices: number;
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
        baseQueryInstance = axiosBaseQuery({ baseUrl: '/v1/devices' });
        console.log('Base query initialized');
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
    }),
});

export const {
    useGetDevicesQuery,
    useRegisterDeviceMutation,
    useRevokeDeviceMutation,
} = deviceApi;