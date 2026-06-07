'use client';

import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { useApp } from '@/providers/app-provider';

export default function EmployeePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { logout } = useApp();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <AppLayout role="employee" onLogout={handleLogout}>
      {children}
    </AppLayout>
  );
}
