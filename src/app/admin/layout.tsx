'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { RequireAuth } from '@/components/auth/require-auth';
import { useAuth } from '@/providers/auth-provider';

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuth();

  return (
    <RequireAuth>
      <AppLayout role="admin" onLogout={logout}>
        {children}
      </AppLayout>
    </RequireAuth>
  );
}
