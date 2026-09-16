import { useEffect, useState } from 'react';
import { LegacyWorkspace } from '@/components/static';
import { adminApi, type FxRateRow } from '@/api/admin';
import { toast } from '@/lib/toast';
import { formatDate } from '@/utils/format';

const CURRENCIES = ['NGN', 'USD', 'EUR', 'GBP'] as const;

const fmtRate = (n: number | null | undefined): string =>
  n == null ? '–' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(n);

/**
 * Operator page for the exchange rates behind every cross-currency payment.
 * Each pair has two numbers: what the free market feed last said (used while
 * it is fresh) and the fallback an operator stands behind when the feed is
 * quiet. A pair appears here the first time the feed answers for it, so the
 * list fills itself; an operator can also add one ahead of time.
 */
export const AdminFxRates = () => {
  const [authz, setAuthz] = useState<'checking' | 'ok' | 'denied'>('checking');
  const [rows, setRows] = useState<FxRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [add, setAdd] = useState({ base: 'USD', quote: 'NGN', rate: '' });

  const keyOf = (r: { base_currency: string; quote_currency: string }) =>
    `${r.base_currency}/${r.quote_currency}`;

  const load = async () => {
    try {
      const list = await adminApi.listFxRates();
      setRows(list);
    } finally {
      setLoading(false);
    }
  };

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
      await load();
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async (row: FxRateRow, patch: { fallback_rate?: number; provider_enabled?: boolean }) => {
    const key = keyOf(row);
    setBusy(key);
    try {
      const saved = await adminApi.upsertFxRate({
        base_currency: row.base_currency,
        quote_currency: row.quote_currency,
        fallback_rate: patch.fallback_rate ?? row.fallback_rate,
        provider_enabled: patch.provider_enabled ?? row.provider_enabled,
      });
      setRows((prev) => prev.map((r) => (keyOf(r) === key ? saved : r)));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success(`${key} saved`);
    } catch {
      toast.error(`Could not save ${key}`);
    } finally {
      setBusy(null);
    }
  };

  const addPair = async () => {
    const rate = Number(add.rate);
    if (add.base === add.quote) {
      toast.error('A currency does not need a rate against itself');
      return;
    }
    if (!(rate > 0)) {
      toast.error('Enter the rate as a number above zero');
      return;
    }
    setBusy('add');
    try {
      const saved = await adminApi.upsertFxRate({
        base_currency: add.base,
        quote_currency: add.quote,
        fallback_rate: rate,
        provider_enabled: true,
      });
      setRows((prev) => {
        const rest = prev.filter((r) => keyOf(r) !== keyOf(saved));
        return [...rest, saved].sort((a, b) => keyOf(a).localeCompare(keyOf(b)));
      });
      setAdd({ base: 'USD', quote: 'NGN', rate: '' });
      toast.success(`${keyOf(saved)} added`);
    } catch {
      toast.error('Could not add that pair');
    } finally {
      setBusy(null);
    }
  };

  if (authz === 'denied') {
    return (
      <LegacyWorkspace active="settings" title="Exchange rates">
        <div className="view view--narrow">
          <div className="admin-denied">
            <i className="bx bx-lock-alt" aria-hidden="true" />
            <h2>Admins only</h2>
            <p>This area sets the rates behind cross-currency payments. Ask an administrator if you need access.</p>
          </div>
        </div>
      </LegacyWorkspace>
    );
  }

  return (
    <LegacyWorkspace active="settings" title="Exchange rates">
      <div className="view view--narrow">
        <header className="admin-head">
          <div>
            <h1>Exchange rates</h1>
            <p>
              What a payer is shown when they settle an invoice in another currency. The live
              feed leads while it is fresh; your fallback takes over the moment it goes quiet.
            </p>
          </div>
          {authz === 'ok' && !loading && (
            <span className="admin-count">
              {rows.filter((r) => r.effective_source === 'provider').length} of {rows.length} on the live feed
            </span>
          )}
        </header>

        {loading ? (
          <div className="fs-loading">
            <span className="iw-spin" aria-hidden="true" /> Loading rates…
          </div>
        ) : (
          <ul className="fx-list">
            {rows.map((r) => {
              const key = keyOf(r);
              const draft = drafts[key];
              const dirty = draft != null && Number(draft) !== r.fallback_rate;
              return (
                <li key={key} className="fx-row">
                  <div className="fx-pair">
                    <b>1 {r.base_currency}</b>
                    <span className="fx-pair-eq">=</span>
                    <b>
                      {fmtRate(r.effective_rate)} {r.quote_currency}
                    </b>
                    <span className={`fx-source ${r.effective_source === 'provider' ? 'is-live' : 'is-set'}`}>
                      {r.effective_source === 'provider' ? 'live feed' : 'your fallback'}
                    </span>
                  </div>
                  <div className="fx-feed">
                    {r.last_provider_rate != null && r.last_provider_at ? (
                      <>
                        Feed last said {fmtRate(r.last_provider_rate)} on{' '}
                        {formatDate(r.last_provider_at, { month: 'short', day: 'numeric' })}
                        {r.provider_fresh ? '' : ' (stale)'}
                      </>
                    ) : (
                      'The feed has not answered for this pair yet'
                    )}
                  </div>
                  <div className="fx-edit">
                    <label className="fx-field">
                      <span>Fallback rate</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="any"
                        value={draft ?? String(r.fallback_rate)}
                        onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                      />
                    </label>
                    <button
                      type="button"
                      className="iw-btn"
                      disabled={!dirty || busy === key || !(Number(draft) > 0)}
                      onClick={() => save(r, { fallback_rate: Number(draft) })}
                    >
                      {busy === key ? <span className="iw-spin" aria-hidden="true" /> : 'Save'}
                    </button>
                    <label className="fx-toggle">
                      <input
                        type="checkbox"
                        checked={r.provider_enabled}
                        disabled={busy === key}
                        onChange={(e) => save(r, { provider_enabled: e.target.checked })}
                      />
                      <span>Use the live feed</span>
                    </label>
                  </div>
                </li>
              );
            })}
            {rows.length === 0 && (
              <li className="fs-empty">
                No pairs yet. One appears the first time a payer needs a rate; you can also add one below.
              </li>
            )}
          </ul>
        )}

        <div className="dash-card fx-add">
          <h3 className="cinv-section-title">Add a pair</h3>
          <p className="dash-muted settings-lead">
            Set a fallback ahead of time. The live feed still leads once it answers.
          </p>
          <div className="fx-add-row">
            <label className="fx-field">
              <span>1 of</span>
              <select value={add.base} onChange={(e) => setAdd((a) => ({ ...a, base: e.target.value }))}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="fx-field">
              <span>equals</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="1526.50"
                value={add.rate}
                onChange={(e) => setAdd((a) => ({ ...a, rate: e.target.value }))}
              />
            </label>
            <label className="fx-field">
              <span>in</span>
              <select value={add.quote} onChange={(e) => setAdd((a) => ({ ...a, quote: e.target.value }))}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <button type="button" className="iw-btn" disabled={busy === 'add'} onClick={addPair}>
              {busy === 'add' ? <span className="iw-spin" aria-hidden="true" /> : 'Add pair'}
            </button>
          </div>
        </div>
      </div>
    </LegacyWorkspace>
  );
};
