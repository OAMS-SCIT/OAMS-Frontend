'use client';

import { useRouter } from 'next/navigation';
import { PersonalProfile } from '@/features/profile/personal-profile';
import { currentEmployeeUser } from '@/lib/mock-data';
import { useApp } from '@/providers/app-provider';
import type { ProfileUser } from '@/types';

// OAMS-50: design pass only. The employee profile is out of scope for the
// admin-focused OAMS-17 story and remains backed by mock data + stub handlers.
const mockProfile: ProfileUser = {
  id: currentEmployeeUser.id,
  firstName: currentEmployeeUser.firstName,
  lastName: currentEmployeeUser.lastName,
  email: currentEmployeeUser.email,
  contactNumber: currentEmployeeUser.contactNumber,
  designation: currentEmployeeUser.designationId
    ? { id: currentEmployeeUser.designationId, name: currentEmployeeUser.designationTitle }
    : null,
  role: currentEmployeeUser.role,
  status: currentEmployeeUser.status,
  profilePicture: null,
  isFirstLogin: false,
  createdAt: new Date().toISOString(),
};

export default function EmployeeProfilePage() {
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
