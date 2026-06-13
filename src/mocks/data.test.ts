import { describe, expect, it } from 'vitest';
import { computeStats, computeStatusChart, invoices, saveDb } from './data';

// Fresh module + empty localStorage in the test env => seed data is used.
describe('mock data (live-computed)', () => {
  it('computes dashboard stats from the seed invoices', () => {
    const stats = computeStats();
    const paidTotal = invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + i.total, 0);
    expect(stats.totalInvoices).toBe(invoices.length);
    expect(stats.totalReceived).toBe(paidTotal);
    expect(stats.totalReceived).toBeGreaterThan(0);
  });

  it('status chart totals equal the invoice count', () => {
    const chart = computeStatusChart();
    const total = chart.datasets[0].data.reduce((a, b) => a + b, 0);
    expect(total).toBe(invoices.length);
    expect(chart.labels).toHaveLength(5);
  });

  it('persists the database to localStorage', () => {
    saveDb();
    const raw = localStorage.getItem('invoicier-db');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed.invoices).toHaveLength(invoices.length);
    expect(Array.isArray(parsed.clients)).toBe(true);
  });
});
