'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ForgotPasswordPage } from '@/features/auth/forgot-password-page';
import { useAuth } from '@/providers/auth-provider';
import { ApiError, requestForgotPassword } from '@/lib/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordRoutePage() {
  const router = useRouter();
  const { status } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/admin/dashboard');
    }
  }, [status, router]);

  const handleSubmit = async (email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await requestForgotPassword(trimmedEmail);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ForgotPasswordPage
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitted={submitted}
    />
  );
}
