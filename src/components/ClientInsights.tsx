import { Modal } from '@/components/Modal';
import { CountUp } from '@/components/CountUp';
import { ClientAvatar } from '@/components/ClientAvatar';
import { formatCurrency, formatDate } from '@/utils/format';
import { parseDay } from '@/utils/day';
import { isPaid, isSettled } from '@/utils/invoiceStatus';
import type { Client, Invoice } from '@/types';

interface ClientInsightsProps {
  client: Client;
  /** every invoice, from which this client's story is derived */
  invoices: Invoice[];
  onClose: () => void;
  onInvoiceThem: () => void;
  onEdit: () => void;
  onOpenInvoice: (id: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Everything the books know about one client, in one place.
 *
 * Not a profile page — a briefing. What they have paid, what they still owe,
 * how quickly they settle, and the paper trail behind those figures, each row
 * one click from the invoice itself.
 */
export const ClientInsights = ({
  client,
  invoices,
  onClose,
  onInvoiceThem,
  onEdit,
  onOpenInvoice,
}: ClientInsightsProps) => {
  const theirs = invoices
    .filter((inv) => inv.client?.id === client.id)
    .sort((a, b) => (b.issue_date ?? '').localeCompare(a.issue_date ?? ''));

  // money, per currency, never summed across them
  const byCurrency = new Map<string, { collected: number; owed: number }>();
  for (const inv of theirs) {
    const row = byCurrency.get(inv.currency) ?? { collected: 0, owed: 0 };
    if (isPaid(inv.status)) row.collected += inv.amount_received ?? inv.total;
    else if (!isSettled(inv.status) && inv.status !== 'draft') row.owed += inv.total;
    byCurrency.set(inv.currency, row);
  }
  const [mainCurrency, mainMoney] = [...byCurrency.entries()].sort(
    (a, b) => b[1].collected - a[1].collected
  )[0] ?? ['NGN', { collected: 0, owed: 0 }];

  // how quickly they pay: the median, because one late outlier is not a habit
  const waits = theirs
    .filter((inv) => inv.date_received && inv.issue_date)
    .map(
      (inv) =>
        (parseDay(inv.date_received as string).getTime() -
          parseDay(inv.issue_date).getTime()) /
        DAY_MS
    )
    .sort((a, b) => a - b);
  const daysToPaid =
    waits.length === 0
      ? null
      : Math.round(
          waits.length % 2
            ? waits[(waits.length - 1) / 2]
            : (waits[waits.length / 2 - 1] + waits[waits.length / 2]) / 2
        );

  const overdueCount = theirs.filter(
    (inv) =>
      !isSettled(inv.status) &&
      inv.status !== 'draft' &&
      Boolean(inv.due_date) &&
      parseDay(inv.due_date).getTime() < Date.now()
  ).length;

  return (
    <Modal open onClose={onClose} title="Client insights" size="lg">
      <div className="ci">
        <header className="ci-head">
          <ClientAvatar name={client.name} logo_url={client.logo_url} size="lg" />
          <div className="ci-who">
            <h3>{client.name}</h3>
            <p>
              {client.email || 'No email'}
              {client.phone ? ` · ${client.phone}` : ''}
            </p>
            <small>
              Client since {formatDate(client.created_at, { month: 'long', year: 'numeric' })}
            </small>
          </div>
          <div className="ci-head-actions">
            <button type="button" className="btn btn-ghost" onClick={onEdit}>
              <i className="bx bx-pencil" /> Edit
            </button>
            <button type="button" className="btn btn-primary" onClick={onInvoiceThem}>
              <i className="bx bx-plus" /> Invoice them
            </button>
          </div>
        </header>

        <div className="ci-stats">
          <article className="ci-stat">
            <span>Invoices</span>
            <b>
              <CountUp value={theirs.length} format={(n) => String(Math.round(n))} />
            </b>
            <small>{overdueCount ? `${overdueCount} overdue` : 'none overdue'}</small>
          </article>
          <article className="ci-stat">
            <span>Collected</span>
            <b>
              <CountUp
                value={mainMoney.collected}
                format={(n) => formatCurrency(n, mainCurrency)}
              />
            </b>
            <small>cash basis</small>
          </article>
          <article className="ci-stat">
            <span>Still owed</span>
            <b className={mainMoney.owed > 0 ? 'is-owed' : ''}>
              <CountUp value={mainMoney.owed} format={(n) => formatCurrency(n, mainCurrency)} />
            </b>
            <small>sent, unpaid</small>
          </article>
          <article className="ci-stat">
            <span>Days to paid</span>
            <b>{daysToPaid === null ? '–' : daysToPaid}</b>
            <small>{daysToPaid === null ? 'no payments yet' : 'median'}</small>
          </article>
        </div>

        {byCurrency.size > 1 && (
          <div className="ci-currencies">
            {[...byCurrency.entries()].map(([cur, m]) => (
              <span key={cur} className="ci-currency">
                <b>{cur}</b> {formatCurrency(m.collected, cur)} in
                {m.owed > 0 ? ` · ${formatCurrency(m.owed, cur)} owed` : ''}
              </span>
            ))}
          </div>
        )}

        <div className="ci-recent">
          <h4>The paper trail</h4>
          {theirs.length === 0 ? (
            <p className="ci-empty">No invoices yet. The first one starts the story.</p>
          ) : (
            <ul>
              {theirs.slice(0, 5).map((inv) => (
                <li key={inv.id}>
                  <button type="button" onClick={() => onOpenInvoice(inv.id)}>
                    <span className="ci-inv-num">#{inv.invoice_number}</span>
                    <span className="ci-inv-date">
                      {inv.issue_date
                        ? formatDate(inv.issue_date, { month: 'short', day: 'numeric' })
                        : '–'}
                    </span>
                    <span className="ci-inv-amount">
                      {formatCurrency(inv.total, inv.currency)}
                    </span>
                    <span className={`dash-badge is-${inv.status}`}>{inv.status}</span>
                    <i className="bx bx-right-arrow-alt" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};
