import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
}

interface SettingsState {
  profile: BusinessProfile;
  setProfile: (updates: Partial<BusinessProfile>) => void;
}

const defaultProfile: BusinessProfile = {
  name: 'Shoes Company Resolve',
  email: 'accounts@resolve.co',
  phone: '08120822334',
  address: 'No 1 This is the actual address, Lagos',
  currency: 'USD',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      setProfile: (updates) =>
        set((state) => ({ profile: { ...state.profile, ...updates } })),
    }),
    {
      name: 'invoicier-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
