import apiClient from './client';
import type {
  Activity,
  ApiResponse,
  ChartData,
  DashboardData,
  DashboardStats,
  Invoice,
} from '@/types';

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>(
      '/dashboard/stats'
    );
    return response.data.data;
  },

  getChartData: async (
    type: 'revenue' | 'status',
    period?: 'week' | 'month' | 'year'
  ): Promise<ChartData> => {
    const response = await apiClient.get<ApiResponse<ChartData>>(
      `/dashboard/charts/${type}`,
      { params: { period } }
    );
    return response.data.data;
  },

  getRecentInvoices: async (limit?: number): Promise<Invoice[]> => {
    const response = await apiClient.get<ApiResponse<Invoice[]>>(
      '/dashboard/recent-invoices',
      { params: { limit } }
    );
    return response.data.data;
  },

  getRecentActivities: async (limit?: number): Promise<Activity[]> => {
    const response = await apiClient.get<ApiResponse<Activity[]>>(
      '/dashboard/activities',
      { params: { limit } }
    );
    return response.data.data;
  },

  getDashboardData: async (): Promise<DashboardData> => {
    const response = await apiClient.get<ApiResponse<DashboardData>>('/dashboard');
    return response.data.data;
  },
};
