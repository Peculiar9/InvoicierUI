import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useChartData = (
  type: 'revenue' | 'status',
  period?: 'week' | 'month' | 'year'
) => {
  return useQuery({
    queryKey: ['dashboard', 'charts', type, period],
    queryFn: () => dashboardApi.getChartData(type, period),
    staleTime: 60 * 1000,
  });
};

export const useRecentInvoices = (limit?: number) => {
  return useQuery({
    queryKey: ['dashboard', 'recent-invoices', limit],
    queryFn: () => dashboardApi.getRecentInvoices(limit),
    staleTime: 30 * 1000,
  });
};

export const useRecentActivities = (limit?: number) => {
  return useQuery({
    queryKey: ['dashboard', 'activities', limit],
    queryFn: () => dashboardApi.getRecentActivities(limit),
    staleTime: 30 * 1000,
  });
};

export const useDashboardData = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.getDashboardData(),
    staleTime: 30 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
};
