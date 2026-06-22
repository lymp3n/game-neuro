import Constants from 'expo-constants';
import { Platform } from 'react-native';

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, '');
}

function hostFromUri(value: string | undefined | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/^https?:\/\//, '').split('/')[0];
  const host = cleaned.split(':')[0];
  return host || null;
}

function resolveDevHost(): string | null {
  const fromHostUri = hostFromUri(Constants.expoConfig?.hostUri);
  if (fromHostUri && fromHostUri !== 'localhost' && fromHostUri !== '127.0.0.1') {
    return fromHostUri;
  }

  const debuggerHost =
    Constants.expoGoConfig?.debuggerHost ??
    (Constants as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost;

  if (debuggerHost) {
    return debuggerHost.split(':')[0];
  }

  return fromHostUri;
}

export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return stripTrailingSlash(process.env.EXPO_PUBLIC_API_URL);
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `http://${window.location.hostname}:3001`;
    }
    return 'http://localhost:3001';
  }

  if (Platform.OS === 'android' && !Constants.isDevice) {
    return 'http://10.0.2.2:3001';
  }

  const devHost = resolveDevHost();
  if (devHost) {
    return `http://${devHost}:3001`;
  }

  return 'http://localhost:3001';
}

export const API_URL = getApiBaseUrl();

export function getWsUrl(path: string): string {
  const wsBase = API_URL.replace(/^http/, 'ws');
  return `${wsBase}${path.startsWith('/') ? path : `/${path}`}`;
}
