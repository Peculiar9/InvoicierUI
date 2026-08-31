import { useEffect, useMemo, useRef, useState } from 'react';
import { LegacyWorkspace } from '@/components/static';
import { BankMark } from '@/components/ui/BankPicker';
import { settingsApi, type Bank } from '@/api/settings';
import { adminApi } from '@/api/admin';
import { toast } from '@/lib/toast';

/**
 * Operator page for the bank logos everyone sees in the picker. Paystack ships
 * no artwork, so an admin supplies one image per bank here; a bank without one
 * keeps its monogram. Admin is a role on an ordinary account, so the page gates
 * itself on a probe rather than a separate login.
 */
export const AdminBankLogos = () => {
  const [authz, setAuthz] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await adminApi.isAdmin();
      if (!alive) return;
      setAuthz(ok ? 'ok' : 'denied');
      if (!ok) {
        setLoading(false);
        return;
      }
      try {
        const list = await settingsApi.listBanks();
        if (alive) setBanks(list);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return banks;
    return banks.filter(
      (b) => b.name.toLowerCase().includes(needle) || b.code.includes(needle)
    );
  }, [banks, q]);

  const withLogos = useMemo(() => banks.filter((b) => b.logo).length, [banks]);

  const onPick = async (code: string, file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('That file is not an image');
      return;
    }
    setBusyCode(code);
    try {
      const saved = await adminApi.uploadBankLogo(code, file);
      // the object is overwritten at the same URL, so bust the cache to see it
      const fresh = `${saved.logo_url}${saved.logo_url.includes('?') ? '&' : '?'}v=${Date.now()}`;
      setBanks((prev) => prev.map((b) => (b.code === code ? { ...b, logo: fresh } : b)));
      toast.success('Logo saved');
    } catch {
      toast.error('Could not save that logo');
    } finally {
      setBusyCode(null);
    }
  };

  if (authz === 'denied') {
    return (
      <LegacyWorkspace active="settings" title="Bank logos">
        <div className="view view--narrow">
          <div className="admin-denied">
            <i className="bx bx-lock-alt" aria-hidden="true" />
            <h2>Admins only</h2>
            <p>
              This area manages the bank logos everyone sees. Ask an administrator if you
              need access.
            </p>
          </div>
        </div>
      </LegacyWorkspace>
    );
  }

  return (
    <LegacyWorkspace active="settings" title="Bank logos">
      <div className="view view--narrow">
        <header className="admin-head">
          <div>
            <h1>Bank logos</h1>
            <p>The mark each bank wears in the picker. A bank without one shows a monogram.</p>
          </div>
          {authz === 'ok' && !loading && (
            <span className="admin-count">
              {withLogos} of {banks.length} have a logo
            </span>
          )}
        </header>

        <label className="admin-search">
          <i className="bx bx-search" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search a bank by name or code"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search banks"
          />
        </label>

        {loading ? (
          <div className="fs-loading">
            <span className="iw-spin" aria-hidden="true" /> Loading banks…
          </div>
        ) : (
          <ul className="banklogo-list">
            {filtered.map((b) => (
              <li key={b.code} className="banklogo-row">
                <BankMark name={b.name} logo={b.logo} />
                <div className="banklogo-meta">
                  <span className="banklogo-name">{b.name}</span>
                  <span className="banklogo-code">
                    {b.code}
                    {b.logo ? ' · has a logo' : ''}
                  </span>
                </div>
                <input
                  ref={(el) => {
                    fileInputs.current[b.code] = el;
                  }}
                  type="file"
                  accept="image/png,image/jpeg"
                  hidden
                  onChange={(e) => {
                    onPick(b.code, e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  className="iw-btn iw-btn--ghost banklogo-btn"
                  disabled={busyCode === b.code}
                  onClick={() => fileInputs.current[b.code]?.click()}
                >
                  {busyCode === b.code ? (
                    <>
                      <span className="iw-spin" aria-hidden="true" /> Saving…
                    </>
                  ) : b.logo ? (
                    'Replace'
                  ) : (
                    'Upload'
                  )}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="fs-empty">No bank matches “{q.trim()}”.</li>
            )}
          </ul>
        )}
      </div>
    </LegacyWorkspace>
  );
};
