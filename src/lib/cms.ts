/**
 * The marketing site's read path into Strapi.
 *
 * Every call falls back to the copy shipped in the bundle. The site must
 * render perfectly with the CMS unreachable, empty, or not running at all,
 * so nothing here ever throws into the UI: a failed fetch simply means
 * "use what we shipped".
 */

const CMS_URL = (import.meta.env.VITE_CMS_URL ?? 'http://localhost:1337').replace(/\/$/, '');

export interface SiteSettings {
  heroHeadline?: string;
  heroSubline?: string;
  waitlistHeadline?: string;
  waitlistSubline?: string;
  announcement?: string;
  waitlistOpen?: boolean;
}

export interface CmsFaq {
  question: string;
  answer: string;
}

export interface CmsTestimonial {
  quote: string;
  name: string;
  role?: string;
  initials?: string;
}

/** Strapi 5 returns { data, meta }; single types return the object directly. */
async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${CMS_URL}/api/${path}`, {
      headers: { Accept: 'application/json' },
      // never let a slow CMS hold up the page
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: T };
    return body?.data ?? null;
  } catch {
    return null;
  }
}

export const cms = {
  /** Hero and waitlist copy. Null means "use the built-in words". */
  siteSettings: () => get<SiteSettings>('site-setting'),

  faqs: (page = 'landing') =>
    get<CmsFaq[]>(`faqs?sort=order:asc&filters[page][$eq]=${page}`),

  testimonials: () => get<CmsTestimonial[]>('testimonials?sort=order:asc'),

  /**
   * Join the waitlist. Returns true when the CMS accepted the entry; the
   * caller still stores locally so the demo works without a CMS running.
   */
  async joinWaitlist(email: string, source = 'landing'): Promise<boolean> {
    try {
      const res = await fetch(`${CMS_URL}/api/waitlist-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { email, source } }),
        signal: AbortSignal.timeout(6000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};
