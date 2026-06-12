'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/features/auth/auth-shell';

interface Props {
  onSubmit: (newPassword: string) => void;
  loading?: boolean;
  error?: string | null;
  success?: boolean;
  invalidToken?: boolean;
}

export function ResetPasswordPage({
  onSubmit,
  loading = false,
  error = null,
  success = false,
  invalidToken = false,
}: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success || invalidToken) return;

    setValidationError(null);
    if (!password || !confirmPassword) {
      setValidationError('Please enter and confirm your new password.');
      return;
    }
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    onSubmit(password);
  };

  const displayError = validationError ?? error;

  return (
    <AuthShell>
      <h1 className="font-bold mb-1 text-[26px] tracking-[-0.02em] text-foreground">
        Reset Password
      </h1>
      <p className="text-sm text-muted-foreground mb-7">
        Choose a new password for your OAMS account.
      </p>

      {invalidToken ? (
        <div className="text-center py-4">
          <p className="text-sm text-danger leading-relaxed mb-6">
            This reset link is invalid or missing. Please request a new password reset.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 hover:underline text-sm text-primary"
          >
            Request new reset link
          </Link>
        </div>
      ) : success ? (
        <div className="text-center py-4">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success" />
          <p className="text-[15px] text-foreground mb-2 font-medium">
            Password updated
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-control py-3 px-6 font-bold text-[15px] bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.3)] transition-all hover:opacity-90 active:scale-[0.99]"
          >
            Go to login
          </Link>
        </div>
      ) : (
        <>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="new-password"
                className="block mb-1.5 text-xs font-medium text-foreground/80"
              >
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <input
                  id="new-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-control border border-input bg-input-background text-sm pl-9 pr-10 py-2.5 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-60"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block mb-1.5 text-xs font-medium text-foreground/80"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-control border border-input bg-input-background text-sm pl-9 pr-10 py-2.5 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-60"
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

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
              {loading ? 'Updating…' : 'Reset Password'}
            </button>
          </form>

          <p className="text-center mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 hover:underline text-xs text-primary"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to login
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  );
}
