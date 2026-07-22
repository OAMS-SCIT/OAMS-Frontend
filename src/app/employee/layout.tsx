'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { RequireAuth } from '@/components/auth/require-auth';
import { useAuth } from '@/providers/auth-provider';

export default function EmployeePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuth();

  return (
    <RequireAuth role="Employee">
      <AppLayout role="employee" onLogout={logout}>
        {children}
      </AppLayout>
    </RequireAuth>
  );
}
