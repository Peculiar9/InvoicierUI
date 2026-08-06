import { create } from 'zustand';
import type { Invoice, InvoiceItem } from '@/types';

interface InvoiceDraft {
  client_id: string;
  items: InvoiceItem[];
  currency: string;
  due_date: string;
  notes: string;
  terms: string;
  tax_rate: number;
}

interface InvoiceState {
  draft: InvoiceDraft;
  selectedInvoice: Invoice | null;
  isPreviewOpen: boolean;
}

interface InvoiceActions {
  setDraft: (draft: Partial<InvoiceDraft>) => void;
  addItem: (item: Omit<InvoiceItem, 'id' | 'total'>) => void;
  updateItem: (id: string, updates: Partial<InvoiceItem>) => void;
  removeItem: (id: string) => void;
  clearDraft: () => void;
  setSelectedInvoice: (invoice: Invoice | null) => void;
  setPreviewOpen: (open: boolean) => void;
  calculateTotals: () => { subtotal: number; tax: number; total: number };
}

type InvoiceStore = InvoiceState & InvoiceActions;

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialDraft: InvoiceDraft = {
  client_id: '',
  items: [],
  currency: 'USD',
  due_date: '',
  notes: '',
  terms: 'Payment due within 30 days',
  tax_rate: 0,
};

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  draft: initialDraft,
  selectedInvoice: null,
  isPreviewOpen: false,

  setDraft: (updates) =>
    set((state) => ({
      draft: { ...state.draft, ...updates },
    })),

  addItem: (item) =>
    set((state) => ({
      draft: {
        ...state.draft,
        items: [
          ...state.draft.items,
          {
            ...item,
            id: generateId(),
            total: item.quantity * item.unit_price,
          },
        ],
      },
    })),

  updateItem: (id, updates) =>
    set((state) => ({
      draft: {
        ...state.draft,
        items: state.draft.items.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item, ...updates };
          return { ...updated, total: updated.quantity * updated.unit_price };
        }),
      },
    })),

  removeItem: (id) =>
    set((state) => ({
      draft: {
        ...state.draft,
        items: state.draft.items.filter((item) => item.id !== id),
      },
    })),

  clearDraft: () => set({ draft: initialDraft }),

  setSelectedInvoice: (invoice) => set({ selectedInvoice: invoice }),

  setPreviewOpen: (open) => set({ isPreviewOpen: open }),

  calculateTotals: () => {
    const { items, tax_rate } = get().draft;
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * (tax_rate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  },
}));
