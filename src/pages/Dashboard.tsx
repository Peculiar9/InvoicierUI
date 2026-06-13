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
import { LegacyWorkspace } from '@/components/static';
import { Skeleton } from '@/components/Skeleton';
import { useDashboardData } from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { usePayoutStore } from '@/stores/payoutStore';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import type { Activity, Invoice, InvoiceStatus } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// TEMPORARY: dashboard font test — match the workspace --ws-font
ChartJS.defaults.font.family = "'DM Sans', sans-serif";
ChartJS.defaults.color = '#8a8a99';

const activityIcon: Record<Activity['type'], string> = {
  invoice_created: 'bx-plus-circle',
  invoice_sent: 'bx-send',
  invoice_paid: 'bx-check-circle',
  client_added: 'bx-user-plus',
};

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
  const openView = useInvoicePanelStore((s) => s.openView);
  const openCreate = useInvoicePanelStore((s) => s.openCreate);
  const withdrawn = usePayoutStore((s) => s.withdrawals).reduce((sum, w) => sum + w.amount, 0);

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

  const { stats, revenueChart, invoiceStatusChart, recentInvoices, recentActivities } = data;

  const outstanding = recentInvoices
    .filter((inv) => inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.total, 0);
  const available = Math.max(0, stats.totalReceived - withdrawn);

  const kpis = [
    {
      label: 'Available balance',
      value: formatCurrency(available),
      sub: `${formatCurrency(stats.totalReceived)} collected`,
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
      value: formatNumber(stats.totalInvoices),
      sub: `${stats.pendingInvoices} pending`,
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
      x: { grid: { display: false }, border: { display: false } },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: 'rgba(29,27,46,0.06)' },
        ticks: { callback: (value) => `$${formatNumber(Number(value))}` },
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

        {/* Charts row */}
        <section className="dash-charts">
          <article className="dash-card dash-revenue">
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
          </article>

          <article className="dash-card dash-status">
            <header className="dash-card-head">
              <div>
                <h2>Invoice status</h2>
                <p>{statusValues.reduce((a, b) => a + b, 0)} invoices</p>
              </div>
            </header>
            <div className="dash-status-bar">
              {invoiceStatusChart.labels.map((label, i) =>
                statusValues[i] > 0 ? (
                  <span
                    key={label}
                    className="dash-status-seg"
                    style={{ flexGrow: statusValues[i], background: statusColors[i] }}
                    title={`${label}: ${statusValues[i]}`}
                  />
                ) : null
              )}
            </div>
            <ul className="dash-status-list">
              {invoiceStatusChart.labels.map((label, i) => (
                <li key={label}>
                  <span className="dash-status-dot" style={{ background: statusColors[i] }} />
                  <span className="dash-status-name">{label}</span>
                  <span className="dash-status-count">{statusValues[i]}</span>
                  <span className="dash-status-pct">
                    {Math.round((statusValues[i] / statusTotal) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* Lower row: recent invoices + activity */}
        <section className="dash-lower">
          <article className="dash-card dash-invoices">
            <header className="dash-card-head">
              <div>
                <h2>Recent invoices</h2>
                <p>{recentInvoices.length} latest</p>
              </div>
            </header>
            <div className="dash-table-wrap">
              <table className="dash-table">
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

          <article className="dash-card dash-activity">
            <header className="dash-card-head">
              <div>
                <h2>Activity</h2>
                <p>Recent</p>
              </div>
            </header>
            <ul className="dash-feed">
              {recentActivities.map((act) => (
                <li key={act.id}>
                  <span className={`dash-feed-icon is-${act.type}`}>
                    <i className={`bx ${activityIcon[act.type]}`} />
                  </span>
                  <div className="dash-feed-body">
                    <p>{act.description}</p>
                    <time>{formatDate(act.timestamp, { month: 'short', day: 'numeric' })}</time>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </LegacyWorkspace>
  );
};
