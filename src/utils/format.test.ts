import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercentage,
  truncateText,
  generateInvoiceNumber,
} from './format';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1000)).toBe('$1,000.00');
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats different currencies', () => {
    expect(formatCurrency(1000, 'EUR')).toContain('1,000.00');
    expect(formatCurrency(1000, 'GBP')).toContain('1,000.00');
  });

  it('handles zero and negative values', () => {
    expect(formatCurrency(0)).toBe('$0.00');
    expect(formatCurrency(-500)).toBe('-$500.00');
  });
});

describe('formatDate', () => {
  it('formats date correctly', () => {
    const result = formatDate('2024-12-15');
    expect(result).toContain('Dec');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('accepts Date objects', () => {
    const result = formatDate(new Date('2024-12-15'));
    expect(result).toContain('Dec');
  });

  it('accepts custom options', () => {
    const result = formatDate('2024-12-15', { weekday: 'long' });
    expect(result).toContain('Sunday');
  });
});

describe('formatNumber', () => {
  it('formats numbers with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('handles decimals', () => {
    expect(formatNumber(1234.56)).toBe('1,234.56');
  });
});

describe('formatPercentage', () => {
  it('formats percentages correctly', () => {
    expect(formatPercentage(50)).toBe('50.0%');
    expect(formatPercentage(33.333, 2)).toBe('33.33%');
  });
});

describe('truncateText', () => {
  it('truncates long text', () => {
    const result = truncateText('This is a very long text', 10);
    expect(result).toBe('This is a ...');
  });

  it('does not truncate short text', () => {
    const result = truncateText('Short', 10);
    expect(result).toBe('Short');
  });
});

describe('generateInvoiceNumber', () => {
  it('generates valid invoice number', () => {
    const result = generateInvoiceNumber();
    expect(result).toMatch(/^INV-[A-Z0-9]+-[A-Z0-9]+$/);
  });

  it('generates unique numbers', () => {
    const num1 = generateInvoiceNumber();
    const num2 = generateInvoiceNumber();
    expect(num1).not.toBe(num2);
  });
});
