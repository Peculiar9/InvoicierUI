import { AxiosError } from 'axios';

/**
 * What went wrong, in a sentence someone can act on.
 *
 * Every message names the thing that failed and what to do next. Nothing here
 * says "an error occurred": if we cannot tell the user something useful, we at
 * least tell them honestly that the problem is on our side, not theirs.
 */
export const errorMessage = (error: unknown, doing?: string): string => {
  const what = doing ? `${doing} failed` : 'That did not go through';

  if (error instanceof AxiosError) {
    // the request never reached anyone
    if (error.code === 'ECONNABORTED') {
      return `${what}: the server took too long. Check your connection and try again.`;
    }
    if (!error.response) {
      return navigator.onLine
        ? `${what}: we could not reach Invoicier. Try again in a moment.`
        : `${what}: you are offline. We will not lose anything, try again once you are back.`;
    }

    // the server had something to say, and it is usually the best thing to say
    const fromServer = (error.response.data as { message?: string } | undefined)?.message;
    const status = error.response.status;
    if (fromServer && status < 500) return `${what}: ${fromServer}`;

    switch (status) {
      case 400:
      case 422:
        return `${what}: some of the details were not accepted. Check the form and try again.`;
      case 401:
        return 'Your session has expired. Sign in again to continue.';
      case 403:
        return `${what}: you do not have permission to do that.`;
      case 404:
        return `${what}: that record no longer exists. Refresh and try again.`;
      case 409:
        return `${what}: someone changed this record while you were working. Refresh to see the latest.`;
      case 429:
        return `${what}: too many requests in a row. Wait a moment and try again.`;
      default:
        return status >= 500
          ? `${what}: the problem is on our side, not yours. Nothing was charged or sent. Try again shortly.`
          : `${what}: ${fromServer ?? 'please try again.'}`;
    }
  }

  if (error instanceof Error && error.message) return `${what}: ${error.message}`;
  return `${what}. Try again, and tell us if it keeps happening.`;
};

/** True when the failure means the session is gone, not that the action was bad. */
export const isAuthError = (error: unknown): boolean =>
  error instanceof AxiosError && error.response?.status === 401;
