import { create } from 'zustand';

type PanelMode = 'view' | 'create' | 'edit';

interface InvoicePanelState {
  open: boolean;
  mode: PanelMode;
  invoice_id: string | null;
  prefillClientId: string | null;
  /** the ids on screen behind the panel, in the order they are listed */
  siblings: string[];
  setSiblings: (ids: string[]) => void;
  /** move to the next or previous invoice without closing the panel */
  step: (delta: 1 | -1) => void;
  openView: (id: string) => void;
  openCreate: (client_id?: string) => void;
  openEdit: (id: string) => void;
  close: () => void;
}

export const useInvoicePanelStore = create<InvoicePanelState>((set, get) => ({
  open: false,
  mode: 'view',
  invoice_id: null,
  prefillClientId: null,
  siblings: [],
  setSiblings: (ids) => set({ siblings: ids }),
  step: (delta) => {
    const { siblings, invoice_id } = get();
    const at = invoice_id ? siblings.indexOf(invoice_id) : -1;
    const next = siblings[at + delta];
    // the ends are ends: no wrapping, so you always know where you are
    if (at === -1 || !next) return;
    set({ open: true, mode: 'view', invoice_id: next, prefillClientId: null });
  },
  openView: (id) => set({ open: true, mode: 'view', invoice_id: id, prefillClientId: null }),
  openCreate: (client_id) =>
    set({
      open: true,
      mode: 'create',
      invoice_id: null,
      // Guard: passed straight to onClick, this receives the click event.
      // Only a real id may prefill, or the form thinks a client is chosen
      // and hides the fields for billing someone new.
      prefillClientId: typeof client_id === 'string' && client_id ? client_id : null,
    }),
  openEdit: (id) => set({ open: true, mode: 'edit', invoice_id: id, prefillClientId: null }),
  close: () => set({ open: false }),
}));
