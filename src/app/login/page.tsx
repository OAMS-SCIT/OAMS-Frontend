'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginPage } from '@/features/auth/login-page';
import { useAuth } from '@/providers/auth-provider';
import { ApiError } from '@/lib/api';
import { landingPathFor } from '@/lib/routes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginRoutePage() {
  const router = useRouter();
  const { status, user, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in (e.g. navigated back to /login) — go to their portal.
  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(landingPathFor(user));
    }
  }, [status, user, router]);

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
      const authUser = await login(trimmedEmail, password);
      router.replace(landingPathFor(authUser));
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
