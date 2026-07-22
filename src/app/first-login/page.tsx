'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FirstLoginPage } from '@/features/auth/first-login-page';
import { RequireAuth } from '@/components/auth/require-auth';
import { useAuth } from '@/providers/auth-provider';
import { ApiError, resetMyPassword } from '@/lib/api';
import { landingPathFor } from '@/lib/routes';

function FirstLoginRoute() {
  const router = useRouter();
  const { user, refresh, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing to do here for a user who has already set their own password —
  // e.g. they bookmarked this URL, or landed here after a successful change.
  useEffect(() => {
    if (user && !user.isFirstLogin) {
      router.replace(landingPathFor(user));
    }
  }, [user, router]);

  const handleSubmit = async (currentPassword: string, newPassword: string) => {
    setError(null);
    setLoading(true);
    try {
      await resetMyPassword({ currentPassword, newPassword });
      // The backend clears isFirstLogin on success; re-read the profile so the
      // redirect below (and the route guards) see the updated flag.
      await refresh();
      // Keep the button disabled through the redirect — no setLoading(false).
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401 || err.status === 400
            ? 'That temporary password is incorrect.'
            : err.message,
        );
      } else {
        setError('Something went wrong. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <FirstLoginPage
      email={user?.email}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      onLogout={() => {
        void logout();
      }}
    />
  );
}

export default function FirstLoginRoutePage() {
  return (
    <RequireAuth>
      <FirstLoginRoute />
    </RequireAuth>
  );
}
