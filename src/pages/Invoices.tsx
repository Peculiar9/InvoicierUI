import { useState } from 'react';
import { LegacyWorkspace } from '@/components/static';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useInvoices } from '@/hooks';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';
import { formatCurrency, formatDate } from '@/utils/format';
import type { InvoiceStatus } from '@/types';

const tabs: { key: InvoiceStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'pending', label: 'Pending' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
];

const statusLabel: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export const Invoices = () => {
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const { data, isLoading } = useInvoices();
  const openView = useInvoicePanelStore((s) => s.openView);
  const openCreate = useInvoicePanelStore((s) => s.openCreate);

  const invoices = data?.data ?? [];
  const filtered = invoices.filter((inv) => {
    const matchesStatus = status === 'all' || inv.status === status;
    const q = query.toLowerCase();
    const matchesQuery =
      inv.client.name.toLowerCase().includes(q) ||
      inv.invoiceNumber.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

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
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="view-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`view-tab${status === tab.key ? ' active' : ''}`}
                onClick={() => setStatus(tab.key)}
              >
                {tab.label}
              </button>
            ))}
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
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Client</th>
                    <th>Issued</th>
                    <th>Due</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
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
          )}
        </div>
      </div>
    </LegacyWorkspace>
  );
};
