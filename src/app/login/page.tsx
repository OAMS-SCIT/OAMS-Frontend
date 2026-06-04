'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginPage } from '@/features/auth/login-page';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginRoutePage() {
  const router = useRouter();
  const { status, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in (e.g. navigated back to /login) — go to the dashboard.
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/admin/dashboard');
    }
  }, [status, router]);

  const handleSubmit = async (email: string, password: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await login(trimmedEmail, password);
      router.replace('/admin/dashboard');
      // Keep the button disabled through the redirect — no setLoading(false).
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? 'Invalid email or password.' : err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  return <LoginPage onSubmit={handleSubmit} loading={loading} error={error} />;
}
