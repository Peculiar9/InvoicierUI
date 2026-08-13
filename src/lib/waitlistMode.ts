/**
 * One switch for the pre-launch posture.
 *
 * While `VITE_WAITLIST_MODE=true` the marketing site sells a place in line:
 * waitlist ribbons, "join the waitlist" buttons, no login. Flip it to false
 * and every one of those becomes the real invitation — sign up — with the
 * waitlist-only ornaments (the hero ribbon, the closing waitlist CTAs)
 * disappearing entirely rather than pointing at a list nobody is on.
 *
 * Lives here, not in Landing.tsx, so pages that are not the landing page
 * (How it works, Login) read the same truth instead of hardcoding one.
 */
export const WAITLIST_MODE = import.meta.env.VITE_WAITLIST_MODE === 'true';

/** Where a "get started" action should point, given the posture. */
export const primaryCtaHref = WAITLIST_MODE ? '/#waitlist' : '/welcome';
