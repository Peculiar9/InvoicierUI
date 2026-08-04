import { create } from 'zustand';

type PanelMode = 'view' | 'create' | 'edit';

interface InvoicePanelState {
  open: boolean;
  mode: PanelMode;
  invoiceId: string | null;
  prefillClientId: string | null;
  /** the ids on screen behind the panel, in the order they are listed */
  siblings: string[];
  setSiblings: (ids: string[]) => void;
  /** move to the next or previous invoice without closing the panel */
  step: (delta: 1 | -1) => void;
  openView: (id: string) => void;
  openCreate: (clientId?: string) => void;
  openEdit: (id: string) => void;
  close: () => void;
}

export const useInvoicePanelStore = create<InvoicePanelState>((set, get) => ({
  open: false,
  mode: 'view',
  invoiceId: null,
  prefillClientId: null,
  siblings: [],
  setSiblings: (ids) => set({ siblings: ids }),
  step: (delta) => {
    const { siblings, invoiceId } = get();
    const at = invoiceId ? siblings.indexOf(invoiceId) : -1;
    const next = siblings[at + delta];
    // the ends are ends: no wrapping, so you always know where you are
    if (at === -1 || !next) return;
    set({ open: true, mode: 'view', invoiceId: next, prefillClientId: null });
  },
  openView: (id) => set({ open: true, mode: 'view', invoiceId: id, prefillClientId: null }),
  openCreate: (clientId) =>
    set({ open: true, mode: 'create', invoiceId: null, prefillClientId: clientId ?? null }),
  openEdit: (id) => set({ open: true, mode: 'edit', invoiceId: id, prefillClientId: null }),
  close: () => set({ open: false }),
}));
