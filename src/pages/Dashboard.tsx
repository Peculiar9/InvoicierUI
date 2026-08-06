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
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { LegacyWorkspace } from '@/components/static';
import type { CSSProperties } from 'react';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { CountUp } from '@/components/CountUp';
import { SwipeScroll } from '@/components/SwipeScroll';
import { useDashboardData, useInvoices } from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { isPaid, isSettled } from '@/utils/invoiceStatus';
import { DateRange } from '@/components/DateRange';
import { EMPTY_RANGE, inDateRange, rangeIsSet } from '@/utils/dateRange';
import type { DateRangeValue } from '@/utils/dateRange';
import type { Invoice, InvoiceStatus } from '@/types';

/* ---- reporting period ---- */

type Period = 'month' | 'quarter' | 'year' | 'all' | 'custom';

const PERIODS: { key: Period; label: string; sub: string }[] = [
  { key: 'month', label: 'This month', sub: 'this month' },
  { key: 'quarter', label: 'This quarter', sub: 'this quarter' },
  { key: 'year', label: 'This year', sub: 'this tax year' },
  { key: 'all', label: 'All time', sub: 'all time' },
  { key: 'custom', label: 'Custom', sub: 'the selected dates' },
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

const inPeriod = (
  iso: string | undefined,
  start: Date | null,
  range?: DateRangeValue
) => {
  // a custom range wins whenever it is set; otherwise fall back to the preset
  if (range && rangeIsSet(range)) return inDateRange(iso, range);
  return start === null || (Boolean(iso) && new Date(iso as string) >= start);
};

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
  viewed: 'Viewed',
  awaiting: 'Awaiting confirmation',
  paid: 'Paid',
  receipted: 'Receipted',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const Dashboard = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardData();
  const { data: invData } = useInvoices();
  const openView = useInvoicePanelStore((s) => s.openView);
  const openCreate = useInvoicePanelStore((s) => s.openCreate);
  const setSiblings = useInvoicePanelStore((s) => s.setSiblings);
  // the fallback when there is no money at all yet
  const baseCurrency = useSettingsStore((st) => st.profile.currency) || 'USD';
  const [period, setPeriod] = useState<Period>('year');
  const [range, setRange] = useState<DateRangeValue>(EMPTY_RANGE);

  // the panel steps through the recent list, in the order shown here
  const recentIds = (data?.recentInvoices ?? [])
    .map((inv: Invoice) => inv.id)
    .join(',');
  useEffect(() => {
    setSiblings(recentIds ? recentIds.split(',') : []);
  }, [recentIds, setSiblings]);

  // Without this the skeleton below runs forever on a failed load: isLoading
  // goes false, data stays undefined, and the page pretends to be loading.
  if (isError && !data) {
    return (
      <LegacyWorkspace active="dashboard" title="Dashboard">
        <div className="dash">
          <ErrorState
            doing="Loading your dashboard"
            error={error}
            retrying={isFetching}
            onRetry={() => refetch()}
          />
        </div>
      </LegacyWorkspace>
    );
  }

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

  const start = period === 'custom' ? null : periodStart(period);
  const periodSub =
    period === 'custom'
      ? rangeIsSet(range)
        ? `${range.from || 'the start'} to ${range.to || 'today'}`
        : // custom is selected but empty, so nothing is actually filtered
          'all time'
      : (PERIODS.find((p) => p.key === period)?.sub ?? '');

  // Collected follows the period on a cash basis; the money-owed figures are
  // a current balance, so they ignore the period on purpose.
  const paidInPeriod = allInvoices.filter(
    (inv) =>
      isPaid(inv.status) &&
      inPeriod(inv.dateReceived ?? inv.updatedAt, start, period === 'custom' ? range : undefined)
  );
  // Adding naira to dollars would produce a number that is true of nothing.
  // Every money figure is per currency, headed by whichever one is biggest.
  const splitBy = (
    list: Invoice[],
    amountOf: (inv: Invoice) => number
  ): Array<[string, number]> =>
    Object.entries(
      list.reduce<Record<string, number>>((acc, inv) => {
        acc[inv.currency] = (acc[inv.currency] ?? 0) + amountOf(inv);
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

  const byCurrency = splitBy(paidInPeriod, (inv) => inv.amountReceived ?? inv.total);
  const [collectedCurrency = baseCurrency, collected = 0] = byCurrency[0] ?? [];
  const issuedInPeriod = allInvoices.filter((inv) =>
    inPeriod(inv.issueDate, start)
  ).length;
  const unsettled = allInvoices.filter((inv) => !isSettled(inv.status));
  const outstandingBy = splitBy(unsettled, (inv) => inv.total);
  const [outstandingCurrency = baseCurrency, outstanding = 0] = outstandingBy[0] ?? [];
  const paidCount = stats.paidCount ?? 0;
  const taxReady = stats.taxReadyPaid ?? 0;
  const marchPct = paidCount === 0 ? 100 : Math.round((taxReady / paidCount) * 100);

  // What needs a human today: overdue money, paid rows missing their
  // date-received, and drafts going stale.
  const STALE_DAYS = 7;
  const staleBefore = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
  const attention: Array<{
    inv: Invoice;
    kind: 'claimed' | 'overdue' | 'no-date' | 'stale';
    text: string;
  }> = [
    ...allInvoices
      .filter((inv) => inv.status === 'awaiting')
      .map((inv) => ({
        inv,
        kind: 'claimed' as const,
        text: `${inv.client.name} says they sent ${formatCurrency(inv.total, inv.currency)}`,
      })),
    ...allInvoices
      .filter((inv) => inv.status === 'overdue')
      .map((inv) => ({
        inv,
        kind: 'overdue' as const,
        text: `${formatCurrency(inv.total, inv.currency)} from ${inv.client.name} is past due`,
      })),
    ...allInvoices
      .filter((inv) => isPaid(inv.status) && !inv.dateReceived)
      .map((inv) => ({
        inv,
        kind: 'no-date' as const,
        text: `${inv.client.name} paid, but the date received is not recorded`,
      })),
    ...allInvoices
      .filter(
        (inv) =>
          inv.status === 'draft' && new Date(inv.updatedAt).getTime() < staleBefore
      )
      .map((inv) => ({
        inv,
        kind: 'stale' as const,
        text: `Draft for ${inv.client.name} has been sitting for over a week`,
      })),
  ].slice(0, 6);

  // Receivables aging: how old the money you are owed is.
  const DAY = 24 * 60 * 60 * 1000;
  const openInvoices = allInvoices.filter(
    (inv) => !isSettled(inv.status) && inv.status !== 'draft'
  );
  const AGING = [
    { label: 'Current', color: '#0c8d6f', test: (d: number) => d <= 0 },
    { label: '1-30d', color: '#e0a008', test: (d: number) => d > 0 && d <= 30 },
    { label: '31-60d', color: '#f97316', test: (d: number) => d > 30 && d <= 60 },
    { label: '61-90d', color: '#ef5d54', test: (d: number) => d > 60 && d <= 90 },
    { label: '90d+', color: '#b91c1c', test: (d: number) => d > 90 },
  ].map((bucket) => ({
    ...bucket,
    amount: openInvoices
      .filter((inv) => bucket.test(Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / DAY)))
      .reduce((sum, inv) => sum + inv.total, 0),
  }));
  const agingTotal = AGING.reduce((sum, b) => sum + b.amount, 0);

  // The ledger tiles: the tax return forming in real time.
  const vatCollected = paidInPeriod.reduce((sum, inv) => sum + inv.tax, 0);
  const whtCredits = paidInPeriod.reduce((sum, inv) => sum + (inv.whtWithheld ?? 0), 0);
  const paidWithDates = paidInPeriod.filter((inv) => inv.dateReceived);
  const daysToPaid =
    paidWithDates.length === 0
      ? null
      : Math.round(
          paidWithDates.reduce(
            (sum, inv) =>
              sum +
              (new Date(inv.dateReceived as string).getTime() -
                new Date(inv.issueDate).getTime()) /
                DAY,
            0
          ) / paidWithDates.length
        );

  // each figure counts itself up, so a payment reads as movement not a swap
  const money = (n: number) => formatCurrency(n, collectedCurrency);
  const owedMoney = (n: number) => formatCurrency(n, outstandingCurrency);
  const whole = (n: number) => formatNumber(Math.round(n));

  const kpis = [
    {
      label: 'Collected',
      amount: collected,
      format: money,
      split: byCurrency,
      sub:
        byCurrency.length > 1
          ? `received ${periodSub}, plus ${byCurrency.length - 1} other currenc${byCurrency.length === 2 ? 'y' : 'ies'}`
          : `received ${periodSub}, cash basis`,
      icon: 'bx-wallet',
      tone: 'green',
    },
    {
      label: 'Outstanding',
      amount: outstanding,
      format: owedMoney,
      split: outstandingBy,
      sub:
        outstandingBy.length > 1
          ? `${stats.overdueInvoices} overdue, across ${outstandingBy.length} currencies`
          : `${stats.overdueInvoices} overdue`,
      icon: 'bx-time-five',
      tone: 'amber',
    },
    {
      label: 'Invoices',
      amount: issuedInPeriod,
      format: whole,
      split: undefined as Array<[string, number]> | undefined,
      sub: `issued ${periodSub}, ${stats.pendingInvoices} pending`,
      icon: 'bx-receipt',
      tone: 'purple',
    },
    {
      label: 'Clients',
      amount: stats.totalClients,
      format: whole,
      split: undefined as Array<[string, number]> | undefined,
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

  // paid, viewed, sent, pending, overdue, draft
  const statusColors = ['#0c8d6f', '#ff5a5f', '#357fff', '#e0a008', '#ef5d54', '#9b99ab'];
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
        {Boolean(invData) && allInvoices.length === 0 ? (
          /* first run: coach the first invoice instead of showing empty charts */
          <section className="dash-card iw-firstrun">
            <span className="iw-firstrun-kicker">Welcome to Invoicier</span>
            <h2>Three steps to your first tax-grade payment.</h2>
            <ol>
              <li className={stats.totalClients > 0 ? 'done' : ''}>
                <i className={`bx ${stats.totalClients > 0 ? 'bx-check-circle' : 'bx-user-plus'}`} />
                <div>
                  <b>Add a client</b>
                  <p>Name and email is enough to start.</p>
                </div>
                <Link to="/clients" className="iw-btn iw-btn--ghost">
                  {stats.totalClients > 0 ? 'View clients' : 'Add client'}
                </Link>
              </li>
              <li>
                <i className="bx bx-receipt" />
                <div>
                  <b>Send your first invoice</b>
                  <p>Thirty seconds, VAT and WHT captured as you type.</p>
                </div>
                <button type="button" className="iw-btn" onClick={() => openCreate()}>
                  Create invoice
                </button>
              </li>
              <li>
                <i className="bx bx-badge-check" />
                <div>
                  <b>Record the payment</b>
                  <p>Date received is the field March cares about.</p>
                </div>
              </li>
            </ol>
          </section>
        ) : (
          <>
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
          {period === 'custom' && (
            <DateRange
              label="Received"
              value={range}
              onChange={(next) => {
                setRange(next);
                setPeriod('custom');
              }}
            />
          )}
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
                <span className="dash-kpi-value">
                  <CountUp value={kpi.amount} format={kpi.format} />
                </span>
                <span className="dash-kpi-sub">{kpi.sub}</span>
                {kpi.split && kpi.split.length > 1 && (
                  <span className="iw-currsplit">
                    {kpi.split.map(([cur, amount]) => (
                      <b key={cur}>{formatCurrency(amount, cur)}</b>
                    ))}
                  </span>
                )}
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

        {/* the working grid: money on the left, action rail on the right */}
        <div className="iw-grid">
        {/* Needs attention first: what to DO, before what to admire */}
        {attention.length === 0 ? (
          <section className="dash-card iw-attn iw-attn--clear">
            <span className="iw-attn-clear-mark" aria-hidden="true">
              <i className="bx bx-check" />
            </span>
            <div>
              <b>Nothing needs you</b>
              <p>
                No invoice is waiting on a decision from you. When one is, it
                lands here first.
              </p>
            </div>
          </section>
        ) : (
          <section className="dash-card iw-attn">
            <div className="iw-attn-head">
              <h2>Needs attention</h2>
              <span>
                {attention.length} item{attention.length === 1 ? '' : 's'}
              </span>
            </div>
            <ul>
              {attention.slice(0, 4).map(({ inv, kind, text }) => (
                <li key={`${kind}-${inv.id}`}>
                  <span className={`iw-attn-dot is-${kind}`} aria-hidden="true" />
                  <p>{text}</p>
                  <small>#{inv.invoiceNumber}</small>
                  <button type="button" className="iw-attn-go" onClick={() => openView(inv.id)}>
                    {kind === 'no-date'
                      ? 'Record'
                      : kind === 'stale'
                        ? 'Finish'
                        : kind === 'claimed'
                          ? 'Confirm'
                          : 'Open'}
                    <i className="bx bx-right-arrow-alt" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Revenue, full width */}
        <section className="dash-card dash-revenue">
          <header className="dash-card-head">
            <div>
              <h2>Revenue</h2>
              <p>Last 6 months</p>
            </div>
            <span className="dash-card-figure">
              <CountUp value={stats.totalReceived} format={money} />
            </span>
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
            <SwipeScroll className="dash-table-wrap">
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
                  {recentInvoices.length === 0 && (
                    <tr className="dash-row-empty">
                      <td colSpan={5}>
                        <i className="bx bx-receipt" aria-hidden="true" />
                        <b>No invoices yet</b>
                        <span>Your first one shows up here the moment you save it.</span>
                        <button type="button" className="iw-btn" onClick={() => openCreate()}>
                          Create an invoice
                        </button>
                      </td>
                    </tr>
                  )}
                  {recentInvoices.map((inv: Invoice, i: number) => (
                    <tr
                      key={inv.id}
                      className="dash-row-click"
                      style={{ '--i': i } as CSSProperties}
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
            </SwipeScroll>
          </article>
        </section>        {/* The ledger tiles: tax figures forming as payments land */}
        <section className="iw-tiles">
          <article className="dash-card iw-tile">
            <span className="iw-tile-label">VAT collected</span>
            <b>{formatCurrency(vatCollected)}</b>
            <small>{periodSub}, at 7.5% per invoice</small>
          </article>
          <article className="dash-card iw-tile">
            <span className="iw-tile-label">WHT credits</span>
            <b>{formatCurrency(whtCredits)}</b>
            <small>withheld by clients, saved as credits</small>
          </article>
          <article className="dash-card iw-tile">
            <span className="iw-tile-label">Days to paid</span>
            <b>{daysToPaid === null ? '-' : daysToPaid}</b>
            <small>
              {daysToPaid === null
                ? 'record a date received to see this'
                : 'average, sent to money received'}
            </small>
          </article>
        </section>

        {/* One quiet card for both distributions: bar first, labels beneath */}
        <section className="dash-card iw-bands">
          <div className="iw-band">
            <div className="iw-band-head">
              <h2>Invoice status</h2>
              <span>{statusTotal} invoices</span>
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
            <div className="iw-band-legend">
              {invoiceStatusChart.labels.map((label, i) => (
                <span key={label}>
                  <i style={{ background: statusColors[i] }} />
                  {label}
                  <b>{statusValues[i]}</b>
                </span>
              ))}
            </div>
          </div>

          {agingTotal > 0 && (
            <div className="iw-band">
              <div className="iw-band-head">
                <h2>Receivables aging</h2>
                <span>{formatCurrency(agingTotal)} open</span>
              </div>
              <div className="dash-status-bar">
                {AGING.map((b) =>
                  b.amount > 0 ? (
                    <span
                      key={b.label}
                      className="dash-status-seg"
                      style={{ flexGrow: b.amount, background: b.color }}
                      title={`${b.label}: ${formatCurrency(b.amount)}`}
                    />
                  ) : null
                )}
              </div>
              <div className="iw-band-legend">
                {AGING.filter((b) => b.amount > 0).map((b) => (
                  <span key={b.label}>
                    <i style={{ background: b.color }} />
                    {b.label}
                    <b>{formatCurrency(b.amount)}</b>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        </div>

          </>
        )}
      </div>
    </LegacyWorkspace>
  );
};
