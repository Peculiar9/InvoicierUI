import { useEffect, useState } from 'react';
import { LegacyWorkspace } from '@/components/static';
import { Pager } from '@/components/Pager';
import { SwipeScroll } from '@/components/SwipeScroll';
import { DateRange } from '@/components/DateRange';
import { inDateRange } from '@/utils/dateRange';
import type { DateRangeValue } from '@/utils/dateRange';
import type { CSSProperties } from 'react';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useInvoices, useSendInvoice, useMarkInvoicePaid } from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { copyInvoiceLink } from '@/lib/invoiceActions';
import { toast } from '@/lib/toast';
import { isPaid, isSettled } from '@/utils/invoiceStatus';
import { useListStateStore } from '@/stores/listStateStore';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Invoice, InvoiceStatus } from '@/types';

const tabs: { key: InvoiceStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending' },
  { key: 'sent', label: 'Sent' },
  { key: 'viewed', label: 'Viewed' },
  { key: 'awaiting', label: 'Awaiting' },
  { key: 'paid', label: 'Paid' },
  { key: 'receipted', label: 'Receipted' },
  { key: 'overdue', label: 'Overdue' },
];

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
  // the list keeps its place: opening an invoice and coming back, or
  // reloading, should not throw away the filters that found it
  const listState = useListStateStore((s) => s.invoices);
  const patch = useListStateStore((s) => s.setInvoices);
  const resetList = useListStateStore((s) => s.resetInvoices);
  const { status, query, page, pageSize, sort, clientFilter, currencyFilter, dateField, range } =
    listState;
  const setStatus = (v: InvoiceStatus | 'all') => patch({ status: v });
  const setQuery = (v: string) => patch({ query: v });
  const setPage = (v: number) => patch({ page: v });
  const setPageSize = (v: number) => patch({ pageSize: v });
  const setClientFilter = (v: string) => patch({ clientFilter: v });
  const setCurrencyFilter = (v: string) => patch({ currencyFilter: v });
  const setDateField = (v: DateField) => patch({ dateField: v });
  const setRange = (v: DateRangeValue) => patch({ range: v });
  const { data, isLoading } = useInvoices();
  const openView = useInvoicePanelStore((s) => s.openView);
  const openCreate = useInvoicePanelStore((s) => s.openCreate);

  const toggleSort = (key: SortKey) => {
    patch({
      sort:
        sort.key === key
          ? { key, dir: sort.dir === 1 ? -1 : 1 }
          : { key, dir: DESC_FIRST.includes(key) ? -1 : 1 },
      page: 1,
    });
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

  // ticked rows, kept to this visit only: a stale selection is a hazard
  const [picked, setPicked] = useState<string[]>([]);
  const send = useSendInvoice();
  const markPaid = useMarkInvoicePaid();

  const togglePick = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  // the panel steps through what this page is showing, in this order
  const setSiblings = useInvoicePanelStore((s) => s.setSiblings);
  const pagedIds = paged.map((inv) => inv.id).join(',');
  useEffect(() => {
    setSiblings(pagedIds ? pagedIds.split(',') : []);
  }, [pagedIds, setSiblings]);

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
                message="Nothing here fits the filters you have on. Widen them and the invoices come back."
                action={{
                  label: 'Clear filters',
                  icon: 'bx-eraser',
                  onClick: () => resetList(),
                }}
              />
            )
          ) : (
            <>
            {picked.length > 0 && (
              <div className="iw-bulk" role="region" aria-label="Selected invoices">
                <span className="iw-bulk-count">
                  <b>{picked.length}</b> selected
                </span>
                <div className="iw-bulk-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={send.isPending}
                    onClick={() => {
                      // only chase the ones still owing; the rest are done
                      const chase = paged.filter(
                        (inv) => picked.includes(inv.id) && !isSettled(inv.status)
                      );
                      if (chase.length === 0) {
                        toast.info('Nothing to chase: those are all settled');
                        return;
                      }
                      Promise.all(
                        chase.map((inv) =>
                          send.mutateAsync({
                            id: inv.id,
                            channel: inv.status === 'draft' ? 'email' : 'reminder',
                          })
                        )
                      ).then(() => {
                        toast.success(
                          `Reminder sent to ${chase.length} ${
                            chase.length === 1 ? 'client' : 'clients'
                          }`
                        );
                        setPicked([]);
                      });
                    }}
                  >
                    <i className="bx bx-bell" /> Send a reminder
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={markPaid.isPending}
                    onClick={() => {
                      const unpaid = paged.filter(
                        (inv) => picked.includes(inv.id) && !isSettled(inv.status)
                      );
                      if (unpaid.length === 0) {
                        toast.info('Those are already settled');
                        return;
                      }
                      const today = new Date().toISOString().slice(0, 10);
                      Promise.all(
                        unpaid.map((inv) =>
                          markPaid.mutateAsync({
                            id: inv.id,
                            // the date received is the field that matters; today
                            // is the honest default when recording in bulk
                            data: { dateReceived: today, amountReceived: inv.total },
                          })
                        )
                      ).then(() => {
                        toast.success(
                          `${unpaid.length} marked paid, received today. Open one to change the date.`
                        );
                        setPicked([]);
                      });
                    }}
                  >
                    <i className="bx bx-check-circle" /> Mark paid
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost iw-bulk-clear"
                    onClick={() => setPicked([])}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
            <SwipeScroll className="dash-table-wrap">
              <table className="dash-table dash-table--invoices">
                <thead>
                  <tr>
                    <th className="iw-tick-cell">
                      <input
                        type="checkbox"
                        aria-label="Select every invoice on this page"
                        checked={picked.length > 0 && picked.length === paged.length}
                        ref={(el) => {
                          // some but not all: the box says so rather than lying
                          if (el)
                            el.indeterminate =
                              picked.length > 0 && picked.length < paged.length;
                        }}
                        onChange={(e) =>
                          setPicked(e.target.checked ? paged.map((inv) => inv.id) : [])
                        }
                      />
                    </th>
                    <Th k="invoiceNumber">Invoice</Th>
                    <Th k="client">Client</Th>
                    <Th k="issueDate">Issued</Th>
                    <Th k="dueDate">Due</Th>
                    <Th k="dateReceived">Received</Th>
                    <Th k="total">Amount</Th>
                    <Th k="status">Status</Th>
                    <th className="iw-rowact-cell" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((inv, i) => (
                    <tr
                      style={{ '--i': i } as CSSProperties}
                      key={inv.id}
                      className={`dash-row-click${picked.includes(inv.id) ? ' is-picked' : ''}`}
                      onClick={() => openView(inv.id)}
                    >
                      <td
                        className="iw-tick-cell"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select invoice ${inv.invoiceNumber}`}
                          checked={picked.includes(inv.id)}
                          onChange={() => togglePick(inv.id)}
                        />
                      </td>
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
                      {/* the three things you do most, without opening anything */}
                      <td className="iw-rowact-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="iw-rowact">
                          {!isSettled(inv.status) && (
                            <button
                              type="button"
                              title={inv.status === 'draft' ? 'Send this invoice' : 'Send a reminder'}
                              aria-label={
                                inv.status === 'draft' ? 'Send this invoice' : 'Send a reminder'
                              }
                              onClick={() =>
                                send.mutate(
                                  {
                                    id: inv.id,
                                    channel: inv.status === 'draft' ? 'email' : 'reminder',
                                  },
                                  {
                                    onSuccess: () =>
                                      toast.success(
                                        inv.status === 'draft'
                                          ? `#${inv.invoiceNumber} sent to ${inv.client.name}`
                                          : `Reminder sent to ${inv.client.name}`
                                      ),
                                  }
                                )
                              }
                            >
                              <i className={`bx ${inv.status === 'draft' ? 'bx-send' : 'bx-bell'}`} />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Copy the payment link"
                            aria-label="Copy the payment link"
                            onClick={() => copyInvoiceLink(inv.id)}
                          >
                            <i className="bx bx-link" />
                          </button>
                          {!isPaid(inv.status) && inv.status !== 'cancelled' && (
                            <button
                              type="button"
                              title="Mark as paid"
                              aria-label="Mark as paid"
                              onClick={() => openView(inv.id)}
                            >
                              <i className="bx bx-check-circle" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SwipeScroll>
            </>
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
