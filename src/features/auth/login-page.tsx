'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { AuthShell } from '@/features/auth/auth-shell';

interface Props {
  /** Called when the admin submits valid-looking credentials. */
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
      <h1 className="font-bold mb-1" style={{ fontSize: 26, color: '#1E293B' }}>
        Welcome Back
      </h1>
      <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>Sign in to OAMS Admin</p>

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
        <div>
          <label
            htmlFor="password"
            className="block mb-1.5"
            style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}
          >
            Password
          </label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: '#94A3B8' }}
            />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border pl-9 pr-10 py-2.5 focus:outline-none focus:ring-2 disabled:opacity-60"
              style={{ borderColor: '#CBD5E1', fontSize: 14 }}
              placeholder="••••••••"
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
          <div className="flex justify-end mt-1.5">
            <Link
              href="/forgot-password"
              style={{ fontSize: 12, color: '#3B82F6' }}
              className="hover:underline"
            >
              Forgot Password?
            </Link>
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
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>

      <p className="text-center mt-8" style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
        Only authorized administrators may access this system.
      </p>
    </AuthShell>
  );
}
