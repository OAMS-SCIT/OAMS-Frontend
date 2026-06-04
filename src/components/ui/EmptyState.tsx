'use client';

import { Package, Users, ClipboardList, History, Monitor } from 'lucide-react';
import { ReactNode } from 'react';

const ICONS: Record<string, typeof Package> = {
  assets: Package,
  users: Users,
  assignments: ClipboardList,
  history: History,
  myassets: Monitor,
};

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'assets', title, subtitle, action }: EmptyStateProps) {
  const Icon = ICONS[icon] || Package;
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="rounded-2xl p-5 mb-4" style={{ background: '#F1F5F9' }}>
        <Icon className="w-10 h-10" style={{ color: '#CBD5E1' }} />
      </div>
      <div className="font-semibold mb-1.5" style={{ fontSize: 16, color: '#1E293B' }}>{title}</div>
      <div className="text-center max-w-xs mb-5" style={{ fontSize: 13, color: '#94A3B8' }}>{subtitle}</div>
      {action}
    </div>
  );
}
