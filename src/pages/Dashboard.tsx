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
import { Link, useNavigate } from '@tanstack/react-router';
import { LegacyWorkspace } from '@/components/static';
import type { CSSProperties } from 'react';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { CountUp } from '@/components/CountUp';
import { Sparkline } from '@/components/ui/Sparkline';
import { SwipeScroll } from '@/components/SwipeScroll';
import { useDashboardData, useInvoices } from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { isPaid, isSettled } from '@/utils/invoiceStatus';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { inDateRange } from '@/utils/dateRange';
import type { DateRangeValue } from '@/utils/dateRange';
import { RANGE_PRESETS, describeRange } from '@/utils/dateRangePresets';
import type { Invoice, InvoiceStatus } from '@/types';

/* ---- reporting period ----
   One control: the date filter is the period. Its presets already say
   "This month / This quarter / This year", and an empty range is all time,
   so a second row of period tabs was the same choice asked twice. */

const THIS_YEAR = RANGE_PRESETS.find((preset) => preset.key === 'year')!;

/** The sentence fragment the cards read, e.g. "received this tax year". */
const periodPhrase = (range: DateRangeValue): string => {
  const label = describeRange(range, 'all time');
  if (label === 'This year') return 'this tax year';
  return /^(This|Last|Today|All|Any)/.test(label) ? label.toLowerCase() : label;
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
  const navigate = useNavigate();
  const setSiblings = useInvoicePanelStore((s) => s.setSiblings);
  // the fallback when there is no money at all yet
  const baseCurrency = useSettingsStore((st) => st.profile.currency) || 'USD';
  const [range, setRange] = useState<DateRangeValue>(() => THIS_YEAR.build());
  // one eye for the whole dashboard: money hides, counts stay
  const [hideMoney, setHideMoney] = useState(
    () => localStorage.getItem('invoicier-hide-money') === '1'
  );
  const toggleMoney = () => {
    setHideMoney((current) => {
      localStorage.setItem('invoicier-hide-money', current ? '0' : '1');
      return !current;
    });
  };

  // the panel steps through the recent list, in the order shown here
  const recentIds = (data?.recent_invoices ?? [])
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

  const { stats, revenue_chart, invoice_status_chart, recent_invoices } = data;
  const allInvoices = invData?.data ?? [];

  const periodSub = periodPhrase(range);

  // Collected follows the period on a cash basis; the money-owed figures are
  // a current balance, so they ignore the period on purpose.
  const paidInPeriod = allInvoices.filter(
    (inv) =>
      isPaid(inv.status) &&
      inDateRange(inv.date_received ?? inv.updated_at, range)
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

  const byCurrency = splitBy(paidInPeriod, (inv) => inv.amount_received ?? inv.total);
  const [collectedCurrency = baseCurrency, collected = 0] = byCurrency[0] ?? [];
  const issuedInPeriod = allInvoices.filter((inv) =>
    inDateRange(inv.issue_date, range)
  ).length;
  const unsettled = allInvoices.filter((inv) => !isSettled(inv.status));
  const outstandingBy = splitBy(unsettled, (inv) => inv.total);
  const [outstandingCurrency = baseCurrency, outstanding = 0] = outstandingBy[0] ?? [];
  const paid_count = stats.paid_count ?? 0;
  const taxReady = stats.tax_ready_paid ?? 0;
  const marchPct = paid_count === 0 ? 100 : Math.round((taxReady / paid_count) * 100);

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
      .filter((inv) => isPaid(inv.status) && !inv.date_received)
      .map((inv) => ({
        inv,
        kind: 'no-date' as const,
        text: `${inv.client.name} paid, but the date received is not recorded`,
      })),
    ...allInvoices
      .filter(
        (inv) =>
          inv.status === 'draft' && new Date(inv.updated_at).getTime() < staleBefore
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
      .filter((inv) => bucket.test(Math.floor((Date.now() - new Date(inv.due_date).getTime()) / DAY)))
      .reduce((sum, inv) => sum + inv.total, 0),
  }));
  const agingTotal = AGING.reduce((sum, b) => sum + b.amount, 0);

  // The ledger tiles: the tax return forming in real time.
  const vatCollected = paidInPeriod.reduce((sum, inv) => sum + inv.tax, 0);
  const whtCredits = paidInPeriod.reduce((sum, inv) => sum + (inv.wht_withheld ?? 0), 0);
  const paidWithDates = paidInPeriod.filter((inv) => inv.date_received);
  const daysToPaid =
    paidWithDates.length === 0
      ? null
      : Math.round(
          paidWithDates.reduce(
            (sum, inv) =>
              sum +
              (new Date(inv.date_received as string).getTime() -
                new Date(inv.issue_date).getTime()) /
                DAY,
            0
          ) / paidWithDates.length
        );

  // each figure counts itself up, so a payment reads as movement not a swap
  const MASK = '\u2022\u2022\u2022\u2022\u2022\u2022';
  /**
   * A card is about 11-13 characters wide at the hero size. Anything longer
   * abbreviates (₦230.46M) rather than shrinking into illegibility or
   * spilling out of the card, and the full figure rides in the title.
   */
  const FITS = 13;
  const fitMoney = (amount: number, currency: string) => {
    const full = formatCurrency(amount, currency);
    const compact = full.length > FITS;
    return {
      full,
      compact,
      format: (n: number) =>
        hideMoney
          ? MASK
          : compact
            ? formatCompactCurrency(n, currency)
            : formatCurrency(n, currency),
    };
  };
  const collectedFit = fitMoney(collected, collectedCurrency);
  const outstandingFit = fitMoney(outstanding, outstandingCurrency);
  const money = (n: number) => (hideMoney ? MASK : formatCurrency(n, collectedCurrency));
  const anyMoney = (n: number, currency: string) =>
    hideMoney ? MASK : formatCurrency(n, currency);
  const whole = (n: number) => formatNumber(Math.round(n));

  // The shape of the last few months, and how this one compares. A number
  // with no direction is half a fact.
  const series: number[] = (revenue_chart.datasets[0]?.data ?? []).map(Number);
  const thisPeriod = series[series.length - 1] ?? 0;
  const lastPeriod = series[series.length - 2] ?? 0;
  const delta =
    lastPeriod > 0 ? Math.round(((thisPeriod - lastPeriod) / lastPeriod) * 100) : null;

  const kpis = [
    {
      label: 'Collected',
      amount: collected,
      format: collectedFit.format,
      title: hideMoney ? undefined : collectedFit.compact ? collectedFit.full : undefined,
      split: byCurrency,
      sub:
        byCurrency.length > 1
          ? `received ${periodSub}, plus ${byCurrency.length - 1} other currenc${byCurrency.length === 2 ? 'y' : 'ies'}`
          : `received ${periodSub}, cash basis`,
      icon: 'bx-wallet',
      tone: 'green',
      spark: series.length > 1 ? series : null,
      delta,
      to: undefined as string | undefined,
    },
    {
      label: 'Outstanding',
      amount: outstanding,
      format: outstandingFit.format,
      title: hideMoney ? undefined : outstandingFit.compact ? outstandingFit.full : undefined,
      split: outstandingBy,
      sub:
        outstandingBy.length > 1
          ? `${stats.overdue_invoices} overdue, across ${outstandingBy.length} currencies`
          : `${stats.overdue_invoices} overdue`,
      icon: 'bx-time-five',
      tone: 'amber',
      spark: null,
      delta: null,
      // the number is a to-do list, so it opens the list it describes
      to: '/invoices',
    },
    {
      label: 'Invoices',
      amount: issuedInPeriod,
      format: whole,
      title: undefined as string | undefined,
      split: undefined as Array<[string, number]> | undefined,
      sub: `issued ${periodSub}, ${stats.pending_invoices} pending`,
      icon: 'bx-receipt',
      tone: 'purple',
      spark: null,
      delta: null,
      // the number is a to-do list, so it opens the list it describes
      to: '/invoices',
    },
    {
      label: 'Clients',
      amount: stats.total_clients,
      format: whole,
      title: undefined as string | undefined,
      split: undefined as Array<[string, number]> | undefined,
      sub: 'active',
      icon: 'bx-group',
      tone: 'blue',
      spark: null,
      delta: null,
      to: '/clients',
    },
  ];

  const revenueData = {
    labels: revenue_chart.labels,
    datasets: [
      {
        label: 'Revenue',
        data: revenue_chart.datasets[0]?.data ?? [],
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
  const statusValues = invoice_status_chart.datasets[0]?.data ?? [];
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
              <li className={stats.total_clients > 0 ? 'done' : ''}>
                <i className={`bx ${stats.total_clients > 0 ? 'bx-check-circle' : 'bx-user-plus'}`} />
                <div>
                  <b>Add a client</b>
                  <p>Name and email is enough to start.</p>
                </div>
                <Link to="/clients" className="iw-btn iw-btn--ghost">
                  {stats.total_clients > 0 ? 'View clients' : 'Add client'}
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
        {/* the reporting period: one control, and one eye for the money */}
        <div className="dash-period">
          <DateRangePicker
            label="Period"
            emptyLabel="All time"
            value={range}
            onChange={(next) => setRange(next)}
          />
          <button
            type="button"
            className="dash-eye"
            aria-pressed={hideMoney}
            title={hideMoney ? 'Show the figures' : 'Hide the figures'}
            aria-label={hideMoney ? 'Show the figures' : 'Hide the figures'}
            onClick={toggleMoney}
          >
            <i className={`bx ${hideMoney ? 'bx-hide' : 'bx-show'}`} />
          </button>
        </div>

        {/* KPI cards */}
        <section className="dash-kpis">
          {kpis.map((kpi) => (
            <article
              className={`dash-kpi dash-kpi--${kpi.tone}${kpi.to ? ' is-linked' : ''}`}
              key={kpi.label}
              onClick={kpi.to ? () => navigate({ to: kpi.to as string }) : undefined}
              role={kpi.to ? 'link' : undefined}
              tabIndex={kpi.to ? 0 : undefined}
              onKeyDown={
                kpi.to
                  ? (e) => {
                      if (e.key === 'Enter') navigate({ to: kpi.to as string });
                    }
                  : undefined
              }
            >
              <span className="dash-kpi-icon">
                <i className={`bx ${kpi.icon}`} />
              </span>
              <div className="dash-kpi-body">
                <span className="dash-kpi-label">
                  {kpi.label}
                  {kpi.delta !== null && kpi.delta !== undefined && (
                    <em className={`dash-kpi-delta${kpi.delta < 0 ? ' is-down' : ''}`}>
                      <i className={`bx ${kpi.delta < 0 ? 'bx-trending-down' : 'bx-trending-up'}`} />
                      {Math.abs(kpi.delta)}%
                    </em>
                  )}
                </span>
                <span className="dash-kpi-value" title={kpi.title}>
                  <CountUp value={kpi.amount} format={kpi.format} />
                </span>
                <span className="dash-kpi-sub">{kpi.sub}</span>
                {kpi.split && kpi.split.length > 1 && (
                  <span className="iw-currsplit">
                    {kpi.split.map(([cur, amount]) => (
                      <b key={cur}>{anyMoney(amount, cur)}</b>
                    ))}
                  </span>
                )}
              </div>
              {kpi.spark && (
                <span className="dash-kpi-spark" aria-hidden="true">
                  <Sparkline
                    points={kpi.spark}
                    tone={kpi.tone === 'green' ? 'good' : 'brand'}
                    width={120}
                    height={34}
                    stretch
                  />
                </span>
              )}
              {kpi.to && <i className="bx bx-right-arrow-alt dash-kpi-go" aria-hidden="true" />}
            </article>
          ))}
        </section>

        {/* March readiness: paid invoices carrying a date-received */}
        <div className="iw-march">
          <i className="bx bx-calendar-check" aria-hidden="true" />
          <span>
            <b>March readiness.</b> Paid invoices with a date received recorded:{' '}
            {taxReady} of {paid_count}.
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
                  <small>#{inv.invoice_number}</small>
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
              <CountUp value={stats.total_received} format={money} />
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
                <p>{recent_invoices.length} latest</p>
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
                  {recent_invoices.length === 0 && (
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
                  {recent_invoices.map((inv: Invoice, i: number) => (
                    <tr
                      key={inv.id}
                      className="dash-row-click"
                      style={{ '--i': i } as CSSProperties}
                      onClick={() => openView(inv.id)}
                    >
                      <td className="dash-mono">#{inv.invoice_number}</td>
                      <td>{inv.client.name}</td>
                      <td className="dash-muted">
                        {formatDate(inv.issue_date, { month: 'short', day: 'numeric' })}
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
            <b>{money(vatCollected)}</b>
            <small>{periodSub}, at 7.5% per invoice</small>
          </article>
          <article className="dash-card iw-tile">
            <span className="iw-tile-label">WHT credits</span>
            <b>{money(whtCredits)}</b>
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
              {invoice_status_chart.labels.map((label, i) =>
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
              {invoice_status_chart.labels.map((label, i) => (
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
