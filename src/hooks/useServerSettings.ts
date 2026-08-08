import { useEffect, useRef } from 'react';
import { settingsApi } from '@/api/settings';
import { businessProfileApi } from '@/api/businessProfile';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useServicesStore } from '@/stores/servicesStore';

/**
 * The server is the source of truth for payment configuration; the zustand
 * stores are its local mirror — kept because every document and panel
 * already reads them synchronously.
 *
 * On workspace mount (per session), pull the business profile, the receiving
 * accounts and the services from the API and overwrite the mirror. Fields
 * the server does not own (brandColor, persona) survive the merge.
 */
export const useServerSettings = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setProfile = useSettingsStore((s) => s.setProfile);
  const replaceServices = useServicesStore((s) => s.replaceAll);
  const pulled = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || pulled.current) return;
    pulled.current = true;

    void (async () => {
      try {
        const [profile, accounts, services] = await Promise.all([
          businessProfileApi.get().catch(() => null),
          settingsApi.listAccounts().catch(() => null),
          settingsApi.listServices().catch(() => null),
        ]);
        if (profile) {
          setProfile({
            name: profile.business_name ?? undefined,
            email: profile.email ?? undefined,
            phone: profile.phone ?? undefined,
            address: profile.address ?? undefined,
            currency: profile.default_currency ?? undefined,
            template: (profile.invoice_template as never) ?? undefined,
            logo: profile.logo_url ?? undefined,
            routeByCurrency: (profile.route_by_currency as never) ?? undefined,
            defaultAccountByCurrency:
              (profile.default_account_by_currency as never) ?? undefined,
          });
        }
        if (accounts) setProfile({ receivingAccounts: accounts });
        if (services) {
          replaceServices(
            services.map((row) => ({
              id: row.id,
              name: row.name,
              description: row.description ?? '',
              price: row.unit_price,
              unit: row.unit ?? 'project',
            }))
          );
        }
      } catch {
        // offline or mock mode: the mirror simply keeps its last reflection
      }
    })();
  }, [isAuthenticated, setProfile, replaceServices]);
};
