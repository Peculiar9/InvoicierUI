import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'form';
}

export const Modal = ({ open, onClose, title, children, footer, size = 'md' }: ModalProps) => {
  if (!open) return null;

  return (
    <div
      className="ui-modal-overlay"
      role="presentation"
      onPointerDown={(event) => {
        // only a tap on the backdrop itself dismisses; taps inside the dialog
        // bubble here too, but their target is the content, not the overlay.
        // pointerdown (not click) so iOS Safari actually fires it on a plain div.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`ui-modal ui-modal--${size}`} role="dialog" aria-modal="true">
        <header className="ui-modal-head">
          <h3>{title}</h3>
          <button type="button" className="ui-modal-close" onClick={onClose} aria-label="Close">
            <i className="bx bx-x" />
          </button>
        </header>
        <div className="ui-modal-body">{children}</div>
        {footer && <footer className="ui-modal-foot">{footer}</footer>}
      </div>
    </div>
  );
};
