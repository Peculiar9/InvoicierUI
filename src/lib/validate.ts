export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isFilled = (value: string) => value.trim().length > 0;

/** Strip everything that isn't a digit. */
export const digitsOnly = (value: string) => value.replace(/\D/g, '');

/** A bank account number: 6–20 digits (ignoring spaces / dashes). */
export const isAccountNumber = (value: string) => /^\d{6,20}$/.test(digitsOnly(value));

/** A finite number strictly greater than zero. */
export const isPositiveAmount = (value: number) => Number.isFinite(value) && value > 0;

/** A finite number that is zero or greater. */
export const isNonNegativeNumber = (value: number) => Number.isFinite(value) && value >= 0;

/** Optional phone: empty is allowed, otherwise 7+ digits with common separators. */
export const isPhone = (value: string) => {
  const v = value.trim();
  return v.length === 0 || /^\+?[\d\s()-]{7,}$/.test(v);
};
