import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useState } from 'react';
import { LegacyWorkspace } from '@/components/static';
import { Skeleton } from '@/components/Skeleton';
import { useDashboardData, useInvoices } from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import type { Invoice, InvoiceStatus } from '@/types';

/* ---- reporting period ---- */

type Period = 'month' | 'quarter' | 'year' | 'all';

const PERIODS: { key: Period; label: string; sub: string }[] = [
  { key: 'month', label: 'This month', sub: 'this month' },
  { key: 'quarter', label: 'This quarter', sub: 'this quarter' },
  { key: 'year', label: 'This year', sub: 'this tax year' },
  { key: 'all', label: 'All time', sub: 'all time' },
];

const periodStart = (period: Period): Date | null => {
  const now = new Date();
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'quarter') {
    return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  }
  if (period === 'year') return new Date(now.getFullYear(), 0, 1);
  return null;
};

const inPeriod = (iso: string | undefined, start: Date | null) =>
  start === null || (Boolean(iso) && new Date(iso as string) >= start);

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

ChartJS.defaults.font.family = "'Poppins', sans-serif";
ChartJS.defaults.color = '#9b99ab';

const statusLabel: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const Dashboard = () => {
  const { data, isLoading } = useDashboardData();
  const { data: invData } = useInvoices();
  const openView = useInvoicePanelStore((s) => s.openView);
  const openCreate = useInvoicePanelStore((s) => s.openCreate);
  const [period, setPeriod] = useState<Period>('year');

  if (isLoading || !data) {
    return (
      <LegacyWorkspace active="dashboard" title="Dashboard">
        <div className="dash">
          <section className="dash-kpis">
            {[0, 1, 2, 3].map((i) => (
              <article className="dash-kpi" key={i}>
                <Skeleton width={48} height={48} radius={14} />
                <div className="dash-kpi-body" style={{ gap: 8, flex: 1 }}>
                  <Skeleton width="55%" height={10} />
                  <Skeleton width="80%" height={22} />
                  <Skeleton width="40%" height={10} />
                </div>
              </article>
            ))}
          </section>
          <section className="dash-charts">
            <article className="dash-card">
              <Skeleton width="35%" height={16} />
              <Skeleton width="100%" height={260} radius={12} className="skel-mt" />
            </article>
            <article className="dash-card">
              <Skeleton width="50%" height={16} />
              <Skeleton width="100%" height={200} radius={12} className="skel-mt" />
            </article>
          </section>
        </div>
      </LegacyWorkspace>
    );
  }

  const { stats, revenueChart, invoiceStatusChart, recentInvoices } = data;
  const allInvoices = invData?.data ?? [];

  const start = periodStart(period);
  const periodSub = PERIODS.find((p) => p.key === period)?.sub ?? '';

  // Collected follows the period on a cash basis; the money-owed figures are
  // a current balance, so they ignore the period on purpose.
  const paidInPeriod = allInvoices.filter(
    (inv) =>
      inv.status === 'paid' && inPeriod(inv.dateReceived ?? inv.updatedAt, start)
  );
  const collected = paidInPeriod.reduce(
    (sum, inv) => sum + (inv.amountReceived ?? inv.total),
    0
  );
  const issuedInPeriod = allInvoices.filter((inv) =>
    inPeriod(inv.issueDate, start)
  ).length;
  const outstanding = allInvoices
    .filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.total, 0);
  const paidCount = stats.paidCount ?? 0;
  const taxReady = stats.taxReadyPaid ?? 0;
  const marchPct = paidCount === 0 ? 100 : Math.round((taxReady / paidCount) * 100);

  const kpis = [
    {
      label: 'Collected',
      value: formatCurrency(collected),
      sub: `received ${periodSub}, cash basis`,
      icon: 'bx-wallet',
      tone: 'green',
    },
    {
      label: 'Outstanding',
      value: formatCurrency(outstanding),
      sub: `${stats.overdueInvoices} overdue`,
      icon: 'bx-time-five',
      tone: 'amber',
    },
    {
      label: 'Invoices',
      value: formatNumber(issuedInPeriod),
      sub: `issued ${periodSub}, ${stats.pendingInvoices} pending`,
      icon: 'bx-receipt',
      tone: 'purple',
    },
    {
      label: 'Clients',
      value: formatNumber(stats.totalClients),
      sub: 'active',
      icon: 'bx-group',
      tone: 'blue',
    },
  ];

  const revenueData = {
    labels: revenueChart.labels,
    datasets: [
      {
        label: 'Revenue',
        data: revenueChart.datasets[0].data,
        borderColor: '#924ee9',
        backgroundColor: 'rgba(146, 78, 233, 0.12)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#924ee9',
      },
    ],
  };

  const revenueOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: 'rgba(29,27,46,0.06)' },
        ticks: {
          font: { size: 11 },
          maxTicksLimit: 5,
          callback: (value) => formatNumber(Number(value)),
        },
      },
    },
  };

  const statusColors = ['#0c8d6f', '#e0a008', '#357fff', '#ef5d54', '#9b99ab'];
  const statusValues = invoiceStatusChart.datasets[0].data;
  const statusTotal = statusValues.reduce((a, b) => a + b, 0) || 1;

  return (
    <LegacyWorkspace
      active="dashboard"
      title="Dashboard"
      actions={[
        { label: 'New invoice', bx: 'bx-plus', onClick: openCreate },
        { label: 'Clients', bx: 'bx-user', to: '/clients' },
      ]}
    >
      <div className="dash">
        {/* reporting period */}
        <div className="iw-period" role="group" aria-label="Reporting period">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={period === p.key ? 'active' : ''}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* KPI cards */}
        <section className="dash-kpis">
          {kpis.map((kpi) => (
            <article className={`dash-kpi dash-kpi--${kpi.tone}`} key={kpi.label}>
              <span className="dash-kpi-icon">
                <i className={`bx ${kpi.icon}`} />
              </span>
              <div className="dash-kpi-body">
                <span className="dash-kpi-label">{kpi.label}</span>
                <span className="dash-kpi-value">{kpi.value}</span>
                <span className="dash-kpi-sub">{kpi.sub}</span>
              </div>
            </article>
          ))}
        </section>

        {/* March readiness: paid invoices carrying a date-received */}
        <div className="iw-march">
          <i className="bx bx-calendar-check" aria-hidden="true" />
          <span>
            <b>March readiness.</b> Paid invoices with a date received recorded:{' '}
            {taxReady} of {paidCount}.
          </span>
          <span className="iw-march-track" aria-hidden="true">
            <span className="iw-march-fill" style={{ width: `${marchPct}%` }} />
          </span>
          <span className="iw-march-pct">{marchPct}%</span>
        </div>

        {/* Invoice status: one clean line, bar + inline legend */}
        <section className="dash-card iw-statusline">
          <div className="iw-statusline-top">
            <h2>Invoice status</h2>
            <div className="iw-statusline-legend">
              {invoiceStatusChart.labels.map((label, i) => (
                <span className="iw-statusline-chip" key={label}>
                  <i style={{ background: statusColors[i] }} />
                  {label}
                  <b>{statusValues[i]}</b>
                </span>
              ))}
            </div>
          </div>
          <div className="dash-status-bar">
            {invoiceStatusChart.labels.map((label, i) =>
              statusValues[i] > 0 ? (
                <span
                  key={label}
                  className="dash-status-seg"
                  style={{ flexGrow: statusValues[i], background: statusColors[i] }}
                  title={`${label}: ${statusValues[i]} of ${statusTotal}`}
                />
              ) : null
            )}
          </div>
        </section>

        {/* Revenue, full width */}
        <section className="dash-card dash-revenue">
          <header className="dash-card-head">
            <div>
              <h2>Revenue</h2>
              <p>Last 6 months</p>
            </div>
            <span className="dash-card-figure">{formatCurrency(stats.totalReceived)}</span>
          </header>
          <div className="dash-chart">
            <Line data={revenueData} options={revenueOptions} />
          </div>
        </section>

        {/* Recent invoices, full width */}
        <section className="dash-lower dash-lower--single">
          <article className="dash-card dash-invoices">
            <header className="dash-card-head">
              <div>
                <h2>Recent invoices</h2>
                <p>{recentInvoices.length} latest</p>
              </div>
            </header>
            <div className="dash-table-wrap">
              <table className="dash-table dash-table--recent">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv: Invoice) => (
                    <tr
                      key={inv.id}
                      className="dash-row-click"
                      onClick={() => openView(inv.id)}
                    >
                      <td className="dash-mono">#{inv.invoiceNumber}</td>
                      <td>{inv.client.name}</td>
                      <td className="dash-muted">
                        {formatDate(inv.issueDate, { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="dash-amount">{formatCurrency(inv.total, inv.currency)}</td>
                      <td>
                        <span className={`dash-badge is-${inv.status}`}>
                          {statusLabel[inv.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </LegacyWorkspace>
  );
};
