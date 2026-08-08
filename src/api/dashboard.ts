import apiClient from './client';
import type {
  Activity,
  ApiResponse,
  ChartData,
  DashboardData,
  DashboardStats,
  Invoice,
} from '@/types';

/* ----------------------------------------------------------------------
   The real backend answers with FACTS (rows, counts, minor units); chart
   shapes and legacy field names are presentation, so they are built HERE,
   at the boundary, never on the server.
   ---------------------------------------------------------------------- */

const CURRENCY_COLORS: Record<string, string> = {
  NGN: '#924ee9',
  USD: '#0c8d6f',
  EUR: '#2b6cb0',
  GBP: '#b97d10',
};

interface RevenueRow { month: string; currency: string; received: number }
interface StatusRow { status: string; count: number }

const prettyMonth = (key: string): string =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short' });

/** fact rows → one dataset per currency; money never sums across currencies */
const revenueToChart = (rows: RevenueRow[]): ChartData => {
  const months = [...new Set(rows.map((r) => r.month))].sort();
  const currencies = [...new Set(rows.map((r) => r.currency))];
  return {
    labels: months.map(prettyMonth),
    datasets: currencies.map((currency) => ({
      label: currency,
      data: months.map(
        (month) =>
          (rows.find((r) => r.month === month && r.currency === currency)?.received ?? 0) / 100
      ),
      backgroundColor: CURRENCY_COLORS[currency] ?? '#9b99ab',
      borderColor: CURRENCY_COLORS[currency] ?? '#9b99ab',
      borderWidth: 2,
    })),
  };
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#9b99ab', sent: '#924ee9', viewed: '#2b6cb0', awaiting: '#b97d10',
  paid: '#0c8d6f', receipted: '#0c8d6f', cancelled: '#d0cede', overdue: '#d4453c',
};

const statusToChart = (rows: StatusRow[]): ChartData => ({
  labels: rows.map((r) => r.status),
  datasets: [
    {
      label: 'Invoices',
      data: rows.map((r) => r.count),
      backgroundColor: rows.map((r) => STATUS_COLORS[r.status] ?? '#9b99ab'),
    },
  ],
});

interface RealStats {
  by_currency: { currency: string; collected: number; outstanding: number; n?: number }[];
  total_invoices: number;
  total_clients: number;
  pending_invoices: number;
  overdue_invoices: number;
  paid_count: number;
  tax_ready_paid: number;
}

const statsToLegacy = (real: RealStats): DashboardStats => {
  const lead = [...(real.by_currency ?? [])].sort((a, b) => b.collected - a.collected)[0];
  return {
    total_received: lead?.collected ?? 0,
    total_invoices: real.total_invoices ?? 0,
    total_clients: real.total_clients ?? 0,
    pending_invoices: real.pending_invoices ?? 0,
    overdue_invoices: real.overdue_invoices ?? 0,
    paid_this_month: 0,
    tax_ready_paid: real.tax_ready_paid ?? 0,
    paid_count: real.paid_count ?? 0,
  };
};

interface RealActivity {
  id: string;
  type: Activity['type'];
  description: string;
  created_at?: string;
  timestamp?: string;
  invoice_id?: string | null;
  client_id?: string | null;
}

const toActivity = (row: RealActivity): Activity => ({
  id: row.id,
  type: row.type,
  description: row.description,
  timestamp: row.timestamp ?? row.created_at ?? new Date().toISOString(),
  invoice_id: row.invoice_id ?? undefined,
  client_id: row.client_id ?? undefined,
});

export interface ConvertedSummary {
  target_currency: string;
  approximate: boolean;
  complete: boolean;
  rate_as_of: string | null;
  collected_total: number;
  outstanding_total: number;
  breakdown: {
    currency: string;
    collected: number;
    outstanding: number;
    rate: number | null;
    rate_source: string | null;
    collected_converted: number | null;
    outstanding_converted: number | null;
  }[];
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<RealStats | DashboardStats>>(
      '/dashboard/stats'
    );
    const data = response.data.data;
    return 'by_currency' in data ? statsToLegacy(data as RealStats) : (data as DashboardStats);
  },

  /** everything in ONE currency at today's rate, labelled approximate */
  getSummary: async (target: string): Promise<ConvertedSummary> => {
    const response = await apiClient.get<ApiResponse<ConvertedSummary>>(
      '/dashboard/summary',
      { params: { in: target } }
    );
    return response.data.data;
  },

  getChartData: async (
    type: 'revenue' | 'status',
    period?: 'week' | 'month' | 'year'
  ): Promise<ChartData> => {
    const response = await apiClient.get<ApiResponse<unknown>>(
      `/dashboard/charts/${type}`,
      { params: { period } }
    );
    const data = response.data.data;
    if (Array.isArray(data)) {
      return type === 'revenue'
        ? revenueToChart(data as RevenueRow[])
        : statusToChart(data as StatusRow[]);
    }
    return data as ChartData;
  },

  getRecentInvoices: async (limit?: number): Promise<Invoice[]> => {
    const response = await apiClient.get<ApiResponse<Invoice[]>>(
      '/dashboard/recent-invoices',
      { params: { limit } }
    );
    return response.data.data;
  },

  getRecentActivities: async (limit?: number): Promise<Activity[]> => {
    const response = await apiClient.get<ApiResponse<RealActivity[]>>(
      '/dashboard/activities',
      { params: { limit } }
    );
    return response.data.data.map(toActivity);
  },

  getDashboardData: async (): Promise<DashboardData> => {
    const response = await apiClient.get<ApiResponse<unknown>>('/dashboard');
    const data = response.data.data as Record<string, unknown>;
    // the real composite is facts: {stats, recent_invoices, revenue, statuses, aging, activities}
    if ('revenue' in data) {
      return {
        stats: statsToLegacy(data.stats as RealStats),
        revenue_chart: revenueToChart((data.revenue as RevenueRow[]) ?? []),
        invoice_status_chart: statusToChart((data.statuses as StatusRow[]) ?? []),
        recent_invoices: (data.recent_invoices as Invoice[]) ?? [],
        recent_activities: ((data.activities as RealActivity[]) ?? []).map(toActivity),
      };
    }
    return data as unknown as DashboardData;
  },
};
