import { useState, useEffect } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { Segmented } from '@/components/ui/Segmented';
import { LegacyWorkspace } from '@/components/static';
import { Modal } from '@/components/Modal';
import { FieldSelect } from '@/components/ui/FieldSelect';
import { BankPicker } from '@/components/ui/BankPicker';
import { TemplatePicker } from '@/components/TemplatePicker';
import { PasswordCard } from '@/components/settings/PasswordCard';
import { useInvoices } from '@/hooks';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePayoutStore } from '@/stores/payoutStore';
import type { PayoutSchedule, PayoutType, PayoutMethod } from '@/stores/payoutStore';
import { PROVIDER_LABELS } from '@/utils/paymentRoutes';
import type { AccountProvider, PaymentRoute, ReceivingAccount } from '@/types';
import { isPaid } from '@/utils/invoiceStatus';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  isEmail,
  isFilled,
  isPhone,
  isAccountNumber,
  isPositiveAmount,
  digitsOnly,
} from '@/lib/validate';
import { toast } from '@/lib/toast';
import { settingsApi, type Bank } from '@/api/settings';
import { accountFieldsFor, ACCOUNT_FIELD_KEYS } from '@/utils/paymentRoutes';

interface MethodForm {
  type: PayoutType;
  label: string;
  bank_name: string;
  bank_code: string;
  account_name: string;
  account_number: string;
  email: string;
}

const emptyAccount: ReceivingAccount = {
  id: '',
  label: '',
  provider: 'grey',
  currency: 'USD',
  account_name: '',
  account_number: '',
  bank_name: '',
  routing_number: '',
  swift: '',
  iban: '',
  wallet_address: '',
  network: '',
  asset: '',
  instructions: '',
};

/**
 * Changing the provider or the currency changes what the account IS. The
 * fields the new shape does not have leave with the old one, so a crypto
 * wallet never quietly carries the bank name typed a moment earlier.
 */
const reshapeAccount = (
  form: ReceivingAccount,
  next: { provider?: AccountProvider; currency?: string }
): ReceivingAccount => {
  const provider = next.provider ?? form.provider;
  const currency = next.currency ?? form.currency;
  const keep = new Set(accountFieldsFor(provider, currency).map((f) => f.key));
  const cleared = Object.fromEntries(
    ACCOUNT_FIELD_KEYS.filter((k) => !keep.has(k)).map((k) => [k, ''])
  );
  return { ...form, ...cleared, provider, currency };
};

const ROUTE_CHOICES: { key: PaymentRoute; label: string; hint: string }[] = [
  { key: 'instant', label: 'Instant', hint: 'Card or transfer, confirmed automatically' },
  { key: 'transfer', label: 'Transfer to me', hint: 'They send to your account, you confirm' },
  { key: 'both', label: 'Let them choose', hint: 'Offer both on the invoice' },
];

const emptyMethodForm: MethodForm = {
  type: 'bank',
  label: '',
  bank_name: '',
  bank_code: '',
  account_name: '',
  account_number: '',
  email: '',
};

const methodIcon = (type: PayoutType) => (type === 'paypal' ? 'bxl-paypal' : 'bx-credit-card');
const maskAccount = (n?: string) => {
  const d = digitsOnly(n ?? '');
  return d ? `•••• ${d.slice(-4)}` : '';
};
const methodSummary = (m: PayoutMethod) =>
  m.type === 'paypal' ? m.email ?? '' : `${m.bank_name ?? ''} · ${maskAccount(m.account_number)}`;

export const Settings = () => {
  usePageMeta('Settings');
  const profile = useSettingsStore((s) => s.profile);
  const setProfile = useSettingsStore((s) => s.setProfile);
  const {
    methods,
    defaultMethodId,
    schedule,
    withdrawals,
    addMethod,
    updateMethod,
    removeMethod,
    setDefaultMethod,
    setSchedule,
    addWithdrawal,
  } = usePayoutStore();
  const { data } = useInvoices();
  const invoices = data?.data ?? [];

  const [tab, setTab] = useState<'profile' | 'paid' | 'payouts'>('profile');
  const [form, setForm] = useState(profile);
  const [profileErrors, setProfileErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});

  // add / edit payout method
  const [methodOpen, setMethodOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [methodForm, setMethodForm] = useState<MethodForm>(emptyMethodForm);
  const [methodErrors, setMethodErrors] = useState<Partial<Record<keyof MethodForm, string>>>({});
  // the bank picker + live account verification
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedName, setResolvedName] = useState('');
  const [resolveError, setResolveError] = useState('');


  // receiving accounts: where clients send money directly
  const accounts = profile.receivingAccounts ?? [];
  const [acctOpen, setAcctOpen] = useState(false);
  const [acctEditingId, setAcctEditingId] = useState<string | null>(null);
  const [acctForm, setAcctForm] = useState<ReceivingAccount>(emptyAccount);
  const [acctErrors, setAcctErrors] = useState<Record<string, string>>({});
  const [savingAccount, setSavingAccount] = useState(false);

  // the Nigerian-bank rail is the one that gets the picker + live verification
  const isNgnBank = acctForm.provider === 'bank' && acctForm.currency === 'NGN';

  // Load the bank list the first time the NGN-bank account form is open.
  useEffect(() => {
    if (!acctOpen || !isNgnBank || banks.length > 0 || banksLoading) return;
    setBanksLoading(true);
    settingsApi
      .listBanks()
      .then(setBanks)
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));
  }, [acctOpen, isNgnBank, banks.length, banksLoading]);

  // Verify the account once a bank and a full 10-digit NUBAN are set. Debounced,
  // and cancels in-flight lookups so only the latest answer lands.
  useEffect(() => {
    setResolveError('');
    if (!isNgnBank || !acctForm.bank_code || (acctForm.account_number ?? '').length !== 10) {
      setResolvedName('');
      setResolving(false);
      return;
    }
    let cancelled = false;
    setResolving(true);
    const timer = window.setTimeout(() => {
      settingsApi
        .resolveAccount(acctForm.account_number as string, acctForm.bank_code as string)
        .then((res) => {
          if (cancelled) return;
          setResolvedName(res.accountName);
          setAcctForm((f) => ({ ...f, account_name: res.accountName }));
          setAcctErrors((er) => ({ ...er, account_name: '', account_number: '' }));
        })
        .catch(() => {
          if (cancelled) return;
          setResolvedName('');
          setResolveError('We could not verify that account. Check the number and the bank.');
        })
        .finally(() => {
          if (!cancelled) setResolving(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acctForm.bank_code, acctForm.account_number, isNgnBank]);

  const openAddAccount = () => {
    setAcctEditingId(null);
    setAcctForm({ ...emptyAccount, currency: profile.currency || 'USD' });
    setAcctErrors({});
    resetResolve();
    setAcctOpen(true);
  };
  const openEditAccount = (a: ReceivingAccount) => {
    setAcctEditingId(a.id);
    setAcctForm(a);
    setAcctErrors({});
    // an existing bank account already carries its verified name
    setResolvedName(a.provider === 'bank' && a.currency === 'NGN' ? (a.account_name ?? '') : '');
    setResolveError('');
    setResolving(false);
    setAcctOpen(true);
  };
  const saveAccount = async () => {
    const errs: Record<string, string> = {};
    if (!isFilled(acctForm.account_name)) errs.account_name = 'Required';
    if (!isFilled(acctForm.currency)) errs.currency = 'Required';
    // the spec that drew the form is the spec that judges it
    for (const field of accountFieldsFor(acctForm.provider, acctForm.currency)) {
      const value = ((acctForm[field.key] as string | undefined) ?? '').trim();
      if (field.required && !value) {
        errs[field.key] = 'Required';
      } else if (value && field.kind === 'email' && !isEmail(value)) {
        errs[field.key] = 'That does not look like an email';
      } else if (value && field.kind === 'digits' && field.digits &&
                 value.replace(/\D/g, '').length !== field.digits) {
        errs[field.key] = `${field.digits} digits`;
      }
    }
    setAcctErrors(errs);
    if (Object.keys(errs).length) return;
    if (savingAccount) return; // a second click while the first is in flight

    // Label is optional: keep what was typed, else infer a sensible nickname
    // (the verified account name, then the bank name).
    const label =
      acctForm.label.trim() ||
      acctForm.account_name.trim() ||
      acctForm.bank_name?.trim() ||
      'Account';
    const account = { ...acctForm, label };

    setSavingAccount(true);
    // hold the loading state a beat even on a fast reply, so the click reads as
    // "working" and never invites an impatient second tap
    const minShown = new Promise((r) => setTimeout(r, 700));
    try {
      const saved = acctEditingId
        ? await settingsApi.updateAccount(acctEditingId, account)
        : await settingsApi.createAccount(account);
      await minShown;
      const next = acctEditingId
        ? accounts.map((a) => (a.id === acctEditingId ? saved : a))
        : // createAccount is idempotent server-side: a duplicate returns the
          // existing row, so de-dupe by id here too rather than append blindly
          [...accounts.filter((a) => a.id !== saved.id), saved];
      setProfile({ receivingAccounts: next });
      toast.success(acctEditingId ? 'Account updated' : `${label} added`);
      setAcctOpen(false);
    } catch {
      toast.error('That did not save. Check the details and try again.');
    } finally {
      setSavingAccount(false);
    }
  };
  const removeAccount = (a: ReceivingAccount) => {
    // put it back where it was, not on the end, so the list does not reshuffle
    const at = accounts.findIndex((x) => x.id === a.id);
    setProfile({ receivingAccounts: accounts.filter((x) => x.id !== a.id) });
    void settingsApi.deleteAccount(a.id).catch(() => undefined);
    toast.undo(`${a.label} removed. Clients will stop seeing these details.`, () => {
      // undo re-creates on the server; the row keeps its details, not its id
      void settingsApi
        .createAccount(a)
        .then((restoredRow) => {
          const restored = accounts.filter((x) => x.id !== a.id);
          restored.splice(at < 0 ? restored.length : at, 0, restoredRow);
          setProfile({ receivingAccounts: restored });
          toast.success(`${a.label} is back`);
        })
        .catch(() => toast.error('Could not restore the account'));
    });
  };
  const setRoute = (currency: string, route: PaymentRoute) => {
    setProfile({
      routeByCurrency: { ...(profile.routeByCurrency ?? {}), [currency]: route },
    });
  };

  // withdraw
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [withdrawMethodId, setWithdrawMethodId] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState('');

  const paidTotal = invoices.filter((i) => isPaid(i.status)).reduce((s, i) => s + i.total, 0);
  const withdrawn = withdrawals.reduce((s, w) => s + w.amount, 0);
  const balance = Math.max(0, paidTotal - withdrawn);

  const saveProfile = () => {
    const next: { name?: string; email?: string; phone?: string } = {};
    if (!isFilled(form.name)) next.name = 'Business name is required';
    if (!isEmail(form.email)) next.email = 'Enter a valid email';
    if (!isPhone(form.phone)) next.phone = 'Enter a valid phone number';
    setProfileErrors(next);
    if (Object.keys(next).length > 0) return;
    setProfile(form);
    toast.success('Business profile saved');
  };

  const resetResolve = () => {
    setResolvedName('');
    setResolveError('');
    setResolving(false);
  };
  const openAddMethod = () => {
    setEditingId(null);
    setMethodForm(emptyMethodForm);
    setMethodErrors({});
    resetResolve();
    setMethodOpen(true);
  };
  const openEditMethod = (m: PayoutMethod) => {
    setEditingId(m.id);
    setMethodForm({
      type: m.type,
      label: m.label,
      bank_name: m.bank_name ?? '',
      bank_code: m.bank_code ?? '',
      account_name: m.account_name ?? '',
      account_number: m.account_number ?? '',
      email: m.email ?? '',
    });
    setMethodErrors({});
    resetResolve();
    setMethodOpen(true);
  };

  const saveMethod = () => {
    const f = methodForm;
    const errs: Partial<Record<keyof MethodForm, string>> = {};
    if (f.type === 'bank') {
      if (!isFilled(f.bank_name)) errs.bank_name = 'Required';
      if (!isFilled(f.account_name)) errs.account_name = 'Required';
      if (!isAccountNumber(f.account_number))
        errs.account_number = 'Enter a valid 10-digit account number';
    } else {
      if (!isEmail(f.email)) errs.email = 'Enter a valid PayPal email';
    }
    setMethodErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Label is optional: keep what was typed, otherwise infer a sensible one
    // (the verified account name for a bank, the email for PayPal).
    const label =
      f.label.trim() ||
      (f.type === 'bank'
        ? f.account_name.trim() || f.bank_name.trim() || 'Bank account'
        : f.email.trim() || 'PayPal');

    const payload =
      f.type === 'bank'
        ? {
            type: 'bank' as const,
            label,
            bank_name: f.bank_name.trim(),
            bank_code: f.bank_code || undefined,
            account_name: f.account_name.trim(),
            account_number: digitsOnly(f.account_number),
          }
        : { type: 'paypal' as const, label, email: f.email.trim() };

    if (editingId) {
      updateMethod(editingId, payload);
      toast.success('Payout method updated');
    } else {
      addMethod(payload);
      toast.success('Payout method added');
    }
    setMethodOpen(false);
  };

  const handleRemove = (m: PayoutMethod) => {
    removeMethod(m.id);
    toast.undo(`${m.label} removed`, () => {
      // addMethod mints a new id; everything the user typed comes back
      const { id: _id, ...rest } = m;
      addMethod(rest);
      toast.success(`${m.label} is back`);
    });
  };

  const openWithdraw = () => {
    setAmount(Math.floor(balance));
    setWithdrawMethodId(defaultMethodId ?? methods[0]?.id ?? '');
    setWithdrawError('');
    setWithdrawOpen(true);
  };
  const confirmWithdraw = () => {
    const m = methods.find((x) => x.id === withdrawMethodId);
    if (!m) {
      setWithdrawError('Choose a payout method');
      return;
    }
    if (!isPositiveAmount(amount)) {
      setWithdrawError('Enter an amount greater than zero');
      return;
    }
    if (amount > balance) {
      setWithdrawError('Amount exceeds your available balance');
      return;
    }
    addWithdrawal(amount, new Date().toISOString(), m.id, m.label);
    toast.success(`${formatCurrency(amount, profile.currency)} on its way to ${m.label}`);
    setWithdrawOpen(false);
  };

  return (
    <LegacyWorkspace active="settings" title="Settings">
      <div className="view view--narrow">
        {/* v1 scope: Payouts is hidden, not wired. The tab returns with the
            payment rails; the code below stays intact. */}
        <Segmented
          ariaLabel="Settings sections"
          variant="underline"
          value={tab}
          options={[
            { key: 'profile', label: 'Business profile' },
            { key: 'paid', label: 'Getting paid' },
          ]}
          onChange={(key) => setTab(key as typeof tab)}
        />

        {tab === 'profile' && (
          <div className="dash-card">
            <h3 className="cinv-section-title">Business profile</h3>
            <p className="dash-muted settings-lead">
              This appears as “Bill from” on every invoice you send.
            </p>
            <div className="cinv-fields cinv-fields--stack">
              <label className="cinv-field">
                <span>Business name</span>
                <input
                  value={form.name}
                  className={profileErrors.name ? 'is-invalid' : ''}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    setProfileErrors((er) => ({ ...er, name: undefined }));
                  }}
                />
                {profileErrors.name && <small className="field-error">{profileErrors.name}</small>}
              </label>
              <label className="cinv-field">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  className={profileErrors.email ? 'is-invalid' : ''}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value });
                    setProfileErrors((er) => ({ ...er, email: undefined }));
                  }}
                />
                {profileErrors.email && <small className="field-error">{profileErrors.email}</small>}
              </label>
              <label className="cinv-field">
                <span>Phone</span>
                <input
                  type="tel"
                  inputMode="tel"
                  maxLength={18}
                  value={form.phone}
                  className={profileErrors.phone ? 'is-invalid' : ''}
                  onChange={(e) => {
                    // phone characters only (digits, +, space, dashes, parens)
                    const phone = e.target.value.replace(/[^\d+\s()-]/g, '').slice(0, 18);
                    setForm({ ...form, phone });
                    setProfileErrors((er) => ({ ...er, phone: undefined }));
                  }}
                />
                {profileErrors.phone && <small className="field-error">{profileErrors.phone}</small>}
              </label>
              <label className="cinv-field">
                <span>Address</span>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </label>
              <div className="cinv-field">
                <span>Default currency</span>
                <FieldSelect
                  value={form.currency}
                  aria-label="Default currency"
                  options={['NGN', 'USD', 'EUR', 'GBP'].map((c) => ({ value: c, label: c }))}
                  onChange={(currency) => setForm({ ...form, currency })}
                />
              </div>
              <label className="cinv-field">
                <span>Invoice number prefix</span>
                <input
                  value={form.invoice_prefix ?? ''}
                  aria-label="Invoice number prefix"
                  maxLength={6}
                  placeholder="INV"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      // uppercase letters/digits only, 2–6 chars, e.g. ADA
                      invoice_prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
                    })
                  }
                />
                <small className="dash-muted">
                  Numbers count up from here — e.g. {(form.invoice_prefix || 'INV')}-0001
                </small>
              </label>
            </div>
            <div className="settings-actions">
              <button type="button" className="btn btn-primary" onClick={saveProfile}>
                Save changes
              </button>
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div className="dash-card">
            <h3 className="cinv-section-title">Invoice template</h3>
            <p className="dash-muted settings-lead">
              The paper your clients open. Changes apply to every invoice from
              now on.
            </p>
            <TemplatePicker
              compact
              value={profile.template ?? 'classic'}
              onChange={(template) => {
                setProfile({ template });
                toast.success('Template updated');
              }}
              brand={{
                name: profile.name,
                color: profile.brandColor ?? '#924ee9',
                logo: profile.logo,
              }}
            />
          </div>
        )}

        {tab === 'profile' && <PasswordCard />}

        {tab === 'paid' && (
          <>
            <div className="dash-card">
              <h3 className="cinv-section-title">Where clients send money</h3>
              <p className="dash-muted settings-lead">
                Add the accounts you already get paid into. Invoicier never
                touches this money, it just shows your client the right details
                and waits for you to confirm it landed.
              </p>

              {accounts.length === 0 ? (
                <div className="iw-acct-empty">
                  <i className="bx bx-wallet" aria-hidden="true" />
                  <div>
                    <b>No accounts yet</b>
                    <small>
                      Grey, Fincra, a domiciliary account, anywhere your money
                      already arrives.
                    </small>
                  </div>
                </div>
              ) : (
                <ul className="iw-acct-list">
                  {accounts.map((a) => (
                    <li key={a.id} className="iw-acct">
                      <span className="iw-acct-badge">{a.currency}</span>
                      <div className="iw-acct-info">
                        <b>{a.label}</b>
                        <small>
                          {PROVIDER_LABELS[a.provider] ?? a.provider}
                          {a.account_number ? ` · ${maskAccount(a.account_number) || a.account_number}` : ''}
                        </small>
                      </div>
                      <div className="iw-acct-actions">
                        {(profile.defaultAccountByCurrency ?? {})[a.currency] === a.id ? (
                          <span className="iw-acct-default">
                            <i className="bx bx-check" /> Default
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => {
                              setProfile({
                                defaultAccountByCurrency: {
                                  ...(profile.defaultAccountByCurrency ?? {}),
                                  [a.currency]: a.id,
                                },
                              });
                              toast.success(`${a.label} is now the default for ${a.currency}`);
                            }}
                          >
                            Make default
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => openEditAccount(a)}
                        >
                          <i className="bx bx-pencil" /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          aria-label={`Remove ${a.label}`}
                          title={`Remove ${a.label}`}
                          onClick={() => removeAccount(a)}
                        >
                          <i className="bx bx-trash" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <button type="button" className="iw-btn" onClick={openAddAccount}>
                <i className="bx bx-plus" /> Add an account
              </button>
            </div>

            <div className="dash-card">
              <h3 className="cinv-section-title">How each currency gets paid</h3>
              <p className="dash-muted settings-lead">
                The default for new invoices. You can still change it on any
                single invoice before you send it.
              </p>
              <ul className="iw-routes">
                {['NGN', 'USD', 'EUR', 'GBP'].map((cur) => {
                  const active =
                    profile.routeByCurrency?.[cur] ?? (cur === 'NGN' ? 'instant' : 'transfer');
                  const hasAccount = accounts.some((a) => a.currency === cur);
                  return (
                    <li key={cur}>
                      <span className="iw-routes-cur">{cur}</span>
                      <div className="iw-routes-pick">
                        {ROUTE_CHOICES.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            title={c.hint}
                            className={active === c.key ? 'active' : ''}
                            onClick={() => setRoute(cur, c.key)}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                      {!hasAccount && active !== 'instant' && (
                        <small className="iw-routes-warn">
                          <i className="bx bx-error-circle" /> No {cur} account yet, so
                          instant is offered instead
                        </small>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}

        {tab === 'payouts' && (
          <>
            <div className="dash-card payout-balance">
              <div>
                <span className="payout-balance-label">Available to withdraw</span>
                <span className="payout-balance-value">
                  {formatCurrency(balance, profile.currency)}
                </span>
                <span className="payout-balance-sub">
                  {formatCurrency(paidTotal, profile.currency)} collected ·{' '}
                  {formatCurrency(withdrawn, profile.currency)} withdrawn
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={balance <= 0 || methods.length === 0}
                onClick={openWithdraw}
              >
                <i className="bx bx-down-arrow-circle" /> Withdraw
              </button>
            </div>

            <div className="dash-card">
              <div className="settings-head-row">
                <div>
                  <h3 className="cinv-section-title">Payout methods</h3>
                  <p className="dash-muted settings-lead">
                    Add one or more destinations and pick where withdrawals are sent.
                  </p>
                </div>
                <button type="button" className="btn btn-primary" onClick={openAddMethod}>
                  <i className="bx bx-plus" /> Add method
                </button>
              </div>

              {methods.length === 0 ? (
                <p className="payout-empty">
                  <i className="bx bx-wallet" /> No payout methods yet. Add a bank account or PayPal
                  to receive funds.
                </p>
              ) : (
                <ul className="payout-methods">
                  {methods.map((m) => (
                    <li
                      key={m.id}
                      className={`payout-method${m.id === defaultMethodId ? ' is-default' : ''}`}
                    >
                      <label className="payout-method-pick" title="Set as default">
                        <input
                          type="radio"
                          name="default-method"
                          checked={m.id === defaultMethodId}
                          onChange={() => setDefaultMethod(m.id)}
                        />
                      </label>
                      <span className="payout-method-icon">
                        <i className={`bx ${methodIcon(m.type)}`} />
                      </span>
                      <div className="payout-method-info">
                        <strong>
                          {m.label}
                          {m.id === defaultMethodId && (
                            <span className="payout-default-badge">Default</span>
                          )}
                        </strong>
                        <span>{methodSummary(m)}</span>
                      </div>
                      <div className="payout-method-actions">
                        <button type="button" aria-label="Edit" onClick={() => openEditMethod(m)}>
                          <i className="bx bx-pencil" />
                        </button>
                        <button type="button" aria-label="Remove" onClick={() => handleRemove(m)}>
                          <i className="bx bx-trash" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <label className="cinv-field cinv-field--mt">
                <span>Payout schedule</span>
                <select
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value as PayoutSchedule)}
                >
                  <option value="manual">Manual</option>
                  <option value="weekly">Weekly (auto)</option>
                  <option value="monthly">Monthly (auto)</option>
                </select>
              </label>
            </div>

            {withdrawals.length > 0 && (
              <div className="dash-card">
                <h3 className="cinv-section-title">Recent withdrawals</h3>
                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawals.map((w) => (
                        <tr key={w.id}>
                          <td className="dash-muted">{formatDate(w.date)}</td>
                          <td className="dash-amount">
                            {formatCurrency(w.amount, profile.currency)}
                          </td>
                          <td>{w.methodLabel || 'Bank account'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* add / edit payout method */}
      <Modal
        open={methodOpen}
        onClose={() => setMethodOpen(false)}
        title={editingId ? 'Edit payout method' : 'Add payout method'}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setMethodOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveMethod}>
              {editingId ? 'Save method' : 'Add method'}
            </button>
          </>
        }
      >
        <div className="cinv-fields cinv-fields--stack">
          <label className="cinv-field">
            <span>Method type</span>
            <select
              value={methodForm.type}
              onChange={(e) =>
                setMethodForm({ ...methodForm, type: e.target.value as PayoutType })
              }
            >
              <option value="bank">Bank account</option>
              <option value="paypal">PayPal</option>
            </select>
          </label>

          {methodForm.type === 'bank' ? (
            <>
              <label className="cinv-field">
                <span>Bank</span>
                <BankPicker
                  value={methodForm.bank_code}
                  bankName={methodForm.bank_name}
                  banks={banks}
                  loading={banksLoading}
                  invalid={!!methodErrors.bank_name}
                  aria-label="Bank"
                  onChange={(bank) => {
                    setMethodForm({
                      ...methodForm,
                      bank_code: bank?.code ?? '',
                      bank_name: bank?.name ?? '',
                      // a new bank invalidates the last verified name
                      account_name: '',
                    });
                    setResolvedName('');
                    setMethodErrors((er) => ({ ...er, bank_name: undefined }));
                  }}
                />
                {methodErrors.bank_name && (
                  <small className="field-error">{methodErrors.bank_name}</small>
                )}
              </label>
              <label className="cinv-field">
                <span>Account number</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  value={methodForm.account_number}
                  className={methodErrors.account_number ? 'is-invalid' : ''}
                  placeholder="10-digit account number"
                  onChange={(e) => {
                    // digits only, capped at a 10-digit NUBAN
                    const account_number = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setMethodForm({ ...methodForm, account_number });
                    setMethodErrors((er) => ({ ...er, account_number: undefined }));
                  }}
                />
                {methodErrors.account_number && (
                  <small className="field-error">{methodErrors.account_number}</small>
                )}
              </label>
              <label className="cinv-field">
                <span>Account name</span>
                <input
                  value={methodForm.account_name}
                  readOnly={!!resolvedName}
                  className={`${methodErrors.account_name ? 'is-invalid' : ''}${resolvedName ? ' is-verified' : ''}`}
                  placeholder={
                    resolving ? 'Verifying…' : 'Auto-fills once the account is verified'
                  }
                  onChange={(e) => {
                    setMethodForm({ ...methodForm, account_name: e.target.value });
                    setMethodErrors((er) => ({ ...er, account_name: undefined }));
                  }}
                />
                {resolving && (
                  <small className="iw-field-hint">
                    <span className="iw-spin" aria-hidden="true" /> Verifying account…
                  </small>
                )}
                {!resolving && resolvedName && (
                  <small className="field-ok">
                    <i className="bx bx-check-circle" aria-hidden="true" /> Verified: {resolvedName}
                  </small>
                )}
                {!resolving && resolveError && (
                  <small className="field-error">{resolveError}</small>
                )}
                {methodErrors.account_name && !resolvedName && (
                  <small className="field-error">{methodErrors.account_name}</small>
                )}
              </label>
            </>
          ) : (
            <label className="cinv-field">
              <span>PayPal email</span>
              <input
                type="email"
                value={methodForm.email}
                className={methodErrors.email ? 'is-invalid' : ''}
                placeholder="you@example.com"
                onChange={(e) => {
                  setMethodForm({ ...methodForm, email: e.target.value });
                  setMethodErrors((er) => ({ ...er, email: undefined }));
                }}
              />
              {methodErrors.email && <small className="field-error">{methodErrors.email}</small>}
            </label>
          )}

          <label className="cinv-field">
            <span>Label <em className="iw-optional">optional</em></span>
            <input
              value={methodForm.label}
              placeholder={
                methodForm.type === 'paypal'
                  ? 'A nickname — defaults to your email'
                  : 'A nickname — defaults to the account name'
              }
              onChange={(e) => setMethodForm({ ...methodForm, label: e.target.value })}
            />
          </label>
        </div>
      </Modal>

      {/* withdraw */}
      <Modal
        open={acctOpen}
        onClose={() => setAcctOpen(false)}
        title={acctEditingId ? 'Edit account' : 'Add an account'}
      >
        <div className="cinv-fields cinv-fields--stack">
          <div className="iw-paid-grid">
            <div className="cinv-field">
              <span>Provider</span>
              <FieldSelect
                value={acctForm.provider}
                aria-label="Provider"
                options={Object.entries(PROVIDER_LABELS).map(([key, label]) => ({
                  value: key,
                  label,
                }))}
                onChange={(provider) =>
                  setAcctForm(
                    reshapeAccount(acctForm, { provider: provider as AccountProvider })
                  )
                }
              />
            </div>
            <div className="cinv-field">
              <span>Currency</span>
              <FieldSelect
                value={acctForm.currency}
                aria-label="Account currency"
                options={['NGN', 'USD', 'EUR', 'GBP'].map((c) => ({ value: c, label: c }))}
                onChange={(currency) => setAcctForm(reshapeAccount(acctForm, { currency }))}
              />
            </div>
          </div>

          {isNgnBank ? (
            <>
              {/* Nigerian bank: pick the bank, type the NUBAN, the name verifies */}
              <label className="cinv-field">
                <span>Bank</span>
                <BankPicker
                  value={acctForm.bank_code ?? ''}
                  bankName={acctForm.bank_name}
                  banks={banks}
                  loading={banksLoading}
                  invalid={!!acctErrors.bank_name}
                  aria-label="Bank"
                  onChange={(bank) => {
                    setAcctForm({
                      ...acctForm,
                      bank_code: bank?.code ?? '',
                      bank_name: bank?.name ?? '',
                      account_name: '',
                    });
                    setResolvedName('');
                    setAcctErrors((er) => ({ ...er, bank_name: '' }));
                  }}
                />
                {acctErrors.bank_name && <small className="field-error">{acctErrors.bank_name}</small>}
              </label>
              <label className="cinv-field">
                <span>Account number</span>
                <input
                  inputMode="numeric"
                  maxLength={10}
                  value={acctForm.account_number ?? ''}
                  placeholder="10-digit account number"
                  className={acctErrors.account_number ? 'is-invalid' : ''}
                  onChange={(e) => {
                    const account_number = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setAcctForm({ ...acctForm, account_number });
                    setAcctErrors((er) => ({ ...er, account_number: '' }));
                  }}
                />
                {acctErrors.account_number && (
                  <small className="field-error">{acctErrors.account_number}</small>
                )}
              </label>
              <label className="cinv-field">
                <span>Account name</span>
                <input
                  value={acctForm.account_name}
                  readOnly={!!resolvedName}
                  className={`${acctErrors.account_name ? 'is-invalid' : ''}${resolvedName ? ' is-verified' : ''}`}
                  placeholder={resolving ? 'Verifying…' : 'Auto-fills once the account is verified'}
                  onChange={(e) => setAcctForm({ ...acctForm, account_name: e.target.value })}
                />
                {resolving && (
                  <small className="iw-field-hint">
                    <span className="iw-spin" aria-hidden="true" /> Verifying account…
                  </small>
                )}
                {!resolving && resolvedName && (
                  <small className="field-ok">
                    <i className="bx bx-check-circle" aria-hidden="true" /> Verified: {resolvedName}
                  </small>
                )}
                {!resolving && resolveError && <small className="field-error">{resolveError}</small>}
                {acctErrors.account_name && !resolvedName && (
                  <small className="field-error">{acctErrors.account_name}</small>
                )}
              </label>
              <label className="cinv-field">
                <span>Name it <em className="iw-optional">optional</em></span>
                <input
                  value={acctForm.label}
                  placeholder="A nickname — defaults to the account name"
                  onChange={(e) => setAcctForm({ ...acctForm, label: e.target.value })}
                />
              </label>
            </>
          ) : (
            <>
              <label className="cinv-field">
                <span>Name it</span>
                <input
                  value={acctForm.label}
                  placeholder="Grey USD"
                  className={acctErrors.label ? 'is-invalid' : ''}
                  onChange={(e) => setAcctForm({ ...acctForm, label: e.target.value })}
                />
                {acctErrors.label && <small className="field-error">{acctErrors.label}</small>}
              </label>

              <label className="cinv-field">
                <span>Account name</span>
                <input
                  value={acctForm.account_name}
                  placeholder="Ada Obi"
                  className={acctErrors.account_name ? 'is-invalid' : ''}
                  onChange={(e) => setAcctForm({ ...acctForm, account_name: e.target.value })}
                />
                {acctErrors.account_name && (
                  <small className="field-error">{acctErrors.account_name}</small>
                )}
              </label>

              {/* the fields this KIND of account, in THIS currency, is made of;
                  a Nigerian NUBAN is not an IBAN is not a PayPal email */}
              {accountFieldsFor(acctForm.provider, acctForm.currency).map((field) => (
                <label className="cinv-field" key={field.key}>
                  <span>
                    {field.label}
                    {!field.required && <em className="iw-optional"> optional</em>}
                  </span>
                  <input
                    value={(acctForm[field.key] as string | undefined) ?? ''}
                    placeholder={field.placeholder}
                    inputMode={field.kind === 'digits' ? 'numeric' : undefined}
                    maxLength={field.kind === 'digits' ? field.digits : undefined}
                    className={acctErrors[field.key] ? 'is-invalid' : ''}
                    onChange={(e) => {
                      // digit fields accept digits only, capped at the field's width
                      const value =
                        field.kind === 'digits'
                          ? e.target.value.replace(/\D/g, '').slice(0, field.digits ?? 34)
                          : e.target.value;
                      setAcctForm({ ...acctForm, [field.key]: value });
                    }}
                  />
                  {field.hint && !acctErrors[field.key] && (
                    <small className="iw-field-hint">{field.hint}</small>
                  )}
                  {acctErrors[field.key] && (
                    <small className="field-error">{acctErrors[field.key]}</small>
                  )}
                </label>
              ))}
            </>
          )}

          <label className="cinv-field">
            <span>Anything they should know</span>
            <textarea
              rows={2}
              value={acctForm.instructions ?? ''}
              placeholder="Quote the invoice number as the reference"
              onChange={(e) => setAcctForm({ ...acctForm, instructions: e.target.value })}
            />
          </label>

          <div className="iw-paid-actions">
            <button type="button" className="iw-btn iw-btn--ghost" onClick={() => setAcctOpen(false)}>
              Cancel
            </button>
            <button type="button" className="iw-btn" onClick={saveAccount} disabled={savingAccount}>
              {savingAccount ? (
                <>
                  <span className="iw-spin" aria-hidden="true" />{' '}
                  {acctEditingId ? 'Saving…' : 'Adding…'}
                </>
              ) : (
                acctEditingId ? 'Save changes' : 'Add account'
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="Withdraw funds"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={confirmWithdraw}>
              Withdraw
            </button>
          </>
        }
      >
        <p className="dash-muted withdraw-balance">
          Available balance: <strong>{formatCurrency(balance, profile.currency)}</strong>
        </p>
        <div className="cinv-fields cinv-fields--stack">
          <label className="cinv-field">
            <span>Amount</span>
            <input
              type="number"
              min={0}
              max={balance}
              step="0.01"
              value={amount}
              className={withdrawError && !isPositiveAmount(amount) ? 'is-invalid' : ''}
              onChange={(e) => {
                setAmount(Number(e.target.value));
                setWithdrawError('');
              }}
            />
          </label>
          <label className="cinv-field">
            <span>Send to</span>
            <select
              value={withdrawMethodId}
              className={withdrawError && !withdrawMethodId ? 'is-invalid' : ''}
              onChange={(e) => {
                setWithdrawMethodId(e.target.value);
                setWithdrawError('');
              }}
            >
              {methods.length === 0 && <option value="">No payout method</option>}
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} · {methodSummary(m)}
                </option>
              ))}
            </select>
          </label>
          {withdrawError && <small className="field-error">{withdrawError}</small>}
        </div>
      </Modal>

    </LegacyWorkspace>
  );
};
