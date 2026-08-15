import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { type Device } from '@redux/services/deviceApi';

interface DeviceState {
    devices: Device[];
    activeCount: number;
    maxDevices: number;
    isLoading: boolean;
    error: string | null;
}

const initialState: DeviceState = {
    devices: [],
    activeCount: 0,
    maxDevices: 2,
    isLoading: false,
    error: null,
};

const deviceSlice = createSlice({
    name: 'device',
    initialState,
    reducers: {
        setDevices: (state, action: PayloadAction<Device[]>) => {
            state.devices = action.payload;
            state.activeCount = action.payload.filter(d => d.isActive).length;
        },
        setActiveCount: (state, action: PayloadAction<number>) => {
            state.activeCount = action.payload;
        },
        setMaxDevices: (state, action: PayloadAction<number>) => {
            state.maxDevices = action.payload;
        },
        setDeviceLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setDeviceError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        addDevice: (state, action: PayloadAction<Device>) => {
            state.devices.push(action.payload);
            state.activeCount = state.devices.filter(d => d.isActive).length;
        },
        removeDevice: (state, action: PayloadAction<string>) => {
            state.devices = state.devices.filter(d => d.id !== action.payload);
            state.activeCount = state.devices.filter(d => d.isActive).length;
        },
        clearDevices: () => initialState,
    },
});

export const {
    setDevices,
    setActiveCount,
    setMaxDevices,
    setDeviceLoading,
    setDeviceError,
    addDevice,
    removeDevice,
    clearDevices,
} = deviceSlice.actions;

export default deviceSlice.reducer;