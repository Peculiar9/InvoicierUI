import { create } from 'zustand';

type PanelMode = 'view' | 'create' | 'edit';

interface InvoicePanelState {
  open: boolean;
  mode: PanelMode;
  invoiceId: string | null;
  prefillClientId: string | null;
  openView: (id: string) => void;
  openCreate: (clientId?: string) => void;
  openEdit: (id: string) => void;
  close: () => void;
}

export const useInvoicePanelStore = create<InvoicePanelState>((set) => ({
  open: false,
  mode: 'view',
  invoiceId: null,
  prefillClientId: null,
  openView: (id) => set({ open: true, mode: 'view', invoiceId: id, prefillClientId: null }),
  openCreate: (clientId) =>
    set({ open: true, mode: 'create', invoiceId: null, prefillClientId: clientId ?? null }),
  openEdit: (id) => set({ open: true, mode: 'edit', invoiceId: id, prefillClientId: null }),
  close: () => set({ open: false }),
}));
