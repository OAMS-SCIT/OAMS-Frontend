'use client';

import { UserManagement } from '@/features/users/user-management';
import { useApp } from '@/providers/app-provider';

export default function AdminDesignationsPage() {
  const { users, addUser, toggleUserStatus } = useApp();
  return (
    <UserManagement
      users={users}
      onAddUser={addUser}
      onToggleUserStatus={toggleUserStatus}
    />
  );
}
