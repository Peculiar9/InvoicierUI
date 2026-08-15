/**
 * Money crosses the wire as minor-unit integers (kobo/cents); the React app
 * works in major units (naira/dollars) end to end. Convert only at the api
 * boundary: `toMinor` on the way out, `toMajor` on the way in.
 */

/** Minor units per major unit. Every currency v1 supports is 100. */
export const CURRENCY_SCALE: Record<string, number> = {
  NGN: 100,
  USD: 100,
  EUR: 100,
  GBP: 100,
};

const scaleFor = (currency?: string | null): number =>
  CURRENCY_SCALE[(currency ?? '').toUpperCase()] ?? 100;

/** Major units (₦1,000.50) -> minor integer (100050) for writes. */
export const toMinor = (major: number, currency?: string | null): number =>
  Math.round((Number(major) || 0) * scaleFor(currency));

/** Minor integer from the backend (100050) -> major units (1000.5) for reads. */
export const toMajor = (minor: number, currency?: string | null): number =>
  (Number(minor) || 0) / scaleFor(currency);
