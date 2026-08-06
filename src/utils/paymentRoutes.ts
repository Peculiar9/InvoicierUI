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
