'use client';

import { Dashboard } from '@/features/dashboard/dashboard';
import { useApp } from '@/providers/app-provider';

export default function AdminDashboardPage() {
  const { assets } = useApp();
  return <Dashboard assets={assets} />;
}
