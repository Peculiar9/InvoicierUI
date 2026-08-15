import type { Invoice } from '@/types';

/**
 * A dev-only stand-in for a public invoice.
 *
 * So /pay/inv_4 (and any inv_* id) renders a full, realistic invoice while we
 * refine the pay flow, instead of the "this link has nothing behind it" empty
 * state. It is never reached in production: the public-invoice hook only calls
 * this under `import.meta.env.DEV`. Amounts are in MAJOR units, because this
 * bypasses the api money boundary that would otherwise convert minor to major.
 */
export const isDevMockInvoiceId = (id: string): boolean =>
  import.meta.env.DEV && /^inv_/i.test(id);

export const devMockInvoice = (id: string): Invoice => ({
  id,
  invoice_number: 'ADA-0004',
  client: null,
  bill_to_name: 'Emeka Okafor',
  bill_to_email: 'emeka@okaforventures.ng',
  items: [
    { id: 'it_1', description: 'Brand identity system', quantity: 1, unit_price: 180000, total: 180000 },
    { id: 'it_2', description: 'Social launch kit, 6 templates', quantity: 1, unit_price: 70000, total: 70000 },
  ],
  sender_business: {
    business_name: 'Ada Studio',
    email: 'hello@adastudio.co',
    phone: '+234 803 000 0000',
    address: '12 Awolowo Road, Ikoyi, Lagos',
    logo_url: 'https://api.dicebear.com/9.x/initials/svg?seed=Ada%20Studio&backgroundColor=924ee9',
  },
  payment_account: {
    label: 'Ada Studio, GTBank',
    provider: 'bank',
    currency: 'NGN',
    account_name: 'Ada Studio Ltd',
    account_number: '0123456789',
    bank_name: 'Guaranty Trust Bank',
    instructions: 'Use the invoice number (ADA-0004) as your transfer reference.',
  },
  subtotal: 250000,
  tax: 18750,
  tax_rate: 0.075,
  total: 268750,
  currency: 'NGN',
  status: 'sent',
  issue_date: '2026-08-10',
  due_date: '2026-08-24',
  notes: 'Thanks for the fast turnaround. The next milestone kicks off once this clears.',
  terms: 'Payment due within 14 days. Bank transfer preferred.',
  vat_enabled: true,
  created_at: '2026-08-10T09:00:00.000Z',
  updated_at: '2026-08-10T09:00:00.000Z',
});
