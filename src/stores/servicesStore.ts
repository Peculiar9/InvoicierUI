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
  updateService: (id: string, updates: Partial<ServiceItem>) => void;
  removeService: (id: string) => void;
}

const seed: ServiceItem[] = [
  { id: 'svc_1', name: 'Brand & identity design', description: 'Logo, palette and guidelines', price: 1200 },
  { id: 'svc_2', name: 'Website build', description: 'Design and front-end build', price: 3500 },
  { id: 'svc_3', name: 'Monthly retainer', description: 'Ongoing support and updates', price: 800 },
];

let counter = seed.length;
const nextId = () => `svc_${++counter}_${seed.length}`;

export const useServicesStore = create<ServicesState>()(
  persist(
    (set) => ({
      services: seed,
      addService: (service) =>
        set((state) => ({
          services: [{ id: nextId(), ...service }, ...state.services],
        })),
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
