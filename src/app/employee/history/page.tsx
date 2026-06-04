'use client';

import { EmployeeHistory } from '@/features/employees/employee-history';
import { currentEmployeeUser } from '@/lib/mock-data';
import { useApp } from '@/providers/app-provider';

export default function EmployeeHistoryPage() {
  const { assets } = useApp();
  return <EmployeeHistory assets={assets} employeeId={currentEmployeeUser.id} />;
}
