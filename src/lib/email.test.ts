import { describe, expect, it } from 'vitest';
import { buildInvoiceEmail, invoicePayLink } from './email';
import type { Invoice } from '@/types';

const invoice: Invoice = {
  id: 'inv_9',
  invoiceNumber: 'IV1009',
  client: { id: 'cli_1', name: 'Acme Inc', email: 'billing@acme.com', createdAt: '2026-01-01' },
  items: [{ id: 'i1', description: 'Work', quantity: 1, unitPrice: 500, total: 500 }],
  subtotal: 500,
  tax: 0,
  taxRate: 0,
  total: 500,
  currency: 'USD',
  status: 'draft',
  issueDate: '2026-06-01',
  dueDate: '2026-06-15',
  createdAt: '2026-06-01',
  updatedAt: '2026-06-01',
};

const profile = {
  name: 'My Studio',
  email: 'me@studio.com',
  phone: '',
  address: '',
  currency: 'USD',
};

describe('email', () => {
  it('builds an invoice email with recipient, subject and pay link', () => {
    const mail = buildInvoiceEmail(invoice, profile);
    expect(mail.to).toBe('billing@acme.com');
    expect(mail.subject).toContain('IV1009');
    expect(mail.subject).toContain('My Studio');
    expect(mail.body).toContain(invoicePayLink(invoice));
    expect(mail.body).toContain('$500');
  });
});
