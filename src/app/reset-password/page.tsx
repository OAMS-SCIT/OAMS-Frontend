'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResetPasswordPage } from '@/features/auth/reset-password-page';
import { useAuth } from '@/providers/auth-provider';
import { ApiError, resetPasswordWithToken } from '@/lib/api';
import { landingPathFor } from '@/lib/routes';

function ResetPasswordRoutePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { status, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && user) {
      router.replace(landingPathFor(user));
    }
  }, [status, user, router]);

  const handleSubmit = async (newPassword: string) => {
    setError(null);
    setLoading(true);
    try {
      await resetPasswordWithToken(token, newPassword);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 400
            ? 'This reset link is invalid or has expired. Please request a new one.'
            : err.message,
        );
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ResetPasswordPage
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      success={success}
      invalidToken={!token}
    />
  );
}

export default function ResetPasswordPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordRoutePage />
    </Suspense>
  );
}
