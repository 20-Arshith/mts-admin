import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config/api';

const apiClient = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.log('Unauthorized request. Logging out...');
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userData');
        }
        return Promise.reject(error);
    }
);

export const authService = {
    sendOtp: (contact) => apiClient.post('/auth/send-otp', { contact, actorType: 'agent' }),
    verifyOtp: (contact, otp) => apiClient.post('/auth/verify-otp', { contact, otp, actorType: 'agent' }),
    // For agent registration - use 'agent_registration' actorType so backend skips agent/vendor
    // access checks and only verifies the OTP. This prevents the 'Agent referral required' error
    // that occurs when retrying registration with a pending (no referral_code) agent account.
    sendRegistrationOtp: (contact) => apiClient.post('/auth/send-otp', { contact, actorType: 'agent_registration' }),
    verifyRegistrationOtp: (contact, otp) => apiClient.post('/auth/verify-otp', { contact, otp, actorType: 'agent_registration' }),
    sendVendorRegistrationOtp: (contact) =>
        apiClient.post('/auth/send-otp', { contact, actorType: 'vendor_registration' }),
    verifyVendorRegistrationOtp: (contact, otp) =>
        apiClient.post('/auth/verify-otp', { contact, otp, actorType: 'vendor_registration' }),
    registerVendor: (data) => apiClient.post('/auth/register-vendor', data),
    registerAgent: async (data) => {
        try {
            return await apiClient.post('/auth/register-agent', data);
        } catch (error) {
            if (error?.response?.status === 404) {
                try {
                    return await apiClient.post('/agents/register', data);
                } catch (fallbackError) {
                    if ([401, 403, 404].includes(fallbackError?.response?.status)) {
                        fallbackError.response = {
                            ...fallbackError.response,
                            data: {
                                ...fallbackError.response?.data,
                                message: 'Agent registration is not available on this backend. Please redeploy the backend.',
                            },
                        };
                    }
                    throw fallbackError;
                }
            }
            throw error;
        }
    },
};

export const agentService = {
    getVendors: () => apiClient.get('/agents/my-vendors'),
    getProfile: () => apiClient.get('/agents/profile'),
    updateProfile: (data) => apiClient.put('/agents/profile', data),
    getCommission: () => apiClient.get('/agents/commission'),
    createPayoutRequest: (data) => apiClient.post('/agents/payout', data),
    getCategories: () => apiClient.get('/vendors/categories'),
};

export const notificationService = {
    getMyNotifications: (limit = 10) => apiClient.get('/notifications/my', { params: { limit } }),
    markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
    markAllRead: () => apiClient.patch('/notifications/read-all'),
};

export default apiClient;
