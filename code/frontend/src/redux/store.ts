import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './services/authApi';
import { deviceApi } from './services/deviceApi';
import { bootstrapApi } from './services/bootstrapApi';
import authReducer from './slices/authSlice';
import examPlayerReducer from './slices/examPlayerSlice';
import deviceReducer from './slices/deviceSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        examPlayer: examPlayerReducer,
        device: deviceReducer,
        [authApi.reducerPath]: authApi.reducer,
        [deviceApi.reducerPath]: deviceApi.reducer,
        [bootstrapApi.reducerPath]: bootstrapApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
            .concat(authApi.middleware)
            .concat(deviceApi.middleware)
            .concat(bootstrapApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;