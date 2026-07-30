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

export const rangeIsSet = (range: DateRangeValue) => Boolean(range.from || range.to);

interface DateRangeProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  label?: string;
}

/** From/to pair that matches the pill language of the other filters. */
export const DateRange = ({ value, onChange, label = 'Dates' }: DateRangeProps) => (
  <div className={`iw-daterange${rangeIsSet(value) ? ' is-set' : ''}`}>
    <span className="iw-daterange-label">{label}</span>
    <input
      type="date"
      aria-label={`${label} from`}
      value={value.from}
      max={value.to || undefined}
      onChange={(e) => onChange({ ...value, from: e.target.value })}
    />
    <i className="bx bx-minus" aria-hidden="true" />
    <input
      type="date"
      aria-label={`${label} to`}
      value={value.to}
      min={value.from || undefined}
      onChange={(e) => onChange({ ...value, to: e.target.value })}
    />
    {rangeIsSet(value) && (
      <button
        type="button"
        className="iw-daterange-clear"
        aria-label={`Clear ${label.toLowerCase()} filter`}
        onClick={() => onChange(EMPTY_RANGE)}
      >
        <i className="bx bx-x" />
      </button>
    )}
  </div>
);
