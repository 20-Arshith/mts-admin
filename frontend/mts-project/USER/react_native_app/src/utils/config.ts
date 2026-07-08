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
  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  if (scriptURL) {
    const match = scriptURL.match(/https?:\/\/([^/:]+)/i) || scriptURL.match(/exp(?:s)?:\/\/([^/:]+)/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  const serverHost = (NativeModules?.PlatformConstants as { ServerHost?: string } | undefined)?.ServerHost;
  if (serverHost) {
    return serverHost.split(':')[0];
  }

  return null;
}

function getApiBaseUrl() {
  const envBase = ensureApiPath(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (envBase) {
    return envBase;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    if (isLocalHostname(host)) {
      return ensureApiPath(`http://${host}:${LEGACY_DEV_BACKEND_PORT}`);
    }
  }

  const host = getBundlerHost();
  return host && isLocalHostname(host)
    ? ensureApiPath(`http://${host}:${LEGACY_DEV_BACKEND_PORT}`)
    : FALLBACK_API_BASE;
}

export const API_BASE = getApiBaseUrl();

export const STORAGE_KEYS = {
  TOKEN: 'mtsUserToken',
  USER:  'mtsUserData',
};

export const LEGACY_STORAGE_KEYS = {
  TOKEN: 'userToken',
  USER:  'userData',
};
