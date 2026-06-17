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
      <div className="rounded-2xl p-5 mb-4 bg-muted">
        <Icon className="w-10 h-10 text-muted-foreground/50" />
      </div>
      <div className="font-semibold mb-1.5 text-base text-foreground">{title}</div>
      <div className="text-center max-w-xs mb-5 text-2sm text-muted-foreground/80">{subtitle}</div>
      {action}
    </div>
  );
}
