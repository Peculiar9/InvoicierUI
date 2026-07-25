import type { CSSProperties } from 'react';
import type { InvoiceTemplate } from '@/stores/settingsStore';

export const TEMPLATES: { key: InvoiceTemplate; name: string; line: string }[] = [
  { key: 'classic', name: 'The Classic', line: 'Clean, quiet, gets paid.' },
  { key: 'ledger', name: 'The Ledger', line: 'Mono numbers, ruled lines.' },
  { key: 'bold', name: 'The Bold', line: 'Your color does the talking.' },
];

interface Brand {
  name: string;
  color: string;
  logo?: string;
}

interface TemplatePickerProps {
  value: InvoiceTemplate;
  onChange: (template: InvoiceTemplate) => void;
  brand: Brand;
  compact?: boolean;
}

/**
 * Three papers, previewed with the user's own brand so what they pick is
 * exactly what their client will open.
 */
export const TemplatePicker = ({ value, onChange, brand, compact }: TemplatePickerProps) => {
  const monogram = (brand.name.charAt(0) || 'i').toUpperCase();

  return (
    <div
      className={`tpk${compact ? ' tpk--compact' : ''}`}
      style={{ '--acc': brand.color } as CSSProperties}
      role="radiogroup"
      aria-label="Invoice template"
    >
      {TEMPLATES.map((tpl) => (
        <button
          key={tpl.key}
          type="button"
          role="radio"
          aria-checked={value === tpl.key}
          className={`tpk-card${value === tpl.key ? ' active' : ''}`}
          onClick={() => onChange(tpl.key)}
        >
          <span className={`tpk-prev tpk-prev--${tpl.key}`} aria-hidden="true">
            <span className="tpk-head">
              {brand.logo ? (
                <img src={brand.logo} alt="" />
              ) : (
                <i className="tpk-mono">{monogram}</i>
              )}
              <span className="tpk-title">
                <b>{brand.name || 'Your name'}</b>
                <small>INVOICE · 001</small>
              </span>
            </span>
            <span className="tpk-rule" />
            <span className="tpk-line" style={{ width: '84%' }} />
            <span className="tpk-line" style={{ width: '62%' }} />
            <span className="tpk-total">
              <small>Total</small>
              <b>₦3,816,250</b>
            </span>
          </span>
          <span className="tpk-meta">
            <b>{tpl.name}</b>
            <small>{tpl.line}</small>
          </span>
          {value === tpl.key && <i className="bx bx-check tpk-check" aria-hidden="true" />}
        </button>
      ))}
    </div>
  );
};
