import { useState } from 'react';
import { LegacyWorkspace } from '@/components/static';
import { Modal } from '@/components/Modal';
import { useInvoices } from '@/hooks';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePayoutStore } from '@/stores/payoutStore';
import type { PayoutSchedule, PayoutType, PayoutMethod } from '@/stores/payoutStore';
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

interface MethodForm {
  type: PayoutType;
  label: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  email: string;
}

const emptyMethodForm: MethodForm = {
  type: 'bank',
  label: '',
  bankName: '',
  accountName: '',
  accountNumber: '',
  email: '',
};

const methodIcon = (type: PayoutType) => (type === 'paypal' ? 'bxl-paypal' : 'bx-credit-card');
const maskAccount = (n?: string) => {
  const d = digitsOnly(n ?? '');
  return d ? `•••• ${d.slice(-4)}` : '';
};
const methodSummary = (m: PayoutMethod) =>
  m.type === 'paypal' ? m.email ?? '' : `${m.bankName ?? ''} · ${maskAccount(m.accountNumber)}`;

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

  const [tab, setTab] = useState<'profile' | 'payouts'>('profile');
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

  // withdraw
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [withdrawMethodId, setWithdrawMethodId] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState('');

  const paidTotal = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
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
      bankName: m.bankName ?? '',
      accountName: m.accountName ?? '',
      accountNumber: m.accountNumber ?? '',
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
      if (!isFilled(f.bankName)) errs.bankName = 'Required';
      if (!isFilled(f.accountName)) errs.accountName = 'Required';
      if (!isAccountNumber(f.accountNumber))
        errs.accountNumber = 'Enter a valid account number (6–20 digits)';
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
            bankName: f.bankName.trim(),
            accountName: f.accountName.trim(),
            accountNumber: digitsOnly(f.accountNumber),
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
    if (!window.confirm(`Remove “${m.label}”?`)) return;
    removeMethod(m.id);
    toast.info('Payout method removed');
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

  const resetDemo = () => {
    if (
      !window.confirm(
        'Reset all demo data — invoices, clients, services and payouts? This cannot be undone.'
      )
    )
      return;
    ['invoicier-db', 'invoicier-services', 'invoicier-payouts'].forEach((k) =>
      localStorage.removeItem(k)
    );
    toast.info('Demo data reset');
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <LegacyWorkspace active="settings" title="Settings">
      <div className="view view--narrow">
        <div className="settings-tabs">
          <button
            type="button"
            className={tab === 'profile' ? 'active' : ''}
            onClick={() => setTab('profile')}
          >
            Business profile
          </button>
          <button
            type="button"
            className={tab === 'payouts' ? 'active' : ''}
            onClick={() => setTab('payouts')}
          >
            Payouts
          </button>
        </div>

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
              <label className="cinv-field">
                <span>Default currency</span>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="NGN">NGN</option>
                </select>
              </label>
            </div>
            <div className="settings-actions">
              <button type="button" className="btn btn-primary" onClick={saveProfile}>
                Save changes
              </button>
            </div>
          </div>
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
                  <i className="bx bx-wallet" /> No payout methods yet — add a bank account or PayPal
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
          <button type="button" className="btn btn-danger" onClick={resetDemo}>
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
                  value={methodForm.bankName}
                  className={methodErrors.bankName ? 'is-invalid' : ''}
                  placeholder="e.g. Chase"
                  onChange={(e) => {
                    setMethodForm({ ...methodForm, bankName: e.target.value });
                    setMethodErrors((er) => ({ ...er, bankName: undefined }));
                  }}
                />
                {methodErrors.bankName && (
                  <small className="field-error">{methodErrors.bankName}</small>
                )}
              </label>
              <label className="cinv-field">
                <span>Account name</span>
                <input
                  value={methodForm.accountName}
                  className={methodErrors.accountName ? 'is-invalid' : ''}
                  placeholder="Account holder"
                  onChange={(e) => {
                    setMethodForm({ ...methodForm, accountName: e.target.value });
                    setMethodErrors((er) => ({ ...er, accountName: undefined }));
                  }}
                />
                {methodErrors.accountName && (
                  <small className="field-error">{methodErrors.accountName}</small>
                )}
              </label>
              <label className="cinv-field">
                <span>Account number</span>
                <input
                  inputMode="numeric"
                  value={methodForm.accountNumber}
                  className={methodErrors.accountNumber ? 'is-invalid' : ''}
                  placeholder="6–20 digits"
                  onChange={(e) => {
                    setMethodForm({ ...methodForm, accountNumber: e.target.value });
                    setMethodErrors((er) => ({ ...er, accountNumber: undefined }));
                  }}
                />
                {methodErrors.accountNumber && (
                  <small className="field-error">{methodErrors.accountNumber}</small>
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
                  {m.label} — {methodSummary(m)}
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
