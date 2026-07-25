import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Persona = 'freelancer' | 'studio' | 'specialist' | 'collector';

export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  /* ---- brand, collected in the welcome journey ---- */
  /** data-URL logo; absent means the wordmark default */
  logo?: string;
  /** accent color used on the invoice document */
  brandColor?: string;
  persona?: Persona;
  /* ---- tax posture: sets the invoice form defaults ---- */
  vatRegistered?: boolean;
  whtUsual?: boolean;
  tin?: string;
}

interface SettingsState {
  profile: BusinessProfile;
  onboarded: boolean;
  setProfile: (updates: Partial<BusinessProfile>) => void;
  completeOnboarding: (updates: Partial<BusinessProfile>) => void;
}

const defaultProfile: BusinessProfile = {
  name: 'Shoes Company Resolve',
  email: 'accounts@resolve.co',
  phone: '08120822334',
  address: 'No 1 This is the actual address, Lagos',
  currency: 'NGN',
  brandColor: '#924ee9',
  vatRegistered: true,
  whtUsual: false,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      onboarded: false,
      setProfile: (updates) =>
        set((state) => ({ profile: { ...state.profile, ...updates } })),
      completeOnboarding: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
          onboarded: true,
        })),
    }),
    {
      name: 'invoicier-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
