'use client';

import { useRouter } from 'next/navigation';
import { PersonalProfile } from '@/features/profile/personal-profile';
import { currentEmployeeUser } from '@/lib/mock-data';
import { useApp } from '@/providers/app-provider';

export default function EmployeeProfilePage() {
  const router = useRouter();
  const { logout } = useApp();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return <PersonalProfile user={currentEmployeeUser} onLogout={handleLogout} />;
}
