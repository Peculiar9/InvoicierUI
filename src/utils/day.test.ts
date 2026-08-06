import { describe, expect, it, vi, afterEach } from 'vitest';
import { todayLocal, parseDay, localDayOf } from '@/utils/day';
import { formatDate } from '@/utils/format';

// 00:30 on 1 January in Lagos is still 31 December in UTC.
const LAGOS_NEW_YEAR = new Date('2026-12-31T23:30:00Z');

describe('calendar days follow the person, not UTC', () => {
  afterEach(() => vi.useRealTimers());

  it('files a Lagos new-year payment in the right year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(LAGOS_NEW_YEAR);

    // the old way: UTC has not turned the year over yet
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-12-31');

    // 00:30 on 1 January in Lagos, which is the tax year that matters
    if (process.env.TZ === 'Africa/Lagos') {
      expect(todayLocal()).toBe('2027-01-01');
    } else {
      // elsewhere, just insist it matches the local calendar, not UTC
      const d = new Date();
      expect(todayLocal()).toBe(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`
      );
    }
  });

  it('keeps a stored calendar date on its own day', () => {
    expect(localDayOf('2026-08-05')).toBe('2026-08-05');
    expect(parseDay('2026-08-05').getDate()).toBe(5);
    expect(formatDate('2026-08-05', { month: 'short', day: 'numeric' })).toBe('Aug 5');
  });

  it('leaves real timestamps alone', () => {
    const at = '2026-08-05T14:00:00Z';
    expect(parseDay(at).toISOString()).toBe(new Date(at).toISOString());
  });
});
