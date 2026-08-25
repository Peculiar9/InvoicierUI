import posthog from 'posthog-js';

/**
 * Product analytics, PostHog, behind one door.
 *
 * It only ever runs when VITE_PUBLIC_POSTHOG_KEY is set, so a build without the
 * key — a preview, a fork, a deploy that simply forgot it — sends nothing and
 * throws nothing. Every helper is a no-op until init() has actually connected.
 *
 * This is a money app, so the defaults lean private: no session recording, and
 * autocapture records which elements people touch, never what they type into a
 * field. Identify runs on sign-in so a funnel can follow a real person; reset
 * runs on sign-out so the next person on the device is not mistaken for them.
 */
const KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) ??
  'https://us.i.posthog.com';

let ready = false;

export function initAnalytics(): void {
  if (ready || !KEY) return;
  posthog.init(KEY, {
    api_host: HOST,
    // we capture SPA pageviews ourselves on route change; the automatic one
    // fires only on hard loads and would miss every in-app navigation
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    persistence: 'localStorage+cookie',
    // a financial product does not screen-record its users
    disable_session_recording: true,
    // keep the network quiet in development
    loaded: (ph) => {
      if (import.meta.env.DEV) ph.opt_out_capturing();
    },
  });
  ready = true;
}

export const analytics = {
  /** a named product event, e.g. analytics.capture('invoice_sent', { currency }) */
  capture(event: string, props?: Record<string, unknown>): void {
    if (ready) posthog.capture(event, props);
  },

  /** an in-app navigation; call on every resolved route */
  pageview(path: string): void {
    if (ready) {
      posthog.capture('$pageview', {
        $current_url: window.location.origin + path,
        path,
      });
    }
  },

  /** tie the anonymous person to a real account after sign-in */
  identify(id: string, props?: Record<string, unknown>): void {
    if (ready && id) posthog.identify(id, props);
  },

  /** forget the person on sign-out so the device is anonymous again */
  reset(): void {
    if (ready) posthog.reset();
  },
};
