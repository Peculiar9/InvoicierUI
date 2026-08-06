import { render as rtlRender, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** the panel talks to the query cache directly, so it needs a provider */
const render = (ui: ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stub the data hooks so the panel renders without a backend.
vi.mock('@/hooks', () => ({
  useClients: () => ({
    data: { data: [{ id: 'cli_1', name: 'Acme Inc', email: 'a@acme.com', created_at: '2026-01-01' }] },
  }),
  useInvoice: () => ({
    data: {
      id: 'inv_1',
      invoice_number: 'IV1',
      client: { id: 'cli_1', name: 'Acme Inc', email: 'a@acme.com', created_at: '2026-01-01' },
      items: [{ id: 'i1', description: 'Design work', quantity: 2, unit_price: 100, total: 200 }],
      subtotal: 200,
      tax: 0,
      tax_rate: 0,
      total: 200,
      currency: 'USD',
      status: 'sent',
      issue_date: '2026-06-01',
      due_date: '2026-06-10',
      created_at: '2026-06-01',
      updated_at: '2026-06-01',
    },
  }),
  useCreateInvoice: () => ({ mutateAsync: vi.fn() }),
  useUpdateInvoice: () => ({ mutateAsync: vi.fn() }),
  useSendInvoice: () => ({ mutate: vi.fn() }),
  useMarkInvoicePaid: () => ({ mutate: vi.fn() }),
  useDuplicateInvoice: () => ({ mutate: vi.fn() }),
  useDeleteInvoice: () => ({ mutate: vi.fn() }),
  useCreateClient: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { InvoicePanel } from './InvoicePanel';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';

describe('invoicePanelStore', () => {
  beforeEach(() => {
    useInvoicePanelStore.setState({ open: false, mode: 'view', invoice_id: null });
  });

  it('openCreate opens the panel in create mode', () => {
    useInvoicePanelStore.getState().openCreate();
    expect(useInvoicePanelStore.getState()).toMatchObject({ open: true, mode: 'create' });
  });

  it('openView opens the panel for a specific invoice', () => {
    useInvoicePanelStore.getState().openView('inv_42');
    expect(useInvoicePanelStore.getState()).toMatchObject({
      open: true,
      mode: 'view',
      invoice_id: 'inv_42',
    });
  });
});

describe('InvoicePanel', () => {
  beforeEach(() => {
    useInvoicePanelStore.setState({ open: false, mode: 'view', invoice_id: null });
  });

  it('renders the create form when opened in create mode', () => {
    useInvoicePanelStore.setState({ open: true, mode: 'create', invoice_id: null });
    render(<InvoicePanel />);
    expect(screen.getByText(/Create invoice/)).toBeInTheDocument();
    // a client is optional now: the picker offers "someone new" by default
    expect(screen.getByText('Someone new…')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Otto Holdings')).toBeInTheDocument();
    expect(screen.getByText(/Add item/)).toBeInTheDocument();
    // the sticky action bar (Save / Send / Preview …) is present while preparing
    expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preview/ })).toBeInTheDocument();
  });

  it('pre-fills the client when opened via openCreate(client_id)', () => {
    useInvoicePanelStore.getState().openCreate('cli_1');
    render(<InvoicePanel />);
    const client = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    expect(client.value).toBe('cli_1');
  });

  it('renders the invoice document and actions when opened in view mode', () => {
    useInvoicePanelStore.setState({ open: true, mode: 'view', invoice_id: 'inv_1' });
    render(<InvoicePanel />);
    expect(screen.getByText('Design work')).toBeInTheDocument();
    expect(screen.getAllByText('#IV1').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/ })).toBeInTheDocument();
  });
});
