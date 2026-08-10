/**
 * A quiet, immovable "STAGING" pill so an open tab can never be mistaken
 * for production. Renders only when VITE_ENVIRONMENT=staging — production
 * and local builds show nothing.
 */
export const StagingBadge = () => {
  if (import.meta.env.VITE_ENVIRONMENT !== 'staging') return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 9999,
        padding: '5px 12px',
        borderRadius: 999,
        background: 'rgba(29, 27, 46, 0.92)',
        border: '1px solid rgba(245, 158, 11, 0.55)',
        color: '#f59e0b',
        font: '700 10px/1 system-ui, sans-serif',
        letterSpacing: '0.18em',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      STAGING
    </div>
  );
};
