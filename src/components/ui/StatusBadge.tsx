'use client';

import { AssetStatus } from '@/types';

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  'Available': { bg: '#ECFDF5', color: '#059669', dot: '#10B981' },
  'Assigned': { bg: '#EFF6FF', color: '#2563EB', dot: '#3B82F6' },
  'Under Repair': { bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  'Reserved': { bg: '#F5F3FF', color: '#7C3AED', dot: '#8B5CF6' },
  'Lost/Stolen': { bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' },
  'Retired': { bg: '#F8FAFC', color: '#64748B', dot: '#94A3B8' },
  'Active': { bg: '#ECFDF5', color: '#059669', dot: '#22C55E' },
  'Inactive': { bg: '#F8FAFC', color: '#64748B', dot: '#94A3B8' },
  'Admin': { bg: '#EFF6FF', color: '#1E3A8A', dot: '#1E3A8A' },
  'Employee': { bg: '#EFF6FF', color: '#2563EB', dot: '#3B82F6' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || { bg: '#F1F5F9', color: '#475569', dot: '#94A3B8' };
  const padding = size === 'lg' ? '5px 12px' : size === 'md' ? '3px 10px' : '2px 8px';
  const fontSize = size === 'lg' ? 13 : size === 'md' ? 12 : 11;
  const dotSize = size === 'lg' ? 8 : 6;

  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap"
      style={{ background: style.bg, color: style.color, padding, fontSize }}
    >
      <span className="rounded-full shrink-0" style={{ width: dotSize, height: dotSize, background: style.dot }} />
      {status}
    </span>
  );
}

export function ConditionBadge({ condition }: { condition: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    'New': { bg: '#ECFDF5', color: '#059669' },
    'Good': { bg: '#EFF6FF', color: '#2563EB' },
    'Fair': { bg: '#FFFBEB', color: '#D97706' },
    'Poor': { bg: '#FEF2F2', color: '#DC2626' },
  };
  const s = styles[condition] || { bg: '#F1F5F9', color: '#475569' };
  return (
    <span className="inline-flex items-center font-medium rounded-full" style={{ background: s.bg, color: s.color, padding: '2px 10px', fontSize: 11 }}>
      {condition}
    </span>
  );
}
