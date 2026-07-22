'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, KeyRound, LogOut } from 'lucide-react';
import { AuthShell } from '@/features/auth/auth-shell';

interface Props {
  /** Email of the signed-in user, shown so they know which account this is. */
  email?: string;
  onSubmit: (currentPassword: string, newPassword: string) => void;
  loading?: boolean;
  /** Error from the API (e.g. "Current password is incorrect"). */
  error?: string | null;
  /**
   * Ends the session from this screen. Without it the user is trapped: they
   * are authenticated, so every other route bounces them back here, and this
   * screen sits outside AppLayout so it has no header or sidebar to log out
   * from. That matters most on a shared device.
   */
  onLogout: () => void;
}

/**
 * Forced password change for a user still holding the temporary password that
 * was emailed to them at account creation. Unlike `/reset-password` — which is
 * unauthenticated and token-based — the user here is already signed in, so the
 * temp password itself is the proof of identity.
 */
export function FirstLoginPage({
  email,
  onSubmit,
  loading = false,
  error = null,
  onLogout,
}: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setValidationError(null);
    if (!currentPassword || !password || !confirmPassword) {
      setValidationError('Please fill in every field.');
      return;
    }
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }
    if (password === currentPassword) {
      setValidationError('Your new password must differ from the temporary one.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    onSubmit(currentPassword, password);
  };

  const displayError = validationError ?? error;

  return (
    <AuthShell>
      <h1 className="font-bold mb-1 text-[26px] tracking-[-0.02em] text-foreground">
        Set Your Password
      </h1>
      <p className="text-sm text-muted-foreground mb-7">
        {email
          ? `Before you continue, choose a password for ${email}.`
          : 'Before you continue, replace the temporary password you were emailed.'}
      </p>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <PasswordField
          id="current-password"
          label="Temporary Password"
          icon={KeyRound}
          autoComplete="current-password"
          placeholder="The password we emailed you"
          value={currentPassword}
          onChange={setCurrentPassword}
          disabled={loading}
        />
        <PasswordField
          id="new-password"
          label="New Password"
          icon={Lock}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          disabled={loading}
        />
        <PasswordField
          id="confirm-password"
          label="Confirm New Password"
          icon={Lock}
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={loading}
        />

        {displayError && (
          <p role="alert" className="text-2sm text-danger">
            {displayError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-control py-3 font-bold text-[15px] bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.3)] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Saving…' : 'Set Password & Continue'}
        </button>
      </form>

      <p className="text-center mt-6">
        <button
          type="button"
          onClick={onLogout}
          disabled={loading}
          className="inline-flex items-center gap-1.5 hover:underline text-xs text-primary disabled:opacity-60"
        >
          <LogOut className="w-3.5 h-3.5" />
          Not you? Log out
        </button>
      </p>
    </AuthShell>
  );
}

function PasswordField({
  id,
  label,
  icon: Icon,
  autoComplete,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  autoComplete: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block mb-1.5 text-xs font-medium text-foreground/80">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-control border border-input bg-input-background text-sm pl-9 pr-10 py-2.5 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-60"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
