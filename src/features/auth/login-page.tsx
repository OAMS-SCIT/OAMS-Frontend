'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { AuthShell } from '@/features/auth/auth-shell';

interface Props {
  /** Called when the user submits valid-looking credentials. */
  onSubmit: (email: string, password: string) => void;
  /** True while the login request is in flight; disables the form. */
  loading?: boolean;
  /** Error message to show beneath the form (validation or API failure). */
  error?: string | null;
}

export function LoginPage({ onSubmit, loading = false, error = null }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    onSubmit(email, password);
  };

  return (
    <AuthShell>
      <h1 className="font-bold mb-1 text-[26px] tracking-[-0.02em] text-foreground">
        Welcome Back
      </h1>
      <p className="text-sm text-muted-foreground mb-7">Sign in to OAMS</p>

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
              placeholder="you@company.com"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="password"
            className="block mb-1.5 text-xs font-medium text-foreground/80"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              className="w-full rounded-control border border-input bg-input-background text-sm pl-9 pr-10 py-2.5 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-60"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex justify-end mt-1.5">
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
            >
              Forgot Password?
            </Link>
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
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </AuthShell>
  );
}
