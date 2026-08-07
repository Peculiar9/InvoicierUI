import { toLocalDay } from '@/utils/day';
import type { DateRangeValue } from '@/utils/dateRange';

/**
 * The ranges people actually ask for.
 *
 * Every one is built from the local calendar, never from UTC: "this month" in
 * Lagos at 00:30 on the 1st is this month, not last.
 */
export interface RangePreset {
  key: string;
  label: string;
  /** the shorter word, for a phone */
  short: string;
  build: () => DateRangeValue;
}

const shift = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeek = (date: Date): Date => {
  const next = new Date(date);
  // Monday, because a business week does not start on Sunday
  const day = (next.getDay() + 6) % 7;
  return shift(next, -day);
};

export const RANGE_PRESETS: RangePreset[] = [
  {
    key: 'today',
    label: 'Today',
    short: 'Today',
    build: () => {
      const day = toLocalDay(new Date());
      return { from: day, to: day };
    },
  },
  {
    key: 'week',
    label: 'This week',
    short: 'Week',
    build: () => ({
      from: toLocalDay(startOfWeek(new Date())),
      to: toLocalDay(new Date()),
    }),
  },
  {
    key: 'month',
    label: 'This month',
    short: 'Month',
    build: () => {
      const now = new Date();
      return {
        from: toLocalDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toLocalDay(now),
      };
    },
  },
  {
    key: 'last30',
    label: 'Last 30 days',
    short: '30 days',
    build: () => ({ from: toLocalDay(shift(new Date(), -29)), to: toLocalDay(new Date()) }),
  },
  {
    key: 'quarter',
    label: 'This quarter',
    short: 'Quarter',
    build: () => {
      const now = new Date();
      const firstMonth = Math.floor(now.getMonth() / 3) * 3;
      return {
        from: toLocalDay(new Date(now.getFullYear(), firstMonth, 1)),
        to: toLocalDay(now),
      };
    },
  },
  {
    key: 'year',
    label: 'This year',
    short: 'Year',
    build: () => {
      const now = new Date();
      return { from: toLocalDay(new Date(now.getFullYear(), 0, 1)), to: toLocalDay(now) };
    },
  },
];

/** Which preset a range matches, so reopening the picker knows where it is. */
export const matchPreset = (range: DateRangeValue): RangePreset | null =>
  RANGE_PRESETS.find((preset) => {
    const built = preset.build();
    return built.from === range.from && built.to === range.to;
  }) ?? null;

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "Aug 3" or "Aug 3, 2025" when it is not this year. */
export const prettyDay = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const label = `${MONTHS_SHORT[m - 1]} ${d}`;
  return y === new Date().getFullYear() ? label : `${label}, ${y}`;
};

/**
 * What the trigger says.
 *
 * A named period beats two dates: "This month" is instantly legible where
 * "Aug 1 – Aug 31" makes you do the arithmetic yourself.
 */
export const describeRange = (range: DateRangeValue, empty = 'Any time'): string => {
  if (!range.from && !range.to) return empty;
  const preset = matchPreset(range);
  if (preset) return preset.label;
  if (range.from && !range.to) return `From ${prettyDay(range.from)}`;
  if (!range.from && range.to) return `Until ${prettyDay(range.to)}`;
  if (range.from === range.to) return prettyDay(range.from);
  return `${prettyDay(range.from)} – ${prettyDay(range.to)}`;
};

/** The days of a month, padded to whole weeks starting Monday. */
export const monthGrid = (year: number, month: number): (string | null)[] => {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d += 1) cells.push(toLocalDay(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};
