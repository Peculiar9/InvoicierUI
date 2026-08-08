import type { BusinessProfile } from '@/stores/settingsStore';
import type { Invoice, PaymentRoute, ReceivingAccount } from '@/types';

/**
 * Which routes an invoice actually offers.
 *
 * The invoice's own choice wins, then the sender's default for that
 * currency, then a sensible fallback. A transfer route is only real if there
 * is an account to transfer into, so it is dropped when there is not.
 */
export const resolveRoutes = (
  invoice: Pick<Invoice, 'currency' | 'payment_route' | 'receiving_account_id'>,
  profile: Pick<
    BusinessProfile,
    'receivingAccounts' | 'routeByCurrency' | 'defaultAccountByCurrency'
  >
): { instant: boolean; transfer: boolean; account: ReceivingAccount | null } => {
  const accounts = profile.receivingAccounts ?? [];
  // the invoice's choice, then the currency's default, then any match
  const defaultId = profile.defaultAccountByCurrency?.[invoice.currency];
  const account =
    accounts.find((a) => a.id === invoice.receiving_account_id) ??
    accounts.find((a) => a.id === defaultId && a.currency === invoice.currency) ??
    accounts.find((a) => a.currency === invoice.currency) ??
    null;

  const chosen: PaymentRoute =
    invoice.payment_route ??
    profile.routeByCurrency?.[invoice.currency] ??
    (invoice.currency === 'NGN' ? 'instant' : 'transfer');

  const wantsTransfer = chosen === 'transfer' || chosen === 'both';
  const wantsInstant = chosen === 'instant' || chosen === 'both';
  const transfer = wantsTransfer && Boolean(account);

  return {
    // never leave a payer with nothing to click
    instant: wantsInstant || !transfer,
    transfer,
    account: transfer ? account : null,
  };
};

export const PROVIDER_LABELS: Record<string, string> = {
  grey: 'Grey',
  fincra: 'Fincra',
  dom: 'Domiciliary account',
  bank: 'Bank account',
  wise: 'Wise',
  paypal: 'PayPal',
  other: 'Other',
};

/* ============================================================================
   THE FIELD SPEC — one description of what each (provider, currency) account
   actually consists of. The add-account modal renders its inputs from this,
   the validator checks against it, and the payer-facing displays (payment
   page, PDF "How to pay" block) print exactly the fields it names. One
   spec, three consumers, zero drift.
   ========================================================================== */

export interface AccountFieldSpec {
  key: 'account_number' | 'bank_name' | 'routing_number' | 'swift' | 'iban';
  label: string;
  placeholder?: string;
  required?: boolean;
  /** how to validate what was typed */
  kind?: 'email' | 'digits' | 'text';
  /** exact digit count when kind is digits */
  digits?: number;
  hint?: string;
}

/**
 * What this kind of account, in this currency, is made of. NUBAN for Nigerian
 * banks, sort codes for GBP, IBAN+BIC for EUR, ABA routing for USD — and
 * PayPal is just an email wearing a trench coat.
 */
export const accountFieldsFor = (provider: string, currency: string): AccountFieldSpec[] => {
  if (provider === 'paypal') {
    return [{ key: 'account_number', label: 'PayPal email', placeholder: 'you@example.com', required: true, kind: 'email' }];
  }
  if (provider === 'grey' || provider === 'fincra') {
    return [
      { key: 'account_number', label: `${PROVIDER_LABELS[provider]} account number`, placeholder: '0123456789', required: true },
      { key: 'bank_name', label: 'Issuing bank (as shown in the app)', placeholder: 'e.g. Community Federal Savings Bank' },
      ...(currency === 'USD' ? [{ key: 'routing_number', label: 'ACH routing number', placeholder: '026073150' } as AccountFieldSpec] : []),
    ];
  }
  if (provider === 'dom') {
    return [
      { key: 'account_number', label: 'Domiciliary account number', placeholder: '0123456789', required: true, kind: 'digits', digits: 10, hint: 'Your Nigerian bank, foreign-currency account' },
      { key: 'bank_name', label: 'Bank', placeholder: 'Zenith Bank', required: true },
      { key: 'swift', label: 'SWIFT / BIC', placeholder: 'ZEIBNGLA', required: true },
    ];
  }
  // bank / wise / other — shaped by the currency's own rails
  switch (currency) {
    case 'NGN':
      return [
        { key: 'account_number', label: 'Account number (NUBAN)', placeholder: '0123456789', required: true, kind: 'digits', digits: 10 },
        { key: 'bank_name', label: 'Bank', placeholder: 'GTBank', required: true },
      ];
    case 'GBP':
      return [
        { key: 'account_number', label: 'Account number', placeholder: '12345678', required: true, kind: 'digits', digits: 8 },
        { key: 'routing_number', label: 'Sort code', placeholder: '04-00-04', required: true },
        { key: 'bank_name', label: 'Bank', placeholder: 'Monzo' },
      ];
    case 'EUR':
      return [
        { key: 'iban', label: 'IBAN', placeholder: 'BE12 3456 7890 1234', required: true },
        { key: 'swift', label: 'BIC', placeholder: 'TRWIBEB1' },
        { key: 'bank_name', label: 'Bank' },
      ];
    case 'USD':
    default:
      return [
        { key: 'account_number', label: 'Account number', placeholder: '9600000000', required: true },
        { key: 'routing_number', label: 'ACH routing number (ABA)', placeholder: '026073150', required: true },
        { key: 'swift', label: 'SWIFT (for wires)', placeholder: 'CMFGUS33' },
        { key: 'bank_name', label: 'Bank', placeholder: 'Community Federal Savings Bank' },
      ];
  }
};

/** the payer-facing rows, derived from the same spec the form used */
export const accountDisplayRows = (
  account: Partial<Record<'provider' | 'currency' | 'account_name' | 'account_number' | 'bank_name' | 'routing_number' | 'swift' | 'iban' | 'instructions', string | null | undefined>>
): [string, string][] => {
  const spec = accountFieldsFor(account.provider ?? 'bank', account.currency ?? 'USD');
  const rows: [string, string][] = [];
  if (account.account_name) rows.push(['Account name', account.account_name]);
  for (const field of spec) {
    const value = account[field.key];
    if (value) rows.push([field.label, value]);
  }
  return rows;
};
