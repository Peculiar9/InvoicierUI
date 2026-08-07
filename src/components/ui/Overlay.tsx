import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface OverlayProps {
  /** the element the panel should sit under on a wide screen */
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
  className: string;
  align?: 'left' | 'right';
  role?: string;
  ariaLabel?: string;
}

const MOBILE = 720;

/**
 * A panel that escapes its container.
 *
 * `position: fixed` is measured from the nearest ancestor with a transform,
 * not from the viewport — and the page wrapper has one for its entrance
 * animation. So the filter sheets were anchoring to the page and stopping 67px
 * short of the bottom, with the floating nav across their last row.
 *
 * Rendering into `document.body` removes the whole class of bug: no ancestor
 * can trap the panel, whatever gets a transform later. On a wide screen it is
 * positioned against the trigger's own rectangle; on a phone it is a sheet.
 */
export const Overlay = ({
  anchorRef,
  onClose,
  children,
  className,
  align = 'left',
  role = 'dialog',
  ariaLabel,
}: OverlayProps) => {
  const [box, setBox] = useState<{ top: number; left: number; right: number } | null>(null);
  const [isPhone, setIsPhone] = useState(() => window.innerWidth <= MOBILE);

  useLayoutEffect(() => {
    const place = () => {
      setIsPhone(window.innerWidth <= MOBILE);
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      setBox({ top: r.bottom + 8, left: r.left, right: window.innerWidth - r.right });
    };
    place();
    // follow the trigger if the page moves under it
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef]);

  const style: React.CSSProperties = isPhone
    ? {}
    : align === 'right'
      ? { top: box?.top, right: box?.right }
      : { top: box?.top, left: box?.left };

  return createPortal(
    <>
      <button type="button" className="overlay-scrim" aria-label="Close" onClick={onClose} />
      <div className={`${className} is-portal`} role={role} aria-label={ariaLabel} style={style}>
        {children}
      </div>
    </>,
    document.body
  );
};
