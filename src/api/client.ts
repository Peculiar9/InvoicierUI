import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';

// Relative by default so the deployed build calls its own origin (`/api`),
// which MSW intercepts. Set VITE_API_URL to target a real backend instead.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // 30s, not 10s: Nigerian mobile networks are often slow, and a login email
  // lookup timing out reads as "broken" when it was only patient network.
  timeout: 30000,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * One refresh in flight at a time. Ten queries hitting 401 together should
 * produce one token rotation, not ten, and nine retries waiting on it.
 */
let refreshing: Promise<string> | null = null;

const refreshSession = async (): Promise<string> => {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) throw new Error('no refresh token');
  // a bare client: the interceptors on apiClient would recurse
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refresh_token: refreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
  );
  const data = response.data?.data ?? response.data;
  useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
  return data.accessToken as string;
};

const signOutHard = () => {
  useAuthStore.getState().logout();
  // Leaving a note before the reload, so the login page can explain the
  // bounce rather than looking like the app simply forgot them.
  try {
    sessionStorage.setItem('invoicier-signed-out', 'expired');
  } catch {
    // private mode, or storage full: the redirect still has to happen
  }
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
};

/**
 * Rotate the tokens ahead of a 401, sharing the same in-flight guard as the
 * reactive path. Returns true on success. Used by the session watcher to renew
 * silently before expiry; a false result means the refresh token is spent (e.g.
 * a password change cleared it), which is the cue to ask the user to stay.
 */
export const tryProactiveRefresh = async (): Promise<boolean> => {
  if (!useAuthStore.getState().refreshToken) return false;
  try {
    refreshing ??= refreshSession().finally(() => {
      refreshing = null;
    });
    await refreshing;
    return true;
  } catch {
    return false;
  }
};

/** Sign out and bounce to /login with the "your session expired" note. */
export const forceSignOut = () => signOutHard();

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;

    // 401 on a request that has not been retried, with a session to save:
    // rotate the tokens once and replay. Anything else falls through.
    if (
      status === 401 &&
      original &&
      !original._retried &&
      useAuthStore.getState().refreshToken &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      original._retried = true;
      try {
        refreshing ??= refreshSession().finally(() => {
          refreshing = null;
        });
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch {
        signOutHard();
      }
    } else if (status === 401) {
      signOutHard();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
