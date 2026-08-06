/**
 * Calendar days, in the day the person is actually living in.
 *
 * `new Date().toISOString().slice(0, 10)` is UTC. In Lagos that means a
 * payment recorded at 00:30 is filed as yesterday, and on 1 January it is
 * filed in the wrong tax year. `date_received` is the field this whole
 * product is built to get right, so it never touches UTC.
 */

/** Today, as the calendar on the wall has it. */
export const todayLocal = (): string => toLocalDay(new Date());

/** A Date, as a YYYY-MM-DD in local time rather than UTC. */
export const toLocalDay = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Parse a stored date for display.
 *
 * A date-only string ("2026-08-05") is parsed by the platform as UTC
 * midnight, which renders as the day before for anyone west of Greenwich.
 * Read it as a plain calendar date instead: the 5th is the 5th everywhere.
 * Full timestamps keep their instant, since those really are moments in time.
 */
export const parseDay = (value: string | Date): Date => {
  if (value instanceof Date) return value;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(value);
  if (dateOnly) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
};

/** The local calendar day of any stored value, for grouping and filtering. */
export const localDayOf = (value: string | Date): string => toLocalDay(parseDay(value));
