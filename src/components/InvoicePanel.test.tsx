import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stub the data hooks so the panel renders without a backend.
vi.mock('@/hooks', () => ({
  useClients: () => ({
    data: { data: [{ id: 'cli_1', name: 'Acme Inc', email: 'a@acme.com', createdAt: '2026-01-01' }] },
  }),
  useInvoice: () => ({
    data: {
      id: 'inv_1',
      invoiceNumber: 'IV1',
      client: { id: 'cli_1', name: 'Acme Inc', email: 'a@acme.com', createdAt: '2026-01-01' },
      items: [{ id: 'i1', description: 'Design work', quantity: 2, unitPrice: 100, total: 200 }],
      subtotal: 200,
      tax: 0,
      taxRate: 0,
      total: 200,
      currency: 'USD',
      status: 'sent',
      issueDate: '2026-06-01',
      dueDate: '2026-06-10',
      createdAt: '2026-06-01',
      updatedAt: '2026-06-01',
    },
  }),
  useCreateInvoice: () => ({ mutateAsync: vi.fn() }),
  useUpdateInvoice: () => ({ mutateAsync: vi.fn() }),
  useSendInvoice: () => ({ mutate: vi.fn() }),
  useMarkInvoicePaid: () => ({ mutate: vi.fn() }),
  useDuplicateInvoice: () => ({ mutate: vi.fn() }),
  useDeleteInvoice: () => ({ mutate: vi.fn() }),
}));

import { InvoicePanel } from './InvoicePanel';
import { useInvoicePanelStore } from '@/stores/invoicePanelStore';

describe('invoicePanelStore', () => {
  beforeEach(() => {
    useInvoicePanelStore.setState({ open: false, mode: 'view', invoiceId: null });
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
      invoiceId: 'inv_42',
    });
  });
});

describe('InvoicePanel', () => {
  beforeEach(() => {
    useInvoicePanelStore.setState({ open: false, mode: 'view', invoiceId: null });
  });

  it('renders the create form when opened in create mode', () => {
    useInvoicePanelStore.setState({ open: true, mode: 'create', invoiceId: null });
    render(<InvoicePanel />);
    expect(screen.getByText(/Create invoice/)).toBeInTheDocument();
    expect(screen.getByText('Select a client…')).toBeInTheDocument();
    expect(screen.getByText(/Add item/)).toBeInTheDocument();
    // the floating cute action rail (Save / Send / Preview …) is present while preparing
    expect(screen.getByTitle('Save')).toBeInTheDocument();
    expect(screen.getByTitle('Send')).toBeInTheDocument();
    expect(screen.getByTitle('Preview')).toBeInTheDocument();
  });

  it('pre-fills the client when opened via openCreate(clientId)', () => {
    useInvoicePanelStore.getState().openCreate('cli_1');
    render(<InvoicePanel />);
    const client = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    expect(client.value).toBe('cli_1');
  });

  it('renders the invoice document and actions when opened in view mode', () => {
    useInvoicePanelStore.setState({ open: true, mode: 'view', invoiceId: 'inv_1' });
    render(<InvoicePanel />);
    expect(screen.getByText('Design work')).toBeInTheDocument();
    expect(screen.getAllByText('#IV1').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send/ })).toBeInTheDocument();
  });
});
