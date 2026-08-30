import apiClient from './client';
import type { ApiResponse, ReceivingAccount } from '@/types';

/** A bank the account picker chooses from. */
export interface Bank {
  name: string;
  code: string;
  slug?: string;
  currency?: string;
  type?: string;
}

/** The verified holder of a resolved account. */
export interface ResolvedAccount {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

/** the backend's account row; swift travels as swift_code on the wire */
interface AccountRow {
  id: string;
  label: string;
  provider: string;
  currency: string;
  account_name: string;
  account_number?: string | null;
  bank_name?: string | null;
  routing_number?: string | null;
  swift_code?: string | null;
  iban?: string | null;
  wallet_address?: string | null;
  network?: string | null;
  asset?: string | null;
  instructions?: string | null;
}

/**
 * The wire says `domiciliary`, the UI says `dom`. Two words for one rail, so
 * they are reconciled here and nowhere else — the same trade `normaliseRail`
 * makes on the payment page.
 */
const providerIn = (p: string): ReceivingAccount['provider'] =>
  (p === 'domiciliary' ? 'dom' : p) as ReceivingAccount['provider'];
const providerOut = (p?: string): string | undefined => (p === 'dom' ? 'domiciliary' : p);

const toAccount = (row: AccountRow): ReceivingAccount => ({
  id: row.id,
  label: row.label,
  provider: providerIn(row.provider),
  currency: row.currency,
  account_name: row.account_name,
  account_number: row.account_number ?? undefined,
  bank_name: row.bank_name ?? undefined,
  routing_number: row.routing_number ?? undefined,
  swift: row.swift_code ?? undefined,
  iban: row.iban ?? undefined,
  wallet_address: row.wallet_address ?? undefined,
  network: row.network ?? undefined,
  asset: row.asset ?? undefined,
  instructions: row.instructions ?? undefined,
});

const toWire = (account: Partial<ReceivingAccount>) => ({
  label: account.label,
  provider: providerOut(account.provider),
  currency: account.currency,
  account_name: account.account_name,
  account_number: account.account_number || undefined,
  bank_name: account.bank_name || undefined,
  routing_number: account.routing_number || undefined,
  swift_code: account.swift || undefined,
  iban: account.iban || undefined,
  wallet_address: account.wallet_address || undefined,
  network: account.network || undefined,
  asset: account.asset || undefined,
  instructions: account.instructions || undefined,
});

export interface ServiceRow {
  id: string;
  name: string;
  description?: string | null;
  unit_price: number;
  currency: string;
  unit?: string | null;
}

/**
 * Payment configuration lives on the SERVER, the store is only its mirror.
 * A payer's browser, a second device, a cleared cache: all of them must see
 * the same accounts the sender configured, and localStorage cannot promise
 * that.
 */
export const settingsApi = {
  listAccounts: async (): Promise<ReceivingAccount[]> => {
    const response = await apiClient.get<ApiResponse<AccountRow[]>>(
      '/settings/receiving-accounts'
    );
    return response.data.data.map(toAccount);
  },

  createAccount: async (account: Partial<ReceivingAccount>): Promise<ReceivingAccount> => {
    const response = await apiClient.post<ApiResponse<AccountRow>>(
      '/settings/receiving-accounts',
      toWire(account)
    );
    return toAccount(response.data.data);
  },

  updateAccount: async (
    id: string,
    account: Partial<ReceivingAccount>
  ): Promise<ReceivingAccount> => {
    const response = await apiClient.patch<ApiResponse<AccountRow>>(
      `/settings/receiving-accounts/${id}`,
      toWire(account)
    );
    return toAccount(response.data.data);
  },

  deleteAccount: async (id: string): Promise<void> => {
    await apiClient.delete(`/settings/receiving-accounts/${id}`);
  },

  /** Paystack's supported banks, for the account picker. */
  listBanks: async (): Promise<Bank[]> => {
    const response = await apiClient.get<ApiResponse<Bank[]>>('/settings/banks');
    return response.data.data;
  },

  /** Confirm a NUBAN and get the official account holder name. */
  resolveAccount: async (accountNumber: string, bankCode: string): Promise<ResolvedAccount> => {
    const response = await apiClient.get<ApiResponse<ResolvedAccount>>('/settings/resolve-account', {
      params: { account_number: accountNumber, bank_code: bankCode },
    });
    return response.data.data;
  },

  listServices: async (): Promise<ServiceRow[]> => {
    const response = await apiClient.get<ApiResponse<ServiceRow[]>>('/settings/services');
    return response.data.data;
  },

  createService: async (service: Omit<ServiceRow, 'id'>): Promise<ServiceRow> => {
    const response = await apiClient.post<ApiResponse<ServiceRow>>(
      '/settings/services',
      service
    );
    return response.data.data;
  },

  updateService: async (id: string, updates: Partial<ServiceRow>): Promise<ServiceRow> => {
    const response = await apiClient.patch<ApiResponse<ServiceRow>>(
      `/settings/services/${id}`,
      updates
    );
    return response.data.data;
  },

  deleteService: async (id: string): Promise<void> => {
    await apiClient.delete(`/settings/services/${id}`);
  },
};
