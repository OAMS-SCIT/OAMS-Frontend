'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Link2Off, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import type { AssetDetail, LinkedAssetRef } from '@/types';
import { unlinkAccessory, unlinkParent, ApiError } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog';

interface LinkedAssetsTabProps {
  asset: AssetDetail;
  /** Bumps the parent page's asset version so the tab re-renders after a change. */
  onChanged: () => void;
}

/** Shared styling for the inline row action, matching the Warranties tab. */
const actionClass =
  'flex items-center gap-1 rounded-sm px-2 py-1 text-xs transition-colors hover:bg-secondary';

/** What the confirm dialog is about to unlink. */
type PendingUnlink =
  | { kind: 'parent'; ref: LinkedAssetRef }
  | { kind: 'accessory'; ref: LinkedAssetRef };

function LinkedRow({
  item,
  onUnlink,
}: {
  item: LinkedAssetRef;
  onUnlink: () => void;
}) {
  return (
    <>
      <td className="px-4 py-3 text-2sm font-mono text-foreground/80 whitespace-nowrap">
        {item.displayId}
      </td>
      <td className="px-4 py-3 text-2sm text-foreground/80 max-w-[240px] whitespace-normal">
        {item.name}
      </td>
      <td className="px-4 py-3 text-2sm text-muted-foreground whitespace-nowrap">
        {item.categoryName || '—'}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={item.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Link href={`/admin/inventory/${item.id}`} className={`${actionClass} text-primary`}>
            <ArrowUpRight className="w-3 h-3" /> View
          </Link>
          <button onClick={onUnlink} className={`${actionClass} text-danger`}>
            <Link2Off className="w-3 h-3" /> Unlink
          </button>
        </div>
      </td>
    </>
  );
}

function LinkedTable({
  caption,
  rows,
  onUnlink,
}: {
  caption: string;
  rows: LinkedAssetRef[];
  onUnlink: (item: LinkedAssetRef) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">{caption}</h3>
      <div className="overflow-x-auto rounded-control border border-border">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {['Asset ID', 'Asset Name', 'Asset Type', 'Status', 'Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 micro-label whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item, i) => (
              <tr
                key={item.id}
                className={`border-b border-border/60 last:border-b-0 ${
                  i % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                }`}
              >
                <LinkedRow item={item} onUnlink={() => onUnlink(item)} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Linked Accessories tab (OAMS-282) — shows the parent asset from an
 * accessory's side and the accessory list from a parent's side, with
 * click-through to each linked asset and an unlink action on every row.
 *
 * Renders straight from the already-loaded asset detail (which carries
 * `parentAsset` and `accessories`) rather than fetching again, and asks the
 * page to refresh after an unlink.
 */
export function LinkedAssetsTab({ asset, onChanged }: LinkedAssetsTabProps) {
  const [pending, setPending] = useState<PendingUnlink | null>(null);
  const [working, setWorking] = useState(false);

  const parent = asset.parentAsset;
  const accessories = asset.accessories ?? [];

  const confirmUnlink = async () => {
    if (!pending || working) return;
    setWorking(true);
    try {
      if (pending.kind === 'parent') {
        await unlinkParent(asset.id);
        toast.success(`Unlinked from ${pending.ref.displayId}.`);
      } else {
        await unlinkAccessory(asset.id, pending.ref.id);
        toast.success(`${pending.ref.displayId} unlinked.`);
      }
      setPending(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to unlink the asset.');
    } finally {
      setWorking(false);
    }
  };

  if (!parent && accessories.length === 0) {
    return (
      <EmptyState
        icon="assets"
        title="No linked assets"
        subtitle="This asset is not linked to a main asset and has no accessories attached. Use Edit Asset to link one."
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {parent && (
        <LinkedTable
          caption="Parent asset"
          rows={[parent]}
          onUnlink={(ref) => setPending({ kind: 'parent', ref })}
        />
      )}

      {accessories.length > 0 && (
        <LinkedTable
          caption={`Linked accessories (${accessories.length})`}
          rows={accessories}
          onUnlink={(ref) => setPending({ kind: 'accessory', ref })}
        />
      )}

      {pending && (
        <ConfirmDialog
          title="Unlink asset?"
          description={
            pending.kind === 'parent'
              ? `${asset.displayId} will no longer be linked as an accessory of ${pending.ref.displayId}. Both assets are kept — only the link is removed.`
              : `${pending.ref.displayId} will no longer be linked as an accessory of ${asset.displayId}. Both assets are kept — only the link is removed.`
          }
          confirmLabel="Unlink"
          onConfirm={confirmUnlink}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
