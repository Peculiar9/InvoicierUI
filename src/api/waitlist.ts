import apiClient from './client';
import type { ApiResponse } from '@/types';

export interface WaitlistJoin {
  position: number;
  referral_code: string;
  referral_url: string;
  already: boolean;
}

/** where a ?ref= from a shared link waits until its owner signs up */
export const REF_KEY = 'invoicier-ref';

const utcOffset = (): string => {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  const abs = Math.abs(minutes);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
};

export const waitlistApi = {
  join: async (email: string): Promise<WaitlistJoin> => {
    let ref: string | undefined;
    try {
      ref = localStorage.getItem(REF_KEY) ?? undefined;
    } catch {
      // private mode: the signup still counts, the referral does not
    }
    const response = await apiClient.post<ApiResponse<WaitlistJoin>>('/waitlist/join', {
      email,
      utc_offset: utcOffset(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(ref ? { ref } : {}),
      // patient on purpose: a sleeping staging backend can take ~15s to wake,
      // and "cold start" must never read as "could not reach the list"
    }, { timeout: 30000 });
    return response.data.data;
  },
};
