'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthShell } from '@/features/auth/auth-shell';

interface Props {
  onSubmit: (email: string) => void;
  loading?: boolean;
  error?: string | null;
  submitted?: boolean;
}

export function ForgotPasswordPage({
  onSubmit,
  loading = false,
  error = null,
  submitted = false,
}: Props) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || submitted) return;
    onSubmit(email);
  };

  return (
    <AuthShell>
      <h1 className="font-bold mb-1" style={{ fontSize: 26, color: '#1E293B' }}>
        Forgot Password?
      </h1>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>
        Enter your registered email and we&apos;ll send you a reset link.
      </p>

      {submitted ? (
        <div className="text-center py-4">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: '#16A34A' }} />
          <p style={{ fontSize: 15, color: '#1E293B', marginBottom: 8, fontWeight: 500 }}>
            Check your email
          </p>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
            If that email is registered, a password reset link has been sent. The link expires in
            1 hour.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 hover:underline"
            style={{ fontSize: 14, color: '#3B82F6' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      ) : (
        <>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="email"
                className="block mb-1.5"
                style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: '#94A3B8' }}
                />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 disabled:opacity-60"
                  style={{ borderColor: '#CBD5E1', fontSize: 14 }}
                  placeholder="admin@company.com"
                />
              </div>
            </div>

            {error && (
              <p role="alert" style={{ fontSize: 13, color: '#EF4444' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-3 font-bold text-white hover:opacity-90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ fontSize: 15, background: '#1E3A8A' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Sending…' : 'Send Reset Link'}
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
