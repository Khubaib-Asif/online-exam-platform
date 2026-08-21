import axios from 'axios';
import type { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { store } from '@redux/store';
import { logout, setAccessToken } from '@redux/slices/authSlice';

// Configuration
const API_BASE_URL = import.meta.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const API_TIMEOUT = 30000;

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // Important for HttpOnly cookies
});

// Token refresh state
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: AxiosResponse) => void;
    reject: (reason?: any) => void;
    config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: any | null, token: string | null = null): void => {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else if (token) {
            promise.config.headers = promise.config.headers || {};
            promise.config.headers.Authorization = `Bearer ${token}`;
            api(promise.config)
                .then((response) => promise.resolve(response))
                .catch((err) => promise.reject(err));
        }
    });
    failedQueue = [];
};

// Request interceptor - Add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const state = store.getState();
        const accessToken = state.auth.accessToken;

        if (accessToken && config.headers) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Add session ID for exam endpoints
        const sessionId = state.examPlayer.sessionId;
        if (sessionId && config.url?.includes('/exam')) {
            config.headers = config.headers || {};
            config.headers['X-Session-Id'] = sessionId;
        }

        // Add device ID
        const deviceId = localStorage.getItem('deviceId');
        if (deviceId) {
            config.headers = config.headers || {};
            config.headers['X-Device-Id'] = deviceId;
        }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        // Don't retry if already retried or not a 401
        if (
            originalRequest._retry ||
            error.response?.status !== 401 ||
            originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/refresh-token') ||
            originalRequest.url?.includes('/auth/logout')
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject, config: originalRequest });
            });
        }

        isRefreshing = true;

        try {
            // Refresh token is automatically sent via HttpOnly cookie
            // No need to pass it explicitly
            const response = await axios.post(
                `${API_BASE_URL}/v1/auth/refresh-token`,
                {}, // Empty body - cookie will be sent automatically
                {
                    withCredentials: true,
                    headers: { 'Content-Type': 'application/json' },
                }
            );

            const newAccessToken = response.data.accessToken;
            store.dispatch(setAccessToken(newAccessToken));

            processQueue(null, newAccessToken);

            if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            return api(originalRequest);

        } catch (refreshError) {
            processQueue(refreshError, null);
            store.dispatch(logout());

            if (typeof window !== 'undefined') {
                window.location.href = '/login?session=expired';
            }

            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export const axiosBaseQuery =
    ({ baseUrl } = { baseUrl: '' }) =>
        async ({ url, method, data, params, headers = {} }: any) => {
            try {
                const cleanUrl = baseUrl && url
                    ? `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
                    : baseUrl || url;

                const result = await api({
                    url: cleanUrl,
                    method,
                    data,
                    params,
                    headers,
                });

                const responseData = result.data?.data !== undefined ? result.data.data : result.data;
                return { data: responseData };
            } catch (axiosError: any) {
                return {
                    error: {
                        status: axiosError.response?.status,
                        data: axiosError.response?.data || axiosError.message,
                    },
                };
            }
            finally {
                // Optional: Log the request and response for debugging
                console.log(`[AxiosBaseQuery] ${method.toUpperCase()} ${url}`, {
                    data,
                    params,
                    headers,
                });
            }
        };