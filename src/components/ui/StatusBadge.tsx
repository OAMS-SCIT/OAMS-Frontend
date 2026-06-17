'use client';

import { AssetStatus } from '@/types';

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  'Available': { badge: 'bg-success-surface text-success-foreground', dot: 'bg-success' },
  'Assigned': { badge: 'bg-info-surface text-info-foreground', dot: 'bg-info' },
  'Under Repair': { badge: 'bg-warning-surface text-warning-foreground', dot: 'bg-warning' },
  'Reserved': { badge: 'bg-purple-surface text-purple-foreground', dot: 'bg-purple' },
  'Lost/Stolen': { badge: 'bg-danger-surface text-danger-foreground', dot: 'bg-danger' },
  'Retired': { badge: 'bg-neutral-surface text-neutral-foreground', dot: 'bg-neutral' },
  'Active': { badge: 'bg-success-surface text-success-foreground', dot: 'bg-success' },
  'Inactive': { badge: 'bg-neutral-surface text-neutral-foreground', dot: 'bg-neutral' },
  'Admin': { badge: 'bg-secondary text-secondary-foreground', dot: 'bg-primary' },
  'Employee': { badge: 'bg-info-surface text-info-foreground', dot: 'bg-info' },
};

const FALLBACK_STYLE = { badge: 'bg-neutral-surface text-neutral-foreground', dot: 'bg-neutral' };

const SIZE_STYLES = {
  sm: { badge: 'text-2xs px-2 py-[2px]', dot: 'w-1.5 h-1.5' },
  md: { badge: 'text-xs px-2.5 py-[3px]', dot: 'w-1.5 h-1.5' },
  lg: { badge: 'text-2sm px-3 py-[5px]', dot: 'w-2 h-2' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || FALLBACK_STYLE;
  const sizing = SIZE_STYLES[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap ${style.badge} ${sizing.badge}`}
    >
      <span className={`rounded-full shrink-0 ${style.dot} ${sizing.dot}`} />
      {status}
    </span>
  );
}

export function ConditionBadge({ condition }: { condition: string }) {
  const styles: Record<string, string> = {
    'New': 'bg-success-surface text-success-foreground',
    'Good': 'bg-info-surface text-info-foreground',
    'Fair': 'bg-warning-surface text-warning-foreground',
    'Poor': 'bg-danger-surface text-danger-foreground',
  };
  const s = styles[condition] || 'bg-neutral-surface text-neutral-foreground';
  return (
    <span className={`inline-flex items-center font-medium rounded-full text-2xs px-2.5 py-[2px] ${s}`}>
      {condition}
    </span>
  );
}
