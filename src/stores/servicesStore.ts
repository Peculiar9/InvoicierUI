import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
}

interface ServicesState {
  services: ServiceItem[];
  addService: (service: Omit<ServiceItem, 'id'>) => void;
  /** the server's list wholesale, the mirror accepts what the truth says */
  replaceAll: (services: ServiceItem[]) => void;
  updateService: (id: string, updates: Partial<ServiceItem>) => void;
  removeService: (id: string) => void;
}

// Production starts empty: a real user's services are their own, not sample
// data. (Existing local seeds age out as people add their own.)
let counter = 0;
const nextId = () => `svc_${Date.now().toString(36)}${(++counter).toString(36)}`;

const sameService = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const useServicesStore = create<ServicesState>()(
  persist(
    (set) => ({
      services: [],
      addService: (service) =>
        set((state) => {
          // idempotency: a second tap with the same name does not duplicate it
          if (state.services.some((s) => sameService(s.name, service.name))) return state;
          return { services: [{ id: nextId(), ...service }, ...state.services] };
        }),
      replaceAll: (services) => set({ services }),
      updateService: (id, updates) =>
        set((state) => ({
          services: state.services.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),
      removeService: (id) =>
        set((state) => ({ services: state.services.filter((s) => s.id !== id) })),
    }),
    {
      name: 'invoicier-services',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
