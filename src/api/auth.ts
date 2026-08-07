import apiClient from './client';
import type { User, LoginCredentials, SignupCredentials, ApiResponse } from '@/types';

interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/auth/login',
      credentials
    );
    return response.data.data;
  },

  signup: async (credentials: SignupCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
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

  resendVerification: async (): Promise<void> => {
    await apiClient.post('/auth/resend-email-verification');
  },

  verifyEmail: async (token: string): Promise<void> => {
    await apiClient.post('/auth/verify-email', { token });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, password });
  },
};
