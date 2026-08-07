import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InvoiceStatus } from '@/types';
import type { DateRangeValue } from '@/utils/dateRange';
import { EMPTY_RANGE } from '@/utils/dateRange';

export type InvoiceSortKey =
  | 'invoice_number'
  | 'client'
  | 'issue_date'
  | 'due_date'
  | 'date_received'
  | 'total'
  | 'status';

export type ClientSortKey = 'name-asc' | 'name-desc' | 'newest' | 'oldest';

interface InvoiceListState {
  status: InvoiceStatus | 'all';
  query: string;
  page: number;
  pageSize: number;
  sort: { key: InvoiceSortKey; dir: 1 | -1 };
  clientFilter: string;
  currencyFilter: string;
  dateField: 'issue_date' | 'due_date' | 'date_received';
  range: DateRangeValue;
}

interface ClientListState {
  query: string;
  range: DateRangeValue;
  view: 'grid' | 'list';
  sortKey: ClientSortKey;
  page: number;
  pageSize: number;
}

interface ListStateStore {
  invoices: InvoiceListState;
  clients: ClientListState;
  setInvoices: (patch: Partial<InvoiceListState>) => void;
  setClients: (patch: Partial<ClientListState>) => void;
  resetInvoices: () => void;
}

const INVOICE_DEFAULTS: InvoiceListState = {
  status: 'all',
  query: '',
  page: 1,
  pageSize: 8,
  sort: { key: 'issue_date', dir: -1 },
  clientFilter: '',
  currencyFilter: '',
  dateField: 'issue_date',
  range: EMPTY_RANGE,
};

const CLIENT_DEFAULTS: ClientListState = {
  query: '',
  range: EMPTY_RANGE,
  view: 'grid',
  sortKey: 'name-asc',
  page: 1,
  pageSize: 8,
};

/**
 * How the lists were left. Opening an invoice and coming back should not
 * throw away the filters you set to find it, and neither should a reload.
 */
export const useListStateStore = create<ListStateStore>()(
  persist(
    (set) => ({
      invoices: INVOICE_DEFAULTS,
      clients: CLIENT_DEFAULTS,
      setInvoices: (patch) =>
        set((s) => ({ invoices: { ...s.invoices, ...patch } })),
      setClients: (patch) => set((s) => ({ clients: { ...s.clients, ...patch } })),
      resetInvoices: () => set({ invoices: INVOICE_DEFAULTS }),
    }),
    {
      name: 'invoicier-list-state',
      // No version bump: raising it without a `migrate` makes zustand discard
      // the stored state outright, which is a worse answer to shape drift than
      // the merge below, and loses the filters the person had set.
      /**
       * Merge over the defaults rather than replacing them.
       *
       * Persisted state is written by whichever version of the app the person
       * last used. Adding a filter field meant their stored object had no
       * `query`, and the first `query.trim()` threw before anything rendered:
       * a white screen after a deploy, cleared only by wiping site data. Now a
       * missing field falls back to its default and the page just works.
       */
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<ListStateStore>;
        return {
          ...current,
          invoices: { ...INVOICE_DEFAULTS, ...(saved.invoices ?? {}) },
          clients: { ...CLIENT_DEFAULTS, ...(saved.clients ?? {}) },
        };
      },
      // the search box is the one thing that should not greet you tomorrow
      partialize: (s) => ({
        invoices: { ...s.invoices, query: '' },
        clients: { ...s.clients, query: '' },
      }),
    }
  )
);
