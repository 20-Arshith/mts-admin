import axios from 'axios';

const DEFAULT_BACKEND_BASE_URL = 'http://54.147.40.109/';
const LEGACY_DEV_BACKEND_PORT = '3000';
const ADMIN_AUTH_STORAGE_KEY = 'adminToken';
const ADMIN_AUTH_EXPIRED_EVENT = 'admin-auth-expired';

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

const getLocalDevelopmentBackendBase = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  const host = window.location.hostname || '';
  if (!isLocalHostname(host)) {
    return '';
  }

  return `http://${host}:${LEGACY_DEV_BACKEND_PORT}`;
};

const getConfiguredBackendBase = () =>
  trimTrailingSlashes(import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_BASE_URL || '');

export const BACKEND_BASE_URL =
  getConfiguredBackendBase() ||
  getLocalDevelopmentBackendBase() ||
  trimTrailingSlashes(DEFAULT_BACKEND_BASE_URL);

export const API_BASE_URL = ensureApiPath(BACKEND_BASE_URL);

export const createApiUrl = (path = '') => {
  if (!path) {
    return API_BASE_URL;
  }

  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getStoredAdminToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(ADMIN_AUTH_STORAGE_KEY) || '';
};

export const clearAdminSession = (message = 'Your admin session expired. Please log in again.') => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ADMIN_AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(ADMIN_AUTH_EXPIRED_EVENT, { detail: { message } }));
};

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
});

export const adminApi = axios.create({
  baseURL: createApiUrl('/admin'),
});

adminApi.interceptors.request.use((config) => {
  const token = getStoredAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAdminSession(error.response?.data?.message || 'Your admin session expired. Please log in again.');
    }

    return Promise.reject(error);
  },
);

export { ADMIN_AUTH_EXPIRED_EVENT, ADMIN_AUTH_STORAGE_KEY };
