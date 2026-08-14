import { useState } from 'react';
import { Segmented } from '@/components/ui/Segmented';
import { LegacyWorkspace } from '@/components/static';
import { Modal } from '@/components/Modal';
import { FieldSelect } from '@/components/ui/FieldSelect';
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
import { settingsApi } from '@/api/settings';
import { accountFieldsFor } from '@/utils/paymentRoutes';

interface MethodForm {
  type: PayoutType;
  label: string;
  bank_name: string;
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
  instructions: '',
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

  // receiving accounts: where clients send money directly
  const accounts = profile.receivingAccounts ?? [];
  const [acctOpen, setAcctOpen] = useState(false);
  const [acctEditingId, setAcctEditingId] = useState<string | null>(null);
  const [acctForm, setAcctForm] = useState<ReceivingAccount>(emptyAccount);
  const [acctErrors, setAcctErrors] = useState<Record<string, string>>({});

  const openAddAccount = () => {
    setAcctEditingId(null);
    setAcctForm({ ...emptyAccount, currency: profile.currency || 'USD' });
    setAcctErrors({});
    setAcctOpen(true);
  };
  const openEditAccount = (a: ReceivingAccount) => {
    setAcctEditingId(a.id);
    setAcctForm(a);
    setAcctErrors({});
    setAcctOpen(true);
  };
  const saveAccount = async () => {
    const errs: Record<string, string> = {};
    if (!isFilled(acctForm.label)) errs.label = 'Give this account a name';
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

    try {
      const saved = acctEditingId
        ? await settingsApi.updateAccount(acctEditingId, acctForm)
        : await settingsApi.createAccount(acctForm);
      const next = acctEditingId
        ? accounts.map((a) => (a.id === acctEditingId ? saved : a))
        : [...accounts, saved];
      setProfile({ receivingAccounts: next });
      toast.success(acctEditingId ? 'Account updated' : `${acctForm.label} added`);
      setAcctOpen(false);
    } catch {
      toast.error('That did not save. Check the details and try again.');
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

  const openAddMethod = () => {
    setEditingId(null);
    setMethodForm(emptyMethodForm);
    setMethodErrors({});
    setMethodOpen(true);
  };
  const openEditMethod = (m: PayoutMethod) => {
    setEditingId(m.id);
    setMethodForm({
      type: m.type,
      label: m.label,
      bank_name: m.bank_name ?? '',
      account_name: m.account_name ?? '',
      account_number: m.account_number ?? '',
      email: m.email ?? '',
    });
    setMethodErrors({});
    setMethodOpen(true);
  };

  const saveMethod = () => {
    const f = methodForm;
    const errs: Partial<Record<keyof MethodForm, string>> = {};
    if (!isFilled(f.label)) errs.label = 'Give this method a name';
    if (f.type === 'bank') {
      if (!isFilled(f.bank_name)) errs.bank_name = 'Required';
      if (!isFilled(f.account_name)) errs.account_name = 'Required';
      if (!isAccountNumber(f.account_number))
        errs.account_number = 'Enter a valid account number (6–20 digits)';
    } else {
      if (!isEmail(f.email)) errs.email = 'Enter a valid PayPal email';
    }
    setMethodErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const payload =
      f.type === 'bank'
        ? {
            type: 'bank' as const,
            label: f.label.trim(),
            bank_name: f.bank_name.trim(),
            account_name: f.account_name.trim(),
            account_number: digitsOnly(f.account_number),
          }
        : { type: 'paypal' as const, label: f.label.trim(), email: f.email.trim() };

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

  const [resetOpen, setResetOpen] = useState(false);
  const resetDemo = () => {
    setResetOpen(false);
    ['invoicier-db', 'invoicier-services', 'invoicier-payouts'].forEach((k) =>
      localStorage.removeItem(k)
    );
    toast.info('Demo data reset');
    setTimeout(() => window.location.reload(), 400);
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
                  value={form.phone}
                  className={profileErrors.phone ? 'is-invalid' : ''}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
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

        <div className="settings-reset">
          <div>
            <strong>Reset demo data</strong>
            <p>Restore invoices, clients, services and payouts to the original sample data.</p>
          </div>
          <button type="button" className="btn btn-danger" onClick={() => setResetOpen(true)}>
            Reset demo
          </button>
        </div>
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

          <label className="cinv-field">
            <span>Label</span>
            <input
              value={methodForm.label}
              className={methodErrors.label ? 'is-invalid' : ''}
              placeholder={methodForm.type === 'paypal' ? 'e.g. PayPal' : 'e.g. Main account'}
              onChange={(e) => {
                setMethodForm({ ...methodForm, label: e.target.value });
                setMethodErrors((er) => ({ ...er, label: undefined }));
              }}
            />
            {methodErrors.label && <small className="field-error">{methodErrors.label}</small>}
          </label>

          {methodForm.type === 'bank' ? (
            <>
              <label className="cinv-field">
                <span>Bank name</span>
                <input
                  value={methodForm.bank_name}
                  className={methodErrors.bank_name ? 'is-invalid' : ''}
                  placeholder="e.g. Chase"
                  onChange={(e) => {
                    setMethodForm({ ...methodForm, bank_name: e.target.value });
                    setMethodErrors((er) => ({ ...er, bank_name: undefined }));
                  }}
                />
                {methodErrors.bank_name && (
                  <small className="field-error">{methodErrors.bank_name}</small>
                )}
              </label>
              <label className="cinv-field">
                <span>Account name</span>
                <input
                  value={methodForm.account_name}
                  className={methodErrors.account_name ? 'is-invalid' : ''}
                  placeholder="Account holder"
                  onChange={(e) => {
                    setMethodForm({ ...methodForm, account_name: e.target.value });
                    setMethodErrors((er) => ({ ...er, account_name: undefined }));
                  }}
                />
                {methodErrors.account_name && (
                  <small className="field-error">{methodErrors.account_name}</small>
                )}
              </label>
              <label className="cinv-field">
                <span>Account number</span>
                <input
                  inputMode="numeric"
                  value={methodForm.account_number}
                  className={methodErrors.account_number ? 'is-invalid' : ''}
                  placeholder="6–20 digits"
                  onChange={(e) => {
                    setMethodForm({ ...methodForm, account_number: e.target.value });
                    setMethodErrors((er) => ({ ...er, account_number: undefined }));
                  }}
                />
                {methodErrors.account_number && (
                  <small className="field-error">{methodErrors.account_number}</small>
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
                  setAcctForm({ ...acctForm, provider: provider as AccountProvider })
                }
              />
            </div>
            <div className="cinv-field">
              <span>Currency</span>
              <FieldSelect
                value={acctForm.currency}
                aria-label="Account currency"
                options={['NGN', 'USD', 'EUR', 'GBP'].map((c) => ({ value: c, label: c }))}
                onChange={(currency) => setAcctForm({ ...acctForm, currency })}
              />
            </div>
          </div>

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
                className={acctErrors[field.key] ? 'is-invalid' : ''}
                onChange={(e) =>
                  setAcctForm({ ...acctForm, [field.key]: e.target.value })
                }
              />
              {field.hint && !acctErrors[field.key] && (
                <small className="iw-field-hint">{field.hint}</small>
              )}
              {acctErrors[field.key] && (
                <small className="field-error">{acctErrors[field.key]}</small>
              )}
            </label>
          ))}

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
            <button type="button" className="iw-btn" onClick={saveAccount}>
              {acctEditingId ? 'Save changes' : 'Add account'}
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

      {/* The one thing here with no way back, so it still asks first. */}
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset the demo data?"
      >
        <p className="dash-muted">
          This clears every invoice, client, service and payout and puts the
          original sample data back. Unlike everything else in Invoicier, this
          one cannot be undone.
        </p>
        <div className="iw-paid-actions">
          <button
            type="button"
            className="iw-btn iw-btn--ghost"
            onClick={() => setResetOpen(false)}
          >
            Keep my data
          </button>
          <button type="button" className="iw-btn iw-btn--danger" onClick={resetDemo}>
            Reset everything
          </button>
        </div>
      </Modal>
    </LegacyWorkspace>
  );
};
