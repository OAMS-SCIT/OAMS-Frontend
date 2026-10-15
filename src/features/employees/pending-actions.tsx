'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, PackageCheck, RefreshCw, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ApiError, getMyPendingActions } from '@/lib/api';
import type { AssignmentType, MyPendingActions, PendingActionItem } from '@/types';
import { AssetDeclarationDrawer } from '@/components/overlays/AssetDeclarationDrawer';

/**
 * The dashboard's Pending Actions widget (OAMS-246): the handovers the employee
 * still has to confirm, in two sections, Receipt Confirmation Pending (newly
 * assigned, OAMS-251) and Handback Confirmation Pending (returned from repair,
 * OAMS-252). Each item opens the same confirmation panel in place, and the
 * widget reloads afterwards so a confirmed item disappears immediately.
 */
export function PendingActions({ onConfirmed }: { onConfirmed?: () => void }) {
  const [data, setData] = useState<MyPendingActions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<{ assetId: string; type: AssignmentType } | null>(null);

  // Version counter + deferred setState, matching the dashboard loader.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setError(null);
        return getMyPendingActions();
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load your pending actions.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  const total = (data?.receipt.length ?? 0) + (data?.handback.length ?? 0);

  return (
    <div className="rounded-2xl p-5 mb-6 bg-card border border-border shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardCheck className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-base tracking-[-0.01em] text-foreground">Pending Actions</h2>
        {total > 0 && (
          <span className="inline-flex items-center justify-center rounded-full min-w-5 h-5 px-1.5 text-2xs font-semibold bg-warning-surface text-warning-foreground">
            {total}
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-6 text-center text-2sm text-muted-foreground">Loading pending actions…</div>
      ) : error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-2sm bg-danger-surface text-danger-foreground border border-danger/30">
          <span>{error}</span>
          <button
            onClick={reload}
            className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : total === 0 ? (
        <div className="flex items-center gap-3 rounded-lg px-4 py-4 bg-success-surface/60 border border-success/20">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-success-foreground" />
          <div>
            <div className="font-medium text-2sm text-foreground">No pending actions</div>
            <div className="text-xs text-muted-foreground">You&apos;re all caught up. Nothing needs your confirmation.</div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <ActionSection
            icon={PackageCheck}
            title="Receipt Confirmation Pending"
            hint="Newly assigned assets awaiting your acknowledgement."
            items={data?.receipt ?? []}
            actionLabel="Review & Accept"
            onReview={(item) => setOpen({ assetId: item.asset.id, type: 'General' })}
          />
          <ActionSection
            icon={Wrench}
            title="Handback Confirmation Pending"
            hint="Assets returned from repair awaiting your condition check."
            items={data?.handback ?? []}
            actionLabel="Review & Confirm"
            onReview={(item) => setOpen({ assetId: item.asset.id, type: 'Handback' })}
          />
        </div>
      )}

      {open && (
        <AssetDeclarationDrawer
          assetId={open.assetId}
          assignmentType={open.type}
          onClose={() => setOpen(null)}
          onConfirmed={() => {
            reload();
            onConfirmed?.();
          }}
        />
      )}
    </div>
  );
}

function ActionSection({
  icon: Icon,
  title,
  hint,
  items,
  actionLabel,
  onReview,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  items: PendingActionItem[];
  actionLabel: string;
  onReview: (item: PendingActionItem) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-warning-foreground" />
        <h3 className="font-semibold text-2sm text-foreground">{title}</h3>
        <span className="ml-auto text-2xs font-medium text-muted-foreground nums">{items.length}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">{hint}</p>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground/80">Nothing pending.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.assignmentId}
              className="flex items-center justify-between gap-3 rounded-control px-3 py-2 bg-card border border-border"
            >
              <div className="min-w-0">
                <div className="font-medium text-2sm text-foreground truncate" title={item.asset.name}>
                  {item.asset.name}
                </div>
                <div className="text-2xs text-muted-foreground font-mono">
                  {item.asset.displayId} · {item.assignmentDate}
                </div>
              </div>
              <button
                onClick={() => onReview(item)}
                className="shrink-0 rounded-control px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                {actionLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
