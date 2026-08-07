import { describe, expect, it, beforeEach } from 'vitest';

/**
 * A deploy that adds a filter must not white-screen anyone holding state from
 * the deploy before it.
 */
describe('persisted list state survives an older shape', () => {
  beforeEach(() => {
    localStorage.clear();
    // what a previous version wrote: no `query`, no `currencyFilter`
    localStorage.setItem(
      'invoicier-list-state',
      JSON.stringify({ state: { invoices: { status: 'paid', page: 2 } }, version: 0 })
    );
  });

  it('fills the missing fields from the defaults', async () => {
    const { useListStateStore } = await import('@/stores/listStateStore');
    const state = useListStateStore.getState().invoices;

    // kept what was saved
    expect(state.status).toBe('paid');
    expect(state.page).toBe(2);
    // and did not leave holes that the page would call .trim() on
    expect(typeof state.query).toBe('string');
    expect(typeof state.currencyFilter).toBe('string');
    expect(state.range).toBeDefined();
    expect(state.sort?.key).toBeDefined();
  });
});
