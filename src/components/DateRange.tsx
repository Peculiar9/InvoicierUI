import { rangeIsSet } from '@/utils/dateRange';
import type { DateRangeValue } from '@/utils/dateRange';

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
        onClick={() => onChange({ from: '', to: '' })}
      >
        <i className="bx bx-x" />
      </button>
    )}
  </div>
);
