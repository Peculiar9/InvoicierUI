import apiClient from './client';
import type { DashboardStats, ChartData, ApiResponse, Invoice } from '@/types';

interface DashboardData {
  stats: DashboardStats;
  revenueChart: ChartData;
  invoiceStatusChart: ChartData;
  recentInvoices: Invoice[];
  recentActivities: Activity[];
}

interface Activity {
  id: string;
  type: 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'client_added';
  description: string;
  timestamp: string;
  invoiceId?: string;
  clientId?: string;
}

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
