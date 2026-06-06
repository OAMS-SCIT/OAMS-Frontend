'use client';

import { useRouter } from 'next/navigation';
import { PersonalProfile } from '@/features/profile/personal-profile';
import { currentAdminUser } from '@/lib/mock-data';
import { useApp } from '@/providers/app-provider';
import type { ProfileUser } from '@/types';

// OAMS-50: design pass — renders the redesigned profile against the real
// ProfileUser shape using mock data + stub handlers. OAMS-53 replaces this
// with useAuth() + the /profile APIs.
const mockProfile: ProfileUser = {
  id: currentAdminUser.id,
  firstName: currentAdminUser.firstName,
  lastName: currentAdminUser.lastName,
  email: currentAdminUser.email,
  contactNumber: currentAdminUser.contactNumber,
  designation: currentAdminUser.designationId
    ? { id: currentAdminUser.designationId, name: currentAdminUser.designationTitle }
    : null,
  role: currentAdminUser.role,
  status: currentAdminUser.status,
  profilePicture: null,
  isFirstLogin: false,
  createdAt: new Date().toISOString(),
};

export default function AdminProfilePage() {
  const router = useRouter();
  const { logout } = useApp();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <PersonalProfile
      key={mockProfile.id}
      user={mockProfile}
      onSave={async () => {}}
      onResetPassword={async () => {}}
      onUploadPicture={async () => {}}
      onLogout={handleLogout}
    />
  );
}
