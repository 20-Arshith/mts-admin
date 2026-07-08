import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const DEFAULT_BACKEND_BASE_URL = 'http://147.79.68.37/';
const LEGACY_DEV_BACKEND_PORT = '3000';

const trimTrailingSlashes = (value = '') => String(value).trim().replace(/\/+$/, '');

const ensureApiPath = (value = '') => {
    const normalized = trimTrailingSlashes(value);

    if (!normalized) {
        return '';
    }

    return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
};

const isLocalHostname = (hostname = '') =>
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname.endsWith('.local');

const FALLBACK_API_BASE = ensureApiPath(DEFAULT_BACKEND_BASE_URL);

function getBundlerHost() {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
        const match = scriptURL.match(/https?:\/\/([^/:]+)/i) || scriptURL.match(/exp(?:s)?:\/\/([^/:]+)/i);
        if (match?.[1]) {
            return match[1];
        }
    }

    const serverHost = NativeModules?.PlatformConstants?.ServerHost;
    if (serverHost) {
        return serverHost.split(':')[0];
    }

    return null;
}

function getApiBaseUrl() {
    const configuredBase = ensureApiPath(process.env.EXPO_PUBLIC_API_BASE_URL);
    if (configuredBase) {
        return configuredBase;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const browserHost = window.location.hostname || 'localhost';
        if (isLocalHostname(browserHost)) {
            const host = browserHost === 'localhost' ? '127.0.0.1' : browserHost;
            return ensureApiPath(`http://${host}:${LEGACY_DEV_BACKEND_PORT}`);
        }
    }

    const host = getBundlerHost();
    return host && isLocalHostname(host)
        ? ensureApiPath(`http://${host}:${LEGACY_DEV_BACKEND_PORT}`)
        : FALLBACK_API_BASE;
}

const BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to inject the JWT token automatically
apiClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle global authentication errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token is invalid/expired
            console.log('Unauthorized request. Logging out...');
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
            // Depending on state management, redirect to Login here or dispatch logout event
        }
        return Promise.reject(error);
    }
);

export const authService = {
    sendOtp: (contact: string, options?: { actorType?: string }) =>
        apiClient.post('/auth/send-otp', {
            contact,
            ...(options?.actorType ? { actorType: options.actorType } : {}),
        }),
    verifyOtp: (contact: string, otp: string, options?: { actorType?: string }) =>
        apiClient.post('/auth/verify-otp', {
            contact,
            otp,
            ...(options?.actorType ? { actorType: options.actorType } : {}),
        }),
    validateAgentCode: (agentCode: string) =>
        apiClient.post('/auth/validate-agent-code', {
            agent_code: agentCode,
        }),
    registerVendor: (data: any) => apiClient.post('/auth/register-vendor', data),
    registerAgent: (data: any) => apiClient.post('/auth/register-agent', data),
};

export const uploadService = {
    uploadImage: (formData: FormData, assetType: string = 'logo') => {
        const fd = new FormData();
        // formData already contains the file under key 'file'
        // We re-pack to attach asset_type
        return apiClient.post(`/uploads/image`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            params: { asset_type: assetType },
        });
    },
    uploadImageDirect: (formData: FormData) =>
        apiClient.post('/uploads/image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }),
};

export const vendorService = {
    getProfile: () => apiClient.get('/vendors/profile'),
    updateProfile: (data: any) => apiClient.patch('/vendors/profile', data),
    getVendorDetails: (id: string) => apiClient.get(`/vendors/${id}`),
    getCategories: () => apiClient.get('/vendors/categories'),
    getAvailability: () => apiClient.get('/vendors/availability'),
    updateAvailability: (data: any) => apiClient.patch('/vendors/availability', data),
    addService: (data: any) => apiClient.post('/vendors/services', data),
    updateService: (id: number, data: any) => apiClient.put(`/vendors/services/${id}`, data),
    updateServiceAvailability: (id: number, isAvailable: boolean) =>
        apiClient.patch(`/vendors/services/${id}/availability`, { is_available: isAvailable }),
    getMyReels: (params?: { page?: number; limit?: number }) => apiClient.get('/reels/my', { params }),
    uploadReel: (formData: FormData) => apiClient.post('/reels', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    }),
    deleteReel: (id: number) => apiClient.delete(`/reels/${id}`),
    // Gallery
    getGallery: () => apiClient.get('/vendors/gallery/my'),
    addGalleryImage: (image_url: string, caption?: string) =>
        apiClient.post('/vendors/gallery', { image_url, caption }),
    deleteGalleryImage: (id: number) => apiClient.delete(`/vendors/gallery/${id}`),
};

export const bookingService = {
    getVendorBookings: () => apiClient.get('/bookings/vendor'),
    updateStatus: (bookingId: number, status: string, completionOtp?: string) =>
        apiClient.patch(`/bookings/${bookingId}/status`, {
            status,
            ...(completionOtp ? { completion_otp: completionOtp } : {}),
        }),
};

export const notificationService = {
    getMyNotifications: (limit = 10) => apiClient.get('/notifications/my', { params: { limit } }),
    markRead: (id: number) => apiClient.patch(`/notifications/${id}/read`),
    markAllRead: () => apiClient.patch('/notifications/read-all'),
};

export const announcementService = {
    getMine: () => apiClient.get('/announcements/my'),
    create: (data: any) => apiClient.post('/announcements', data),
    update: (id: number, data: any) => apiClient.patch(`/announcements/${id}`, data),
    delete: (id: number) => apiClient.delete(`/announcements/${id}`),
};

export default apiClient;
