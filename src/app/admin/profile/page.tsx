'use client';

import { useRouter } from 'next/navigation';
import { PersonalProfile } from '@/features/profile/personal-profile';
import { currentAdminUser } from '@/lib/mock-data';
import { useApp } from '@/providers/app-provider';

export default function AdminProfilePage() {
  const router = useRouter();
  const { logout } = useApp();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return <PersonalProfile user={currentAdminUser} onLogout={handleLogout} />;
}
