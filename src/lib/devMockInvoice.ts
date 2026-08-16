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

// a settled variant, so /pay/inv_paid renders the receipt-printer completion
// while we refine the pay flow. Same guard as above: DEV only.
const isPaidMockId = (id: string): boolean => /paid/i.test(id);

// a foreign variant, so /pay/inv_usd exercises the non-NGN flow: the USD rail
// list (dom USD, Grey USD, Wise EUR, USDT) shows and Paystack does not.
const isUsdMockId = (id: string): boolean => /usd/i.test(id);

export const devMockInvoice = (id: string): Invoice => {
  const usd = isUsdMockId(id);
  return {
  id,
  invoice_number: 'ADA-0004',
  client: null,
  bill_to_name: 'Emeka Okafor',
  bill_to_email: 'emeka@okaforventures.ng',
  items: usd
    ? [
        { id: 'it_1', description: 'Brand identity system', quantity: 1, unit_price: 1800, total: 1800 },
        { id: 'it_2', description: 'Social launch kit, 6 templates', quantity: 1, unit_price: 700, total: 700 },
      ]
    : [
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
  // every rail the sender offers; the pay page lists these under Bank transfer
  payment_accounts: [
    {
      label: 'GTBank, Naira',
      provider: 'bank',
      currency: 'NGN',
      account_name: 'Ada Studio Ltd',
      account_number: '0123456789',
      bank_name: 'Guaranty Trust Bank',
      instructions: 'Use ADA-0004 as your transfer reference.',
    },
    {
      label: 'Grey, Naira',
      provider: 'grey',
      currency: 'NGN',
      account_name: 'Ada Studio',
      account_number: '9876543210',
      bank_name: 'Grey',
    },
    {
      label: 'Domiciliary, US Dollar',
      provider: 'domiciliary',
      currency: 'USD',
      account_name: 'Ada Studio Ltd',
      account_number: '2001234567',
      bank_name: 'GTBank',
      swift_code: 'GTBINGLA',
    },
    {
      label: 'Grey, US Dollar',
      provider: 'grey',
      currency: 'USD',
      account_name: 'Ada Studio',
      account_number: '1122334455',
      bank_name: 'Community Federal Savings Bank',
      routing_number: '026073150',
    },
    {
      label: 'Wise, Euro',
      provider: 'wise',
      currency: 'EUR',
      account_name: 'Ada Studio',
      iban: 'BE00 0000 0000 0000 0000',
    },
    {
      label: 'USDT, crypto',
      provider: 'crypto',
      currency: 'USD',
      account_name: 'Ada Studio',
      asset: 'USDT',
      network: 'TRC-20',
      wallet_address: 'TJ9xKq4rA2Vd8sC1nB7wYf3mZ6pL0eR5h',
    },
  ],
  // USD keeps the maths simple (no VAT); NGN carries the 7.5% line
  subtotal: usd ? 2500 : 250000,
  tax: usd ? 0 : 18750,
  tax_rate: usd ? 0 : 0.075,
  total: usd ? 2500 : 268750,
  currency: usd ? 'USD' : 'NGN',
  status: isPaidMockId(id) ? 'paid' : 'sent',
  issue_date: '2026-08-10',
  due_date: '2026-08-24',
  notes: 'Thanks for the fast turnaround. The next milestone kicks off once this clears.',
  terms: 'Payment due within 14 days. Bank transfer preferred.',
  vat_enabled: !usd,
  // only the settled variant carries what a receipt needs
  ...(isPaidMockId(id)
    ? {
        amount_received: 268750,
        date_received: '2026-08-14',
        payment_method: 'Bank transfer',
        receipt_number: 'RC-ADA-0004',
        receipted_at: '2026-08-14T10:15:00.000Z',
        claim_reference: 'ADA-0004',
      }
    : {}),
  created_at: '2026-08-10T09:00:00.000Z',
  updated_at: '2026-08-10T09:00:00.000Z',
  };
};
