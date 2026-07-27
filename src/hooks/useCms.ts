import { useEffect, useState } from 'react';
import { cms } from '@/lib/cms';
import type { CmsFaq, CmsTestimonial, SiteSettings } from '@/lib/cms';

/**
 * CMS content with the shipped copy as the floor. Components render the
 * fallback immediately and quietly upgrade if the CMS answers, so there is
 * never a loading flash on marketing pages.
 */
function useCmsValue<T>(load: () => Promise<T | null>, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    let alive = true;
    load().then((incoming) => {
      if (!alive || !incoming) return;
      if (Array.isArray(incoming) && incoming.length === 0) return;
      setValue(incoming);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

export const useSiteSettings = (fallback: SiteSettings) =>
  useCmsValue(() => cms.siteSettings(), fallback);

export const useCmsFaqs = (fallback: CmsFaq[], page = 'landing') =>
  useCmsValue(() => cms.faqs(page), fallback);

export const useCmsTestimonials = (fallback: CmsTestimonial[]) =>
  useCmsValue(() => cms.testimonials(), fallback);
