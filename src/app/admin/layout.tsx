'use client';

import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { useApp } from '@/providers/app-provider';

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { setRole, logout } = useApp();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <AppLayout role="admin" onRoleSwitch={setRole} onLogout={handleLogout}>
      {children}
    </AppLayout>
  );
}
