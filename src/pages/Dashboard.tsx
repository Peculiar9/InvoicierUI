import { DashboardLayout } from '@/components/layout';
import {
  StatCard,
  RevenueChart,
  InvoiceStatusChart,
  RecentInvoices,
  RecentActivity,
} from '@/components/dashboard';
import { useDashboardStats } from '@/hooks/useDashboard';
import { formatCurrency, formatNumber } from '@/utils/format';

export const Dashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();

  const displayStats = stats || {
    totalReceived: 13009,
    totalInvoices: 3093,
    totalClients: 345,
    pendingInvoices: 23,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's your business overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Received"
            value={formatCurrency(displayStats.totalReceived)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Total Invoices"
            value={formatNumber(displayStats.totalInvoices)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            trend={{ value: 8.2, isPositive: true }}
          />
          <StatCard
            title="Total Clients"
            value={formatNumber(displayStats.totalClients)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            trend={{ value: 5.1, isPositive: true }}
          />
          <StatCard
            title="Pending Invoices"
            value={formatNumber(displayStats.pendingInvoices)}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            trend={{ value: 2.3, isPositive: false }}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RevenueChart isLoading={isLoading} />
          </div>
          <div>
            <InvoiceStatusChart isLoading={isLoading} />
          </div>
        </div>

        {/* Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentInvoices isLoading={isLoading} />
          </div>
          <div>
            <RecentActivity isLoading={isLoading} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
