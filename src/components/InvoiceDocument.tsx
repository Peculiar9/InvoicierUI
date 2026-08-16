import type { CSSProperties } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { accountDisplayRows } from '@/utils/paymentRoutes';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Client, InvoiceStatus } from '@/types';

export interface InvoiceDocLine {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface InvoiceDocBusiness {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
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
  /** on the payer's machine the sender comes from the payload, not the store */
  business?: InvoiceDocBusiness | null;
  /** the account this invoice is paid into, printed on every PDF */
  payment_account?: Record<string, string | null | undefined> | import('@/types').PublicPaymentAccount | null;
  /** the recipient's name when there's no saved client (ad-hoc billing) */
  bill_to_name?: string | null;
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
  const storeProfile = useSettingsStore((s) => s.profile);
  // payload wins: a stranger's localStorage knows nothing about the sender
  const profile = data.business
    ? { ...storeProfile, name: data.business.name ?? storeProfile.name,
        email: data.business.email ?? '', phone: data.business.phone ?? '',
        address: data.business.address ?? '' }
    : storeProfile;
  const { currency } = data;
  const payRows = data.payment_account
    ? accountDisplayRows(data.payment_account as Record<string, string | null | undefined>)
    : [];

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
          <p className="invoice-doc-name">
            {data.client?.name ?? data.bill_to_name ?? 'No client selected'}
          </p>
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
            <strong>{data.issue_date ? formatDate(data.issue_date) : '–'}</strong>
          </div>
          <div>
            <span>Due</span>
            <strong>{data.due_date ? formatDate(data.due_date) : '–'}</strong>
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

      {payRows.length > 0 && (
        <section className="invoice-doc-pay">
          <h4>How to pay</h4>
          <div className="invoice-doc-pay-rows">
            {payRows.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <b>{value}</b>
              </div>
            ))}
            <div>
              <span>Reference</span>
              <b>{data.invoice_number}</b>
            </div>
          </div>
          {(data.payment_account as { instructions?: string | null } | null)?.instructions && (
            <p className="invoice-doc-pay-note">{(data.payment_account as { instructions?: string | null }).instructions}</p>
          )}
        </section>
      )}

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
