'use client';

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  PlusCircle,
  Pencil,
  ArrowLeftRight,
  UserPlus,
  UserMinus,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import type {
  AssetEventType,
  AssetHistoryEntry,
  AssetHistoryChangeEntry,
  AssetHistoryStatusChange,
  AssetHistoryAssignedChange,
  AssetHistoryReturnedChange,
  ConditionImageItem,
} from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ImageLightbox } from '@/components/overlays/ImageLightbox';
import { getAssignmentConditionImages } from '@/lib/api';

// ── Event metadata ────────────────────────────────────────────────────────────

const EVENT_META: Record<
  AssetEventType,
  { label: (changes: AssetHistoryEntry['changes']) => string; Icon: React.ElementType; iconBg: string; iconColor: string }
> = {
  created: {
    label: () => 'Asset Created',
    Icon: PlusCircle,
    iconBg: 'bg-success-surface',
    iconColor: 'text-success-foreground',
  },
  updated: {
    label: () => 'Asset Updated',
    Icon: Pencil,
    iconBg: 'bg-info-surface',
    iconColor: 'text-info-foreground',
  },
  status_changed: {
    label: () => 'Status Changed',
    Icon: ArrowLeftRight,
    iconBg: 'bg-warning-surface',
    iconColor: 'text-warning-foreground',
  },
  assigned: {
    label: (changes) => {
      const c = changes as AssetHistoryAssignedChange | null;
      return c?.assignedTo ? `Assigned to ${c.assignedTo}` : 'Asset Assigned';
    },
    Icon: UserPlus,
    iconBg: 'bg-purple-surface',
    iconColor: 'text-purple-foreground',
  },
  returned: {
    label: (changes) => {
      const c = changes as AssetHistoryReturnedChange | null;
      return c?.returnedFrom ? `Returned from ${c.returnedFrom}` : 'Asset Returned';
    },
    Icon: UserMinus,
    iconBg: 'bg-danger-surface',
    iconColor: 'text-danger-foreground',
  },
};

// ── Change detail renderers ───────────────────────────────────────────────────

function FieldChangesDetail({ changes }: { changes: AssetHistoryChangeEntry[] }) {
  if (changes.length === 0) return null;
  return (
    <div className="mt-2 rounded-control overflow-hidden border border-border/60">
      {changes.map((c, i) => (
        <div
          key={c.field}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs ${i % 2 === 0 ? 'bg-muted/40' : 'bg-card'} ${
            i < changes.length - 1 ? 'border-b border-border/60' : ''
          }`}
        >
          <span className="text-muted-foreground/80 min-w-[120px] font-semibold capitalize">
            {c.field.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          <span className="text-danger line-through max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">
            {c.oldValue !== null && c.oldValue !== undefined ? String(c.oldValue) : '—'}
          </span>
          <span className="text-muted-foreground/80 text-[10px]">→</span>
          <span className="text-success-foreground font-medium max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">
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
      <span className="text-xs text-muted-foreground/80">→</span>
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
      className="text-2xs text-muted-foreground/80 cursor-default whitespace-nowrap"
    >
      {relative}
    </span>
  );
}

// ── View Images button (OAMS-257) ─────────────────────────────────────────────

function ViewConditionImagesButton({
  assignmentId,
  imageType,
}: {
  assignmentId: string;
  imageType: 'assigned' | 'returned';
}) {
  const [images, setImages] = useState<ConditionImageItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleClick = async () => {
    if (images) {
      // Already fetched — open lightbox directly.
      setLightboxIndex(0);
      setLightboxOpen(true);
      return;
    }
    setLoading(true);
    try {
      const result = await getAssignmentConditionImages(assignmentId);
      const imgs = imageType === 'assigned' ? result.assigned : result.returned;
      setImages(imgs);
      if (imgs.length > 0) {
        setLightboxIndex(0);
        setLightboxOpen(true);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="mt-2 flex items-center gap-1.5 rounded-control border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ImageIcon className="w-3 h-3" />
        )}
        View Images
      </button>
      {lightboxOpen && images && images.length > 0 && (
        <ImageLightbox
          images={images.map((img) => ({ id: img.id, url: img.url }))}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxOpen(false)}
          title={imageType === 'assigned' ? 'Condition at Assignment' : 'Condition at Return'}
        />
      )}
    </>
  );
}

// ── Single event row ──────────────────────────────────────────────────────────

function HistoryEventRow({ entry, isLast }: { entry: AssetHistoryEntry; isLast: boolean }) {
  const meta = EVENT_META[entry.eventType] ?? EVENT_META.updated;
  const { Icon, iconBg, iconColor } = meta;
  const label = meta.label(entry.changes);

  const isUpdated = entry.eventType === 'updated';
  const isStatusChanged = entry.eventType === 'status_changed';

  // OAMS-257: Extract assignmentId from changes for assigned/returned events.
  const isAssigned = entry.eventType === 'assigned';
  const isReturned = entry.eventType === 'returned';
  const assignmentId =
    (isAssigned || isReturned)
      ? (entry.changes as AssetHistoryAssignedChange | AssetHistoryReturnedChange | null)?.assignmentId
      : undefined;

  return (
    <div className="flex gap-4">
      {/* Timeline spine + icon */}
      <div className="flex flex-col items-center w-8 shrink-0">
        <div className={`flex items-center justify-center rounded-full shrink-0 w-8 h-8 ${iconBg}`}>
          <Icon className={`w-[15px] h-[15px] ${iconColor}`} />
        </div>
        {/* Vertical connector — omitted for last item */}
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border/80 mt-1 min-h-6" />
        )}
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <span className="text-2sm font-semibold text-foreground">{label}</span>
          <Timestamp date={entry.createdAt} />
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          by <span className="font-medium text-foreground/70">{entry.performedBy.name}</span>
        </div>

        {/* Inline change details */}
        {isUpdated && Array.isArray(entry.changes) && entry.changes.length > 0 && (
          <FieldChangesDetail changes={entry.changes as AssetHistoryChangeEntry[]} />
        )}
        {isStatusChanged && entry.changes && !Array.isArray(entry.changes) && (
          <StatusChangeDetail changes={entry.changes as AssetHistoryStatusChange} />
        )}

        {/* OAMS-257: View condition images for assigned/returned events */}
        {assignmentId && (
          <ViewConditionImagesButton
            assignmentId={assignmentId}
            imageType={isAssigned ? 'assigned' : 'returned'}
          />
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
          <div className="flex flex-col items-center w-8">
            <div className="rounded-full skeleton w-8 h-8" />
            {i < 3 && <div className="w-0.5 h-10 bg-muted mt-1" />}
          </div>
          <div className="flex-1 pt-1">
            <div className="skeleton rounded-sm h-[13px] w-2/5 mb-2" />
            <div className="skeleton rounded-sm h-[11px] w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function HistoryEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="flex items-center justify-center rounded-full mb-4 w-12 h-12 bg-muted border border-border">
        <ArrowLeftRight className="w-5 h-5 text-muted-foreground/50" />
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">
        No history recorded yet
      </p>
      <p className="text-2sm text-muted-foreground/80 max-w-80">
        Actions on this asset will appear here.
      </p>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function HistoryError({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 px-6">
      <p className="text-2sm text-danger">{message}</p>
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
