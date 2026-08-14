/**
 * Just enough JWT to read when an access token dies.
 *
 * We never trust this for anything but scheduling the "stay signed in?" prompt —
 * the server remains the only authority on whether a token is actually valid.
 */

interface JwtPayload {
  exp?: number; // seconds since epoch
  [key: string]: unknown;
}

const decodePayload = (token: string): JwtPayload | null => {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    // base64url -> base64
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

/** Expiry of an access token, in ms since epoch — or null if it can't be read. */
export const getTokenExpiry = (token: string | null | undefined): number | null => {
  if (!token) return null;
  const payload = decodePayload(token);
  return payload?.exp ? payload.exp * 1000 : null;
};
