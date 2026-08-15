import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useChangePassword } from '@/hooks';
import { NewPasswordField } from '@/components/ui/NewPasswordField';
import { toast } from '@/lib/toast';

/**
 * Sign-in security, in Settings.
 *
 * An account can start email-only (a code every time). This is where the
 * password gets attached later — or changed once it exists. Setting one flips
 * `has_password`, so the sign-in screen starts offering the faster way in and
 * this card quietly switches from "set" to "change".
 */
export const PasswordCard = () => {
  const hasPassword = useAuthStore((s) => s.user?.has_password ?? false);
  const change = useChangePassword();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const clear = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
  };

  const submit = () => {
    setError('');
    if (next.length < 8) {
      setError('Eight characters or more, so nobody else gets in');
      return;
    }
    if (next !== confirm) {
      setError('Those two do not match yet');
      return;
    }
    if (hasPassword && !current) {
      setError('Enter your current password to change it');
      return;
    }
    change.mutate(
      {
        currentPassword: hasPassword ? current : undefined,
        newPassword: next,
        confirmPassword: confirm,
      },
      {
        onSuccess: () => {
          toast.success(hasPassword ? 'Password changed' : "Password set, you're all set");
          clear();
        },
        onError: (e) =>
          setError(e instanceof Error ? e.message : 'That did not work. Give it another go.'),
      }
    );
  };

  return (
    <div className="dash-card">
      <h3 className="cinv-section-title">{hasPassword ? 'Password' : 'Set a password'}</h3>
      <p className="dash-muted settings-lead">
        {hasPassword
          ? 'Change the password you use to sign in. You can still ask for a one-time code any time.'
          : 'You sign in with an emailed code right now. Set a password for a faster way in. The code is always there as a backup.'}
      </p>

      {hasPassword && (
        <label className="cinv-field">
          <span>Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            placeholder="••••••••"
            onChange={(e) => {
              setCurrent(e.target.value);
              setError('');
            }}
          />
        </label>
      )}

      <div className="cinv-field">
        <span>{hasPassword ? 'New password' : 'Password'}</span>
        <NewPasswordField
          value={next}
          onChange={(v) => {
            setNext(v);
            setError('');
          }}
          onEnter={submit}
        />
      </div>

      <label className="cinv-field">
        <span>Confirm {hasPassword ? 'new ' : ''}password</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          placeholder="Type it once more"
          className={error ? 'is-invalid' : ''}
          onChange={(e) => {
            setConfirm(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        {error && <small className="field-error">{error}</small>}
      </label>

      <div className="settings-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={change.isPending || next.length < 8}
        >
          {change.isPending ? 'Saving…' : hasPassword ? 'Change password' : 'Set password'}
        </button>
      </div>
    </div>
  );
};
