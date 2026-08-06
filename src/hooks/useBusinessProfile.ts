import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { businessProfileApi } from '@/api/businessProfile';
import type { BusinessProfileDto, OnboardingPayload } from '@/api/businessProfile';

export const businessProfileKey = ['business-profile'] as const;

/**
 * The profile is server state, so React Query owns it. Zustand keeps only what
 * is genuinely local: the session, and the answers being typed during
 * onboarding before they are saved.
 */
export const useBusinessProfile = (enabled = true) =>
  useQuery({
    queryKey: businessProfileKey,
    queryFn: businessProfileApi.get,
    enabled,
    // it changes when the person changes it, so there is nothing to poll for
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

export const useSaveBusinessProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OnboardingPayload) => businessProfileApi.save(payload),
    meta: { doing: 'Saving your business details' },
    onSuccess: (profile: BusinessProfileDto) => {
      // the response is the new truth; no refetch needed for what we just got
      queryClient.setQueryData(businessProfileKey, profile);
      // invoices carry the business name on their documents
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};

/**
 * Has this account been through onboarding?
 *
 * Derived from the profile rather than stored beside it. A separate flag can
 * disagree with the thing it describes; a business name cannot.
 */
export const hasOnboarded = (profile?: BusinessProfileDto | null): boolean =>
  Boolean(profile?.business_name && profile.business_name !== 'My business');
