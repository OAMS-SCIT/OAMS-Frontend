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
      <h1 className="font-bold mb-1" style={{ fontSize: 26, color: '#1E293B' }}>
        Reset Password
      </h1>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>
        Choose a new password for your OAMS account.
      </p>

      {invalidToken ? (
        <div className="text-center py-4">
          <p style={{ fontSize: 14, color: '#EF4444', lineHeight: 1.6, marginBottom: 24 }}>
            This reset link is invalid or missing. Please request a new password reset.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 hover:underline"
            style={{ fontSize: 14, color: '#3B82F6' }}
          >
            Request new reset link
          </Link>
        </div>
      ) : success ? (
        <div className="text-center py-4">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: '#16A34A' }} />
          <p style={{ fontSize: 15, color: '#1E293B', marginBottom: 8, fontWeight: 500 }}>
            Password updated
          </p>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-lg py-3 px-6 font-bold text-white hover:opacity-90"
            style={{ fontSize: 15, background: '#1E3A8A' }}
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
                className="block mb-1.5"
                style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}
              >
                New Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: '#94A3B8' }}
                />
                <input
                  id="new-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border pl-9 pr-10 py-2.5 focus:outline-none focus:ring-2 disabled:opacity-60"
                  style={{ borderColor: '#CBD5E1', fontSize: 14 }}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#94A3B8' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block mb-1.5"
                style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: '#94A3B8' }}
                />
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border pl-9 pr-10 py-2.5 focus:outline-none focus:ring-2 disabled:opacity-60"
                  style={{ borderColor: '#CBD5E1', fontSize: 14 }}
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#94A3B8' }}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {displayError && (
              <p role="alert" style={{ fontSize: 13, color: '#EF4444' }}>
                {displayError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-3 font-bold text-white hover:opacity-90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ fontSize: 15, background: '#1E3A8A' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Updating…' : 'Reset Password'}
            </button>
          </form>

          <p className="text-center mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 hover:underline"
              style={{ fontSize: 12, color: '#3B82F6' }}
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
