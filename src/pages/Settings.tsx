import { useState } from 'react';
import { LegacyWorkspace } from '@/components/static';
import { Modal } from '@/components/Modal';
import { useInvoices } from '@/hooks';
import { useSettingsStore } from '@/stores/settingsStore';
import { usePayoutStore } from '@/stores/payoutStore';
import type { PayoutSchedule } from '@/stores/payoutStore';
import { formatCurrency, formatDate } from '@/utils/format';
import { isEmail } from '@/lib/validate';
import { toast } from '@/lib/toast';

export const Settings = () => {
  const profile = useSettingsStore((s) => s.profile);
  const setProfile = useSettingsStore((s) => s.setProfile);
  const { method, schedule, withdrawals, setMethod, setSchedule, addWithdrawal } = usePayoutStore();
  const { data } = useInvoices();
  const invoices = data?.data ?? [];

  const [tab, setTab] = useState<'profile' | 'payouts'>('profile');
  const [form, setForm] = useState(profile);
  const [profileErrors, setProfileErrors] = useState<{ name?: string; email?: string }>({});
  const [payoutErrors, setPayoutErrors] = useState<{ bankName?: string; accountName?: string; accountNumber?: string }>({});
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState(0);

  const paidTotal = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const withdrawn = withdrawals.reduce((s, w) => s + w.amount, 0);
  const balance = Math.max(0, paidTotal - withdrawn);
  const hasMethod = method.accountNumber.trim().length > 0;

  const saveProfile = () => {
    const next: { name?: string; email?: string } = {};
    if (!form.name.trim()) next.name = 'Business name is required';
    if (!isEmail(form.email)) next.email = 'Enter a valid email';
    setProfileErrors(next);
    if (Object.keys(next).length > 0) return;
    setProfile(form);
    toast.success('Business profile saved');
  };

  const savePayout = () => {
    const next: { bankName?: string; accountName?: string; accountNumber?: string } = {};
    if (!method.bankName.trim()) next.bankName = 'Required';
    if (!method.accountName.trim()) next.accountName = 'Required';
    if (!/^[0-9\s-]{6,}$/.test(method.accountNumber.trim()))
      next.accountNumber = 'Enter a valid account number';
    setPayoutErrors(next);
    if (Object.keys(next).length > 0) return;
    toast.success('Payout settings saved');
  };

  const openWithdraw = () => {
    setAmount(Math.round(balance));
    setWithdrawOpen(true);
  };
  const confirmWithdraw = () => {
    if (!hasMethod) {
      toast.error('Add a payout method first');
      return;
    }
    if (amount <= 0 || amount > balance) {
      toast.error('Enter a valid amount');
      return;
    }
    addWithdrawal(amount, new Date().toISOString());
    toast.success(`${formatCurrency(amount, profile.currency)} on its way to ${method.bankName}`);
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
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
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
                disabled={balance <= 0}
                onClick={openWithdraw}
              >
                <i className="bx bx-down-arrow-circle" /> Withdraw
              </button>
            </div>

            <div className="dash-card">
              <h3 className="cinv-section-title">Payout method</h3>
              <p className="dash-muted settings-lead">Where your collected payments are sent.</p>
              <div className="cinv-fields cinv-fields--stack">
                <label className="cinv-field">
                  <span>Bank name</span>
                  <input
                    value={method.bankName}
                    className={payoutErrors.bankName ? 'is-invalid' : ''}
                    onChange={(e) => {
                      setMethod({ bankName: e.target.value });
                      setPayoutErrors((er) => ({ ...er, bankName: undefined }));
                    }}
                    placeholder="e.g. Chase"
                  />
                  {payoutErrors.bankName && (
                    <small className="field-error">{payoutErrors.bankName}</small>
                  )}
                </label>
                <label className="cinv-field">
                  <span>Account name</span>
                  <input
                    value={method.accountName}
                    className={payoutErrors.accountName ? 'is-invalid' : ''}
                    onChange={(e) => {
                      setMethod({ accountName: e.target.value });
                      setPayoutErrors((er) => ({ ...er, accountName: undefined }));
                    }}
                    placeholder="Account holder"
                  />
                  {payoutErrors.accountName && (
                    <small className="field-error">{payoutErrors.accountName}</small>
                  )}
                </label>
                <label className="cinv-field">
                  <span>Account number</span>
                  <input
                    value={method.accountNumber}
                    className={payoutErrors.accountNumber ? 'is-invalid' : ''}
                    onChange={(e) => {
                      setMethod({ accountNumber: e.target.value });
                      setPayoutErrors((er) => ({ ...er, accountNumber: undefined }));
                    }}
                    placeholder="••••••••"
                  />
                  {payoutErrors.accountNumber && (
                    <small className="field-error">{payoutErrors.accountNumber}</small>
                  )}
                </label>
                <label className="cinv-field">
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
              <div className="settings-actions">
                <button type="button" className="btn btn-primary" onClick={savePayout}>
                  Save payout method
                </button>
              </div>
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
                          <td>{method.bankName || 'Bank account'}</td>
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
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <label className="cinv-field">
            <span>To</span>
            <input
              value={hasMethod ? `${method.bankName} · ${method.accountNumber}` : 'No payout method set'}
              readOnly
            />
          </label>
        </div>
      </Modal>
    </LegacyWorkspace>
  );
};
