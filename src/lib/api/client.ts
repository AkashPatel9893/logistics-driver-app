import axios, { type AxiosRequestConfig, create } from 'axios';
import { FileSystemUploadType, uploadAsync } from 'expo-file-system/legacy';

import { getSessionVersion, getToken, setRefreshedToken } from '../auth/utils';
import { ApiError, httpError, toApiError } from './api-error';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';

export const client = create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  // Tells the shared backend which user pool (customer or driver) a token belongs to.
  headers: { 'Content-Type': 'application/json', 'X-Client-App': 'driver' },
});

// Read the token per request so a new login is picked up immediately.
client.interceptors.request.use((config) => {
  const token = getToken();
  if (token?.accessToken) config.headers.Authorization = `Bearer ${token.accessToken}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;

/** Registered by the auth store: ends the session when the API returns 401. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

let refresh: { version: number; promise: Promise<string | null> } | null = null;

async function refreshAccessToken(version: number): Promise<string | null> {
  const currentToken = getToken();
  if (!currentToken?.refreshToken) return null;

  try {
    const res = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refresh_token: currentToken.refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Client-App': 'driver',
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
    );
    const data = res.data?.data ?? res.data;
    if (data?.access_token) {
      const newToken = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? currentToken.refreshToken,
      };
      return setRefreshedToken(newToken, version) ? data.access_token : null;
    }
  } catch {
    // refresh failed
  }
  return null;
}

/** One refresh at a time: requests that need a new token while one is coming wait for it. */
function sharedRefresh(version: number): Promise<string | null> {
  if (!refresh || refresh.version !== version) {
    const pending = refreshAccessToken(version);
    refresh = { version, promise: pending };
    void pending.finally(() => {
      if (refresh?.promise === pending) refresh = null;
    });
  }
  return refresh.promise;
}

/**
 * For connections that don't go through `request` (the offer stream): gets a new access token after
 * the server said the session was revoked or the token expired. If that fails, the session ends
 * (login screen). Returns the new token, or null.
 */
export async function renewSession(): Promise<string | null> {
  const version = getSessionVersion();
  const token = await sharedRefresh(version);
  if (!token && version === getSessionVersion()) onUnauthorized?.();
  return token;
}

/** Seconds until the JWT access token expires, or null if it can't be read. */
function secondsUntilExpiry(accessToken: string): number | null {
  try {
    const payload = accessToken.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!payload) return null;
    const { exp } = JSON.parse(
      atob(payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=')),
    );
    return typeof exp === 'number' ? exp - Date.now() / 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Refreshes the access token before sending if it has (nearly) expired. Needed for uploads: the
 * server rejects an expired token before reading the photo and closes the connection, so the app
 * gets a network error ("Stream Closed") instead of a 401 and the usual refresh-on-401 never runs.
 * For other requests it saves the round trip of a 401.
 */
async function ensureFreshToken(version: number, url: string): Promise<void> {
  if (url.includes('/auth/')) return;
  const token = getToken();
  if (!token?.accessToken || !token.refreshToken) return;
  const left = secondsUntilExpiry(token.accessToken);
  if (left !== null && left < 30) await sharedRefresh(version);
}

/**
 * Sends a request and returns the envelope's `data`, or throws an ApiError.
 * Every endpoint function goes through this.
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const version = getSessionVersion();
  await ensureFreshToken(version, config.url ?? '');
  try {
    const response = await client.request<any>(config);
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data as T;
    }
    return response.data as T;
  } catch (error) {
    const apiError = toApiError(error);
    const url = config.url ?? '';
    const isAuthEndpoint =
      url.includes('/auth/login') || url.includes('/auth/otp') || url.includes('/auth/refresh');

    if (apiError.isUnauthorized && !isAuthEndpoint && version === getSessionVersion()) {
      const newAccessToken = await sharedRefresh(version);
      if (version !== getSessionVersion()) throw apiError;
      if (newAccessToken) {
        const retryConfig = {
          ...config,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${newAccessToken}`,
          },
        };
        try {
          const retryResponse = await client.request<any>(retryConfig);
          if (
            retryResponse.data &&
            typeof retryResponse.data === 'object' &&
            'data' in retryResponse.data
          ) {
            return retryResponse.data.data as T;
          }
          return retryResponse.data as T;
        } catch (retryError) {
          const normalized = toApiError(retryError);
          if (normalized.isUnauthorized && version === getSessionVersion()) onUnauthorized?.();
          throw normalized;
        }
      }
      onUnauthorized?.();
    }
    throw apiError;
  }
}

export interface MultipartUpload {
  url: string;
  /** Local file URI of the photo. */
  fileUri: string;
  mimeType: string;
  fieldName?: string;
  /** Query string parameters. */
  params?: Record<string, string>;
  /** Extra text fields sent with the file. */
  fields?: Record<string, string>;
}

/**
 * Uploads a local file as multipart/form-data and returns the envelope's `data`, or throws an
 * ApiError. Same auth handling as `request` (refresh before an expired token, retry once on 401).
 *
 * Not axios: on Android, React Native sends FormData files with chunked transfer encoding (no
 * Content-Length), and the backend drops chunked uploads ("Stream Closed", shown as no internet).
 * Expo's uploader sends the file with its length.
 */
export async function uploadMultipart<T>(upload: MultipartUpload): Promise<T> {
  const version = getSessionVersion();
  await ensureFreshToken(version, upload.url);
  const query = upload.params ? `?${new URLSearchParams(upload.params).toString()}` : '';

  const send = async (accessToken: string | undefined, attempt = 0): Promise<any> => {
    try {
      return await uploadAsync(`${API_BASE_URL}${upload.url}${query}`, upload.fileUri, {
        httpMethod: 'POST',
        uploadType: FileSystemUploadType.MULTIPART,
        fieldName: upload.fieldName ?? 'file',
        mimeType: upload.mimeType,
        parameters: upload.fields,
        headers: {
          Accept: 'application/json',
          'X-Client-App': 'driver',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });
    } catch (error) {
      if (__DEV__) console.warn('[upload] failed', upload.url, error);
      // The first upload after the app starts sometimes drops its connection: try once more.
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return send(accessToken, 1);
      }
      throw new ApiError('No internet connection.', 'network');
    }
  };

  let response = await send(getToken()?.accessToken);
  if (response.status === 401 && version === getSessionVersion()) {
    const newAccessToken = await sharedRefresh(version);
    if (newAccessToken && version === getSessionVersion()) response = await send(newAccessToken);
    if (response.status === 401 && version === getSessionVersion()) onUnauthorized?.();
  }

  let payload: any = null;
  try {
    payload = response.body ? JSON.parse(response.body) : null;
  } catch {
    // Not JSON (e.g. a proxy error page).
  }
  if (response.status < 200 || response.status >= 300) throw httpError(response.status, payload);
  return (
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload
  ) as T;
}
