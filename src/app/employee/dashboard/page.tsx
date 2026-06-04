'use client';

import { EmployeeDashboard } from '@/features/employees/employee-dashboard';
import { currentEmployeeUser } from '@/lib/mock-data';
import { useApp } from '@/providers/app-provider';

export default function EmployeeDashboardPage() {
  const { assets } = useApp();
  const employeeName = `${currentEmployeeUser.firstName} ${currentEmployeeUser.lastName}`;

  return (
    <EmployeeDashboard
      assets={assets}
      employeeName={employeeName}
      employeeId={currentEmployeeUser.id}
    />
  );
}
