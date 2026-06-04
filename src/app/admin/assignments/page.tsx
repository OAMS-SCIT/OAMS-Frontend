'use client';

import { ActiveAssignments } from '@/features/assignments/active-assignments';
import { useApp } from '@/providers/app-provider';

export default function AdminAssignmentsPage() {
  const { assets, returnAsset } = useApp();
  return <ActiveAssignments assets={assets} onReturnAsset={returnAsset} />;
}
