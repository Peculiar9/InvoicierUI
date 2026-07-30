import { useState } from 'react';
import { LegacyWorkspace } from '@/components/static';
import { Pager } from '@/components/Pager';
import { SwipeScroll } from '@/components/SwipeScroll';
import { DateRange } from '@/components/DateRange';
import { EMPTY_RANGE, inDateRange } from '@/utils/dateRange';
import type { DateRangeValue } from '@/utils/dateRange';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useInvoices } from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Invoice, InvoiceStatus } from '@/types';

const tabs: { key: InvoiceStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending' },
  { key: 'sent', label: 'Sent' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'paid', label: 'Paid' },
  { key: 'receipted', label: 'Receipted' },
  { key: 'overdue', label: 'Overdue' },
];

const statusLabel: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  receipted: 'Receipted',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

/** The range can apply to any of the dates an invoice carries. */
type DateField = 'issueDate' | 'dueDate' | 'dateReceived';
const DATE_FIELDS: { key: DateField; label: string }[] = [
  { key: 'issueDate', label: 'Issued' },
  { key: 'dueDate', label: 'Due' },
  { key: 'dateReceived', label: 'Received' },
];

type SortKey =
  | 'invoiceNumber'
  | 'client'
  | 'issueDate'
  | 'dueDate'
  | 'dateReceived'
  | 'total'
  | 'status';

/** numeric-and-date keys read best newest/biggest first */
const DESC_FIRST: SortKey[] = ['issueDate', 'dueDate', 'dateReceived', 'total'];

const sortValue = (inv: Invoice, key: SortKey): string | number => {
  if (key === 'client') return inv.client.name.toLowerCase();
  if (key === 'total') return inv.total;
  return (inv[key] as string | undefined) ?? '';
};

export const Invoices = () => {
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: 'issueDate',
    dir: -1,
  });
  const [clientFilter, setClientFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [dateField, setDateField] = useState<DateField>('issueDate');
  const [range, setRange] = useState<DateRangeValue>(EMPTY_RANGE);
  const { data, isLoading } = useInvoices();
  const openView = useInvoicePanelStore((s) => s.openView);
  const openCreate = useInvoicePanelStore((s) => s.openCreate);

  const toggleSort = (key: SortKey) => {
    setSort((cur) =>
      cur.key === key
        ? { key, dir: cur.dir === 1 ? -1 : 1 }
        : { key, dir: DESC_FIRST.includes(key) ? -1 : 1 }
    );
    setPage(1);
  };

  const invoices = data?.data ?? [];
  // only saved clients can be filtered on: an unsaved recipient has no id,
  // which would collide with the "All clients" option
  const clientOptions = [
    ...new Map(
      invoices.filter((i) => i.client.id).map((i) => [i.client.id, i.client])
    ).values(),
  ];
  const currencyOptions = [...new Set(invoices.map((i) => i.currency))];

  const filtered = invoices.filter((inv) => {
    const matchesStatus = status === 'all' || inv.status === status;
    const matchesClient = !clientFilter || inv.client.id === clientFilter;
    const matchesCurrency = !currencyFilter || inv.currency === currencyFilter;
    const matchesDates = inDateRange(inv[dateField], range);
    const q = query.toLowerCase();
    const matchesQuery =
      inv.client.name.toLowerCase().includes(q) ||
      inv.invoiceNumber.toLowerCase().includes(q);
    return matchesStatus && matchesClient && matchesCurrency && matchesDates && matchesQuery;
  });
  const sorted = [...filtered].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
  });
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pages);
  const paged = sorted.slice((current - 1) * pageSize, current * pageSize);

  const Th = ({ k, children }: { k: SortKey; children: string }) => (
    <th aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
      <button
        type="button"
        className={`iw-th${sort.key === k ? ' active' : ''}`}
        onClick={() => toggleSort(k)}
      >
        {children}
        <i
          className={`bx ${
            sort.key === k
              ? sort.dir === 1
                ? 'bx-chevron-up'
                : 'bx-chevron-down'
              : 'bx-sort-alt-2'
          }`}
        />
      </button>
    </th>
  );

  return (
    <LegacyWorkspace
      active="invoices"
      title="Invoices"
      actions={[{ label: 'New invoice', bx: 'bx-plus', onClick: openCreate }]}
    >
      <div className="view">
        <div className="view-toolbar">
          <label className="view-search">
            <i className="bx bx-search" />
            <input
              type="search"
              placeholder="Search invoices or clients"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <div className="view-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`view-tab${status === tab.key ? ' active' : ''}`}
                onClick={() => {
                  setStatus(tab.key);
                  setPage(1);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="iw-filters">
            <select
              className="iw-select"
              value={clientFilter}
              aria-label="Filter by client"
              onChange={(e) => {
                setClientFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All clients</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="iw-select"
              value={currencyFilter}
              aria-label="Filter by currency"
              onChange={(e) => {
                setCurrencyFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All currencies</option>
              {currencyOptions.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
            <select
              className="iw-select"
              value={dateField}
              aria-label="Which date to filter on"
              onChange={(e) => {
                setDateField(e.target.value as DateField);
                setPage(1);
              }}
            >
              {DATE_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label} date
                </option>
              ))}
            </select>
            <DateRange
              label={DATE_FIELDS.find((f) => f.key === dateField)?.label ?? 'Dates'}
              value={range}
              onChange={(next) => {
                setRange(next);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="dash-card">
          {isLoading ? (
            <div className="skel-rows">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} width="100%" height={46} radius={10} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            invoices.length === 0 ? (
              <EmptyState
                icon="bx-receipt"
                title="No invoices yet"
                message="Create your first invoice to start getting paid. It only takes a minute."
                action={{ label: 'Create invoice', icon: 'bx-plus', onClick: () => openCreate() }}
              />
            ) : (
              <EmptyState
                icon="bx-search-alt"
                title="No matching invoices"
                message="Try a different search term or switch the status filter above."
              />
            )
          ) : (
            <SwipeScroll className="dash-table-wrap">
              <table className="dash-table dash-table--invoices">
                <thead>
                  <tr>
                    <Th k="invoiceNumber">Invoice</Th>
                    <Th k="client">Client</Th>
                    <Th k="issueDate">Issued</Th>
                    <Th k="dueDate">Due</Th>
                    <Th k="dateReceived">Received</Th>
                    <Th k="total">Amount</Th>
                    <Th k="status">Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((inv) => (
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
                      <td className="dash-muted">
                        {formatDate(inv.dueDate, { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="dash-muted">
                        {inv.dateReceived
                          ? formatDate(inv.dateReceived, { month: 'short', day: 'numeric' })
                          : '-'}
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
          )}
          {!isLoading && filtered.length > 0 && (
            <Pager
              page={current}
              pages={pages}
              total={filtered.length}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={(n) => {
                setPageSize(n);
                setPage(1);
              }}
              noun="invoices"
            />
          )}
        </div>
      </div>
    </LegacyWorkspace>
  );
};
