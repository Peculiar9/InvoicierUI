import apiClient from './client';
import type { ApiResponse } from '@/types';

/**
 * The business profile: what a client reads at the top of every invoice.
 *
 * It doubles as the onboarding record. There is no separate "has onboarded"
 * flag to drift out of step with the details it claims to describe: a profile
 * with a real business name is an account that has been through onboarding.
 */
export interface BusinessProfileDto {
  id: string;
  user_id: string;
  business_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  default_currency: string;
  invoice_template: string;
  route_by_currency: Record<string, string>;
  default_account_by_currency: Record<string, string>;
  invoice_sequence: number;
  receipt_sequence: number;
  created_at: string;
  updated_at: string;
}

export type OnboardingPayload = Partial<
  Pick<
    BusinessProfileDto,
    | 'business_name'
    | 'email'
    | 'phone'
    | 'address'
    | 'logo_url'
    | 'default_currency'
    | 'invoice_template'
  >
>;

export const businessProfileApi = {
  get: async (): Promise<BusinessProfileDto> => {
    const response = await apiClient.get<ApiResponse<BusinessProfileDto>>('/business-profile');
    return response.data.data;
  },

  save: async (payload: OnboardingPayload): Promise<BusinessProfileDto> => {
    const response = await apiClient.patch<ApiResponse<BusinessProfileDto>>(
      '/business-profile',
      payload
    );
    return response.data.data;
  },
};
