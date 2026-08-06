import { describe, it, expect, beforeEach } from 'vitest';
import { useInvoiceStore } from './invoiceStore';

describe('invoiceStore', () => {
  beforeEach(() => {
    useInvoiceStore.setState({
      draft: {
        client_id: '',
        items: [],
        currency: 'USD',
        due_date: '',
        notes: '',
        terms: 'Payment due within 30 days',
        tax_rate: 0,
      },
      selectedInvoice: null,
      isPreviewOpen: false,
    });
  });

  it('should start with initial state', () => {
    const state = useInvoiceStore.getState();
    expect(state.draft.items).toHaveLength(0);
    expect(state.draft.currency).toBe('USD');
  });

  it('should add items to draft', () => {
    useInvoiceStore.getState().addItem({
      description: 'Web Design',
      quantity: 1,
      unit_price: 1000,
    });

    const state = useInvoiceStore.getState();
    expect(state.draft.items).toHaveLength(1);
    expect(state.draft.items[0].description).toBe('Web Design');
    expect(state.draft.items[0].total).toBe(1000);
  });

  it('should update items', () => {
    useInvoiceStore.getState().addItem({
      description: 'Web Design',
      quantity: 1,
      unit_price: 1000,
    });

    const itemId = useInvoiceStore.getState().draft.items[0].id;
    useInvoiceStore.getState().updateItem(itemId, { quantity: 2 });

    const state = useInvoiceStore.getState();
    expect(state.draft.items[0].quantity).toBe(2);
    expect(state.draft.items[0].total).toBe(2000);
  });

  it('should remove items', () => {
    useInvoiceStore.getState().addItem({
      description: 'Web Design',
      quantity: 1,
      unit_price: 1000,
    });

    const itemId = useInvoiceStore.getState().draft.items[0].id;
    useInvoiceStore.getState().removeItem(itemId);

    const state = useInvoiceStore.getState();
    expect(state.draft.items).toHaveLength(0);
  });

  it('should calculate totals correctly', () => {
    useInvoiceStore.getState().addItem({
      description: 'Web Design',
      quantity: 2,
      unit_price: 500,
    });

    useInvoiceStore.getState().addItem({
      description: 'Development',
      quantity: 10,
      unit_price: 100,
    });

    useInvoiceStore.getState().setDraft({ tax_rate: 10 });

    const totals = useInvoiceStore.getState().calculateTotals();
    expect(totals.subtotal).toBe(2000);
    expect(totals.tax).toBe(200);
    expect(totals.total).toBe(2200);
  });

  it('should clear draft', () => {
    useInvoiceStore.getState().addItem({
      description: 'Web Design',
      quantity: 1,
      unit_price: 1000,
    });

    useInvoiceStore.getState().setDraft({ client_id: '123' });
    useInvoiceStore.getState().clearDraft();

    const state = useInvoiceStore.getState();
    expect(state.draft.items).toHaveLength(0);
    expect(state.draft.client_id).toBe('');
  });
});
