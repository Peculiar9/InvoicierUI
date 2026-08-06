import type { CSSProperties } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Client, InvoiceStatus } from '@/types';

export interface InvoiceDocLine {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceDocData {
  invoice_number: string;
  status?: InvoiceStatus;
  client: Pick<Client, 'name' | 'email' | 'phone' | 'address'> | null;
  items: InvoiceDocLine[];
  subtotal: number;
  tax: number;
  tax_rate: number;
  total: number;
  currency: string;
  issue_date?: string;
  due_date?: string;
  notes?: string;
  terms?: string;
}

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

export const InvoiceDocument = ({ data }: { data: InvoiceDocData }) => {
  const profile = useSettingsStore((s) => s.profile);
  const { currency } = data;

  return (
    <article
      className={`invoice-doc invoice-doc--${profile.template ?? 'classic'}`}
      style={{ '--acc': profile.brandColor ?? '#924ee9' } as CSSProperties}
    >
      <header className="invoice-doc-top">
        <div className="invoice-doc-brand">
          {profile.logo ? (
            <img className="invoice-doc-logo" src={profile.logo} alt="" />
          ) : (
            <span className="invoice-doc-monogram" aria-hidden="true">
              {(profile.name.charAt(0) || 'i').toUpperCase()}
            </span>
          )}
          <div>
            <span className="invoice-doc-mark">Invoice</span>
            <h2>#{data.invoice_number}</h2>
          </div>
        </div>
        {data.status && (
          <span className={`dash-badge is-${data.status}`}>{statusLabel[data.status]}</span>
        )}
      </header>

      <div className="invoice-doc-parties">
        <div>
          <h4>Bill from</h4>
          <p className="invoice-doc-name">{profile.name}</p>
          <p>{profile.email}</p>
          {profile.phone && <p>{profile.phone}</p>}
          {profile.address && <p>{profile.address}</p>}
        </div>
        <div>
          <h4>Bill to</h4>
          <p className="invoice-doc-name">{data.client?.name ?? 'No client selected'}</p>
          {data.client?.email && <p>{data.client.email}</p>}
          {data.client?.phone && <p>{data.client.phone}</p>}
          {data.client?.address && (
            <p>
              {[data.client.address.street, data.client.address.city, data.client.address.country]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
        <div className="invoice-doc-meta">
          <div>
            <span>Issued</span>
            <strong>{data.issue_date ? formatDate(data.issue_date) : '—'}</strong>
          </div>
          <div>
            <span>Due</span>
            <strong>{data.due_date ? formatDate(data.due_date) : '—'}</strong>
          </div>
        </div>
      </div>

      <table className="invoice-doc-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.length === 0 ? (
            <tr>
              <td colSpan={4} className="invoice-doc-empty">
                No items yet
              </td>
            </tr>
          ) : (
            data.items.map((item, i) => (
              <tr key={i}>
                <td>{item.description || 'Untitled item'}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unit_price, currency)}</td>
                <td className="invoice-doc-amount">{formatCurrency(item.total, currency)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="invoice-doc-totals">
        <div>
          <span>Subtotal</span>
          <span>{formatCurrency(data.subtotal, currency)}</span>
        </div>
        <div>
          <span>{data.tax_rate === 0.075 ? 'VAT' : 'Tax'} ({+(data.tax_rate * 100).toFixed(2)}%)</span>
          <span>{formatCurrency(data.tax, currency)}</span>
        </div>
        <div className="invoice-doc-grand">
          <span>Total</span>
          <span>{formatCurrency(data.total, currency)}</span>
        </div>
      </div>

      {(data.notes || data.terms) && (
        <footer className="invoice-doc-foot">
          {data.notes && (
            <div>
              <h4>Notes</h4>
              <p>{data.notes}</p>
            </div>
          )}
          {data.terms && (
            <div>
              <h4>Terms</h4>
              <p>{data.terms}</p>
            </div>
          )}
        </footer>
      )}
    </article>
  );
};
