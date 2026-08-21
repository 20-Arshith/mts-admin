import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, LEGACY_STORAGE_KEYS, STORAGE_KEYS } from './config';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
});

const isUserProfile = (value: any) => {
    const roleId = Number(value?.role_id ?? value?.role?.role_id);
    return roleId === 1 || roleId === 2;
};

const hasLocalStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

const getLocalItem = (key: string) => {
    if (!hasLocalStorage()) {
        return null;
    }

    return window.localStorage.getItem(key);
};

const setLocalItem = (key: string, value: string) => {
    if (hasLocalStorage()) {
        window.localStorage.setItem(key, value);
    }
};

const removeLocalItem = (key: string) => {
    if (hasLocalStorage()) {
        window.localStorage.removeItem(key);
    }
};

const parseJson = (value: string | null) => {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const decodeBase64Url = (value: string) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');

    if (typeof atob === 'function') {
        return atob(padded);
    }

    return Buffer.from(padded, 'base64').toString('utf8');
};

const getTokenPayload = (token: string | null) => {
    if (!token) {
        return null;
    }

    try {
        const payload = token.split('.')[1];
        return payload ? JSON.parse(decodeBase64Url(payload)) : null;
    } catch {
        return null;
    }
};

const isUserToken = (token: string | null) => {
    const payload = getTokenPayload(token);
    return (Number(payload?.role_id) === 1 || Number(payload?.role_id) === 2) && Number(payload?.user_id) > 0;
};

const persistUserSession = async (token: string, userRaw?: string | null) => {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    setLocalItem(STORAGE_KEYS.TOKEN, token);

    if (userRaw) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, userRaw);
        setLocalItem(STORAGE_KEYS.USER, userRaw);
    }
};

export const getStoredUserToken = async () => {
    const localToken = getLocalItem(STORAGE_KEYS.TOKEN);
    if (isUserToken(localToken)) {
        return localToken;
    }

    const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    if (isUserToken(token)) {
        setLocalItem(STORAGE_KEYS.TOKEN, token);
        return token;
    }

    const legacyLocalToken = getLocalItem(LEGACY_STORAGE_KEYS.TOKEN);
    const legacyLocalUserRaw = getLocalItem(LEGACY_STORAGE_KEYS.USER);
    if (isUserToken(legacyLocalToken) || (legacyLocalToken && isUserProfile(parseJson(legacyLocalUserRaw)))) {
        await persistUserSession(legacyLocalToken, legacyLocalUserRaw);
        return legacyLocalToken;
    }

    const [legacyAsyncToken, legacyAsyncUserRaw] = await Promise.all([
        AsyncStorage.getItem(LEGACY_STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(LEGACY_STORAGE_KEYS.USER),
    ]);

    if (!legacyAsyncToken) {
        return null;
    }

    if (!isUserToken(legacyAsyncToken) && !isUserProfile(parseJson(legacyAsyncUserRaw))) {
        return null;
    }

    await persistUserSession(legacyAsyncToken, legacyAsyncUserRaw);
    return legacyAsyncToken;
};

export const saveUserSession = async (token: string, user: any) => {
    const userJson = JSON.stringify(user);
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, userJson);
    setLocalItem(STORAGE_KEYS.TOKEN, token);
    setLocalItem(STORAGE_KEYS.USER, userJson);
};

export const clearUserSession = async () => {
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    removeLocalItem(STORAGE_KEYS.TOKEN);
    removeLocalItem(STORAGE_KEYS.USER);
};

api.interceptors.request.use(
    async (config) => {
        const token = await getStoredUserToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            console.log('Unauthorized request. Logging out...');
            await clearUserSession();
            // The UI should theoretically handle redirect on token loss
        }
        return Promise.reject(error);
    }
);

export const notificationService = {
    getMyNotifications: (limit = 10) => api.get('/notifications/my', { params: { limit } }),
    markRead: (id: number) => api.patch(`/notifications/${id}/read`),
    markAllRead: () => api.patch('/notifications/read-all'),
};

export const announcementService = {
    getActive: (location?: string) => api.get('/announcements/active', {
        params: location ? { location } : undefined,
    }),
};

export default api;
