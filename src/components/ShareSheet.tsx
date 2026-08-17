import { useEffect } from 'react';
import { useShareSheetStore } from '@/stores/shareSheetStore';

/**
 * "Copied. Now send it where they'll see it."
 *
 * Pops the moment a payment link is copied, the way a downloaded video offers
 * its own share sheet. WhatsApp and Telegram open directly with the message
 * already written; "More" hands over to the phone's native share sheet, which
 * carries Snapchat, TikTok, SMS and whatever else is installed. Suggestive,
 * never blocking: the link is already on the clipboard either way.
 */
export const ShareSheet = () => {
  const payload = useShareSheetStore((s) => s.payload);
  const close = useShareSheetStore((s) => s.close);

  useEffect(() => {
    if (!payload) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [payload, close]);

  if (!payload) return null;

  const text = encodeURIComponent(payload.message);
  const textOnly = encodeURIComponent(payload.message.replace(payload.link, '').trim());
  const url = encodeURIComponent(payload.link);
  const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const openTarget = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
    close();
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ text: payload.message });
      close();
    } catch {
      // the person closed the native sheet; ours stays for another pick
    }
  };

  const targets = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: 'bxl-whatsapp',
      className: 'is-whatsapp',
      go: () => openTarget(`https://wa.me/?text=${text}`),
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: 'bxl-telegram',
      className: 'is-telegram',
      go: () => openTarget(`https://t.me/share/url?url=${url}&text=${textOnly}`),
    },
    {
      key: 'x',
      label: 'X',
      icon: 'bxl-twitter',
      className: 'is-x',
      go: () => openTarget(`https://twitter.com/intent/tweet?text=${text}`),
    },
    {
      key: 'email',
      label: 'Email',
      icon: 'bx-envelope',
      className: 'is-email',
      go: () =>
        openTarget(
          `mailto:?subject=${encodeURIComponent(
            payload.number ? `Invoice ${payload.number}` : 'Your invoice'
          )}&body=${text}`
        ),
    },
    ...(canNative
      ? [
          {
            key: 'more',
            label: 'More',
            icon: 'bx-dots-horizontal-rounded',
            className: 'is-more',
            go: () => void nativeShare(),
          },
        ]
      : []),
  ];

  return (
    <div className="share-scrim" onClick={close} role="presentation">
      <div
        className="share-sheet"
        role="dialog"
        aria-label="Send the payment link"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="share-grab" aria-hidden="true" />
        <div className="share-head">
          <span className="share-check" aria-hidden="true">
            <i className="bx bx-check" />
          </span>
          <div>
            <b>Link copied{payload.number ? ` for ${payload.number}` : ''}</b>
            <small>Send it where they&rsquo;ll actually see it</small>
          </div>
        </div>

        <div className="share-targets">
          {targets.map((t) => (
            <button key={t.key} type="button" className="share-target" onClick={t.go}>
              <span className={`share-target-badge ${t.className}`} aria-hidden="true">
                <i className={`bx ${t.icon}`} />
              </span>
              {t.label}
            </button>
          ))}
        </div>

        <button type="button" className="share-done" onClick={close}>
          Done
        </button>
      </div>
    </div>
  );
};
