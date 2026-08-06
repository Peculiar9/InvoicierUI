import { errorMessage } from '@/lib/apiError';

interface ErrorStateProps {
  /** what we were trying to load, e.g. "Loading your invoices" */
  doing?: string;
  error: unknown;
  onRetry?: () => void;
  /** true while a retry is in flight */
  retrying?: boolean;
}

/**
 * Shown when a list could not load.
 *
 * Deliberately not the empty state: telling someone they have no invoices
 * when the server is merely down is the worst thing this product could say.
 * Their records are the promise, so a failure has to look like a failure.
 */
export const ErrorState = ({ doing, error, onRetry, retrying }: ErrorStateProps) => (
  <div className="empty-state error-state" role="alert">
    <span className="empty-state__icon error-state__icon">
      <i className="bx bx-wifi-off" />
    </span>
    <h3 className="empty-state__title">We could not load this</h3>
    <p className="empty-state__text">{errorMessage(error, doing)}</p>
    <p className="error-state__reassure">
      Nothing has been lost. Your records are safe on our side.
    </p>
    {onRetry && (
      <button
        type="button"
        className="btn btn-primary empty-state__action"
        onClick={onRetry}
        disabled={retrying}
      >
        {retrying ? (
          <>
            <span className="iw-spin" aria-hidden="true" /> Trying again
          </>
        ) : (
          <>
            <i className="bx bx-refresh" /> Try again
          </>
        )}
      </button>
    )}
  </div>
);
