import apiClient from './client';
import type { User, LoginCredentials, SignupCredentials, ApiResponse } from '@/types';

/** What the backend hands back wherever a session starts or rotates. */
export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  /** present after signup: the handle the verify-email flow needs */
  verification?: { reference: string; expiry: number; email: string };
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthSession> => {
    const response = await apiClient.post<ApiResponse<AuthSession>>(
      '/auth/login',
      credentials
    );
    return response.data.data;
  },

  signup: async (credentials: SignupCredentials): Promise<AuthSession> => {
    const response = await apiClient.post<ApiResponse<AuthSession>>(
      '/auth/register',
      credentials
    );
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    // the account surface owns the user record; /auth/me only reads it
    const response = await apiClient.put<ApiResponse<User>>(
      '/accounts/profile',
      data
    );
    return response.data.data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  resendVerification: async (email: string, reference: string): Promise<void> => {
    await apiClient.post('/auth/resend-email-verification', { email, reference });
  },

  /** authed resend: no stored handle needed, works on any device */
  resendMyVerification: async (): Promise<{ email: string; reference: string; expiry: number }> => {
    const response = await apiClient.post<ApiResponse<{ email: string; reference: string; expiry: number }>>(
      '/auth/resend-my-verification'
    );
    return response.data.data;
  },

  verifyEmail: async (
    email: string,
    reference: string,
    code: string
  ): Promise<AuthSession> => {
    const response = await apiClient.post<ApiResponse<AuthSession>>(
      '/auth/verify-email',
      { email, reference, code }
    );
    return response.data.data;
  },

  /** Trades the refresh token for a fresh pair. Deliberately unauthenticated. */
  refresh: async (refreshToken: string): Promise<AuthSession> => {
    const response = await apiClient.post<ApiResponse<AuthSession>>(
      '/auth/refresh',
      { refresh_token: refreshToken }
    );
    return response.data.data;
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, password });
  },
};
