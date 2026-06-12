'use client';

import { format, formatDistanceToNow } from 'date-fns';
import {
  PlusCircle,
  Pencil,
  ArrowLeftRight,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import type {
  AssetEventType,
  AssetHistoryEntry,
  AssetHistoryChangeEntry,
  AssetHistoryStatusChange,
  AssetHistoryAssignedChange,
  AssetHistoryReturnedChange,
} from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

// ── Event metadata ────────────────────────────────────────────────────────────

const EVENT_META: Record<
  AssetEventType,
  { label: (changes: AssetHistoryEntry['changes']) => string; Icon: React.ElementType; iconBg: string; iconColor: string }
> = {
  created: {
    label: () => 'Asset Created',
    Icon: PlusCircle,
    iconBg: '#ECFDF5',
    iconColor: '#059669',
  },
  updated: {
    label: () => 'Asset Updated',
    Icon: Pencil,
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
  },
  status_changed: {
    label: () => 'Status Changed',
    Icon: ArrowLeftRight,
    iconBg: '#FFFBEB',
    iconColor: '#D97706',
  },
  assigned: {
    label: (changes) => {
      const c = changes as AssetHistoryAssignedChange | null;
      return c?.assignedTo ? `Assigned to ${c.assignedTo}` : 'Asset Assigned';
    },
    Icon: UserPlus,
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
  },
  returned: {
    label: (changes) => {
      const c = changes as AssetHistoryReturnedChange | null;
      return c?.returnedFrom ? `Returned from ${c.returnedFrom}` : 'Asset Returned';
    },
    Icon: UserMinus,
    iconBg: '#FEF2F2',
    iconColor: '#DC2626',
  },
};

// ── Change detail renderers ───────────────────────────────────────────────────

function FieldChangesDetail({ changes }: { changes: AssetHistoryChangeEntry[] }) {
  if (changes.length === 0) return null;
  return (
    <div className="mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid #F1F5F9' }}>
      {changes.map((c, i) => (
        <div
          key={c.field}
          className="flex items-center gap-2 px-3 py-1.5"
          style={{
            fontSize: 12,
            background: i % 2 === 0 ? '#F8FAFC' : '#fff',
            borderBottom: i < changes.length - 1 ? '1px solid #F1F5F9' : undefined,
          }}
        >
          <span style={{ color: '#94A3B8', minWidth: 120, fontWeight: 600, textTransform: 'capitalize' }}>
            {c.field.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          <span style={{ color: '#EF4444', textDecoration: 'line-through', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.oldValue !== null && c.oldValue !== undefined ? String(c.oldValue) : '—'}
          </span>
          <span style={{ color: '#94A3B8', fontSize: 10 }}>→</span>
          <span style={{ color: '#10B981', fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {c.newValue !== null && c.newValue !== undefined ? String(c.newValue) : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusChangeDetail({ changes }: { changes: AssetHistoryStatusChange }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <StatusBadge status={changes.oldStatus} size="sm" />
      <span style={{ fontSize: 12, color: '#94A3B8' }}>→</span>
      <StatusBadge status={changes.newStatus} size="sm" />
    </div>
  );
}

// ── Timestamp ─────────────────────────────────────────────────────────────────

function Timestamp({ date }: { date: string }) {
  const d = new Date(date);
  const relative = formatDistanceToNow(d, { addSuffix: true });
  const absolute = format(d, "dd MMM yyyy 'at' HH:mm");

  return (
    <span
      title={absolute}
      style={{ fontSize: 11, color: '#94A3B8', cursor: 'default', whiteSpace: 'nowrap' }}
    >
      {relative}
    </span>
  );
}

// ── Single event row ──────────────────────────────────────────────────────────

function HistoryEventRow({ entry, isLast }: { entry: AssetHistoryEntry; isLast: boolean }) {
  const meta = EVENT_META[entry.eventType] ?? EVENT_META.updated;
  const { Icon, iconBg, iconColor } = meta;
  const label = meta.label(entry.changes);

  const isUpdated = entry.eventType === 'updated';
  const isStatusChanged = entry.eventType === 'status_changed';

  return (
    <div className="flex gap-4">
      {/* Timeline spine + icon */}
      <div className="flex flex-col items-center" style={{ width: 32, flexShrink: 0 }}>
        <div
          className="flex items-center justify-center rounded-full shrink-0"
          style={{ width: 32, height: 32, background: iconBg }}
        >
          <Icon style={{ width: 15, height: 15, color: iconColor }} />
        </div>
        {/* Vertical connector — omitted for last item */}
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: '#F1F5F9', marginTop: 4, minHeight: 24 }} />
        )}
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{label}</span>
          <Timestamp date={entry.createdAt} />
        </div>
        <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
          by <span style={{ fontWeight: 500, color: '#475569' }}>{entry.performedBy.name}</span>
        </div>

        {/* Inline change details */}
        {isUpdated && Array.isArray(entry.changes) && entry.changes.length > 0 && (
          <FieldChangesDetail changes={entry.changes as AssetHistoryChangeEntry[]} />
        )}
        {isStatusChanged && entry.changes && !Array.isArray(entry.changes) && (
          <StatusChangeDetail changes={entry.changes as AssetHistoryStatusChange} />
        )}
      </div>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function HistorySkeleton() {
  return (
    <div className="px-6 py-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4 mb-6">
          <div className="flex flex-col items-center" style={{ width: 32 }}>
            <div
              className="rounded-full animate-pulse"
              style={{ width: 32, height: 32, background: '#F1F5F9' }}
            />
            {i < 3 && <div style={{ width: 2, height: 40, background: '#F1F5F9', marginTop: 4 }} />}
          </div>
          <div className="flex-1 pt-1">
            <div className="animate-pulse rounded" style={{ height: 13, width: '40%', background: '#F1F5F9', marginBottom: 8 }} />
            <div className="animate-pulse rounded" style={{ height: 11, width: '25%', background: '#F1F5F9' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function HistoryEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6" style={{ textAlign: 'center' }}>
      <div
        className="flex items-center justify-center rounded-full mb-4"
        style={{ width: 48, height: 48, background: '#F8FAFC', border: '1px solid #E2E8F0' }}
      >
        <ArrowLeftRight style={{ width: 20, height: 20, color: '#CBD5E1' }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', marginBottom: 4 }}>
        No history recorded yet
      </p>
      <p style={{ fontSize: 13, color: '#94A3B8', maxWidth: 320 }}>
        Actions on this asset will appear here.
      </p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function HistoryError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 px-6">
      <p style={{ fontSize: 13, color: '#EF4444' }}>{message}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AssetHistoryTimelineProps {
  entries: AssetHistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

export function AssetHistoryTimeline({ entries, isLoading, error }: AssetHistoryTimelineProps) {
  if (isLoading) return <HistorySkeleton />;
  if (error) return <HistoryError message={error} />;
  if (entries.length === 0) return <HistoryEmpty />;

  return (
    <div className="px-6 py-5">
      {entries.map((entry, i) => (
        <HistoryEventRow key={entry.id} entry={entry} isLast={i === entries.length - 1} />
      ))}
    </div>
  );
}
