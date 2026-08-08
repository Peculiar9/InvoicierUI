import apiClient from './client';
import type { ApiResponse, ReceivingAccount } from '@/types';

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
  instructions?: string | null;
}

const toAccount = (row: AccountRow): ReceivingAccount => ({
  id: row.id,
  label: row.label,
  provider: row.provider as ReceivingAccount['provider'],
  currency: row.currency,
  account_name: row.account_name,
  account_number: row.account_number ?? undefined,
  bank_name: row.bank_name ?? undefined,
  routing_number: row.routing_number ?? undefined,
  swift: row.swift_code ?? undefined,
  iban: row.iban ?? undefined,
  instructions: row.instructions ?? undefined,
});

const toWire = (account: Partial<ReceivingAccount>) => ({
  label: account.label,
  provider: account.provider,
  currency: account.currency,
  account_name: account.account_name,
  account_number: account.account_number || undefined,
  bank_name: account.bank_name || undefined,
  routing_number: account.routing_number || undefined,
  swift_code: account.swift || undefined,
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
 * Payment configuration lives on the SERVER — the store is only its mirror.
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
