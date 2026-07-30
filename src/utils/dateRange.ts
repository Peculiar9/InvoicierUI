export interface DateRangeValue {
  from: string;
  to: string;
}

export const EMPTY_RANGE: DateRangeValue = { from: '', to: '' };

/**
 * Inclusive on both ends. ISO dates compare correctly as strings, which keeps
 * this free of timezone drift: a date picked as the 3rd stays the 3rd.
 */
export const inDateRange = (iso: string | undefined, range: DateRangeValue): boolean => {
  if (!range.from && !range.to) return true;
  if (!iso) return false;
  const day = iso.slice(0, 10);
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
};

export const rangeIsSet = (range: DateRangeValue): boolean =>
  Boolean(range.from || range.to);
