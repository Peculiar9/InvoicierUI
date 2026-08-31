import apiClient from './client';
import type { ApiResponse } from '@/types';

/** One stored bank-code → logo mapping, as the operator manages it. */
export interface BankLogoRow {
  bank_code: string;
  logo_url: string;
}

/**
 * Operator-only calls. Admin is a role on an ordinary account, so these ride
 * the same token as everything else; the backend answers 403 when the caller
 * is not an admin, which is how the admin pages gate themselves.
 */
export const adminApi = {
  /** Probe used to decide whether to show an admin surface at all. */
  isAdmin: async (): Promise<boolean> => {
    try {
      await apiClient.get('/admin/access/me');
      return true;
    } catch {
      return false;
    }
  },

  listBankLogos: async (): Promise<BankLogoRow[]> => {
    const res = await apiClient.get<ApiResponse<BankLogoRow[]>>('/admin/bank-logos');
    return res.data.data;
  },

  /** Upload (or replace) one bank's logo. Overwrites the object keyed by code. */
  uploadBankLogo: async (code: string, file: File): Promise<BankLogoRow> => {
    const body = new FormData();
    body.append('logo', file);
    const res = await apiClient.post<ApiResponse<BankLogoRow>>(
      `/admin/bank-logos/${encodeURIComponent(code)}`,
      body,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return res.data.data;
  },
};
