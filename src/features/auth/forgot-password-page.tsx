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
      <h1 className="font-bold mb-1 text-[26px] tracking-[-0.02em] text-foreground">
        Forgot Password?
      </h1>
      <p className="text-sm text-muted-foreground mb-7">
        Enter your registered email and we&apos;ll send you a reset link.
      </p>

      {submitted ? (
        <div className="text-center py-4">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success" />
          <p className="text-[15px] text-foreground mb-2 font-medium">
            Check your email
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            If that email is registered, a password reset link has been sent. The link expires in
            1 hour.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 hover:underline text-sm text-primary"
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
                className="block mb-1.5 text-xs font-medium text-foreground/80"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-control border border-input bg-input-background text-sm pl-9 pr-3 py-2.5 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-60"
                  placeholder="admin@company.com"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-2sm text-danger">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-control py-3 font-bold text-[15px] bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.3)] transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Sending…' : 'Send Reset Link'}
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
