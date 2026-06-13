import { describe, expect, it } from 'vitest';
import { isEmail, isFilled } from './validate';

describe('validate', () => {
  it('accepts valid emails and rejects invalid ones', () => {
    expect(isEmail('a@b.com')).toBe(true);
    expect(isEmail('billing@acme.co.uk')).toBe(true);
    expect(isEmail('nope')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('')).toBe(false);
  });

  it('isFilled trims whitespace', () => {
    expect(isFilled('x')).toBe(true);
    expect(isFilled('   ')).toBe(false);
  });
});
