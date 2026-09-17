import apiClient from './client';
import type { ApiResponse } from '@/types';

/** One currency pair's rate policy, as the backend presents it. */
export interface FxRateRow {
  id: string;
  base_currency: string;
  quote_currency: string;
  fallback_rate: number;
  provider: string;
  provider_enabled: boolean;
  refresh_interval_minutes: number;
  last_provider_rate: number | null;
  last_provider_at: string | null;
  provider_fresh: boolean;
  effective_rate: number;
  effective_source: 'provider' | 'fallback';
  updated_at?: string;
}

/** What the operator sends to set or change a pair. */
export interface UpsertFxRate {
  base_currency: string;
  quote_currency: string;
  fallback_rate: number;
  provider_enabled?: boolean;
}

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

  /** The exchange-rate desk: every pair, with what the feed last said. */
  listFxRates: async (): Promise<FxRateRow[]> => {
    const res = await apiClient.get<ApiResponse<FxRateRow[]>>('/admin/settings/fx');
    return res.data.data;
  },

  /** Set a pair's fallback rate (and whether the live feed is used). */
  upsertFxRate: async (dto: UpsertFxRate): Promise<FxRateRow> => {
    const res = await apiClient.put<ApiResponse<FxRateRow>>('/admin/settings/fx', dto);
    return res.data.data;
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
