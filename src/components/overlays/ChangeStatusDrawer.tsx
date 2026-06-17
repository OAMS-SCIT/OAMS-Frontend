'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { toast } from 'sonner';
import { ApiError, updateAssetStatus } from '@/lib/api';
import type { AssetDetail, AssetListItem, ManualAssetStatus } from '@/types';
import { Select } from '@/components/ui/Select';

// Accepts either the full detail shape or the lighter list item shape
type AssetLike = Pick<AssetDetail | AssetListItem, 'id' | 'name' | 'status'>;

interface Props {
  asset: AssetLike;
  onClose: () => void;
  /** Called with the updated asset detail after a successful save. */
  onSaved: (updated: AssetDetail) => void;
}

// Assigned is excluded — it is set by the Assignment module only
const MANUAL_STATUSES: ManualAssetStatus[] = [
  'Available',
  'Under Repair',
  'Reserved',
  'Lost/Stolen',
  'Retired',
];

export function ChangeStatusDrawer({ asset, onClose, onSaved }: Props) {
  const currentStatus = asset.status as ManualAssetStatus;
  const [selected, setSelected] = useState<ManualAssetStatus>(
    MANUAL_STATUSES.includes(currentStatus) ? currentStatus : 'Available',
  );
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (selected === asset.status) { onClose(); return; }
    setSaving(true);
    try {
      const updated = await updateAssetStatus(asset.id, selected);
      toast.success(`Status updated to "${selected}".`);
      onSaved(updated);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const { closing, requestClose } = useDrawerAnimation(onClose);
  return (
    <OverlayPortal>
      <div className={`fixed inset-0 z-40 bg-scrim backdrop-blur-[2px] ${closing ? 'motion-safe:animate-overlay-out' : 'motion-safe:animate-overlay-in'}`} onClick={requestClose} />
      <div className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[520px] bg-card text-card-foreground shadow-drawer rounded-l-[16px] ${closing ? 'motion-safe:animate-drawer-out' : 'motion-safe:animate-drawer-in'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">Change Asset Status</h2>
            <p className="text-2sm text-muted-foreground mt-0.5">Update the current status of this asset</p>
          </div>
          <button onClick={requestClose} className="rounded-control p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Asset identity */}
          <div className="rounded-lg p-4 bg-muted/60 border border-border">
            <div className="micro-label mb-1">
              Asset
            </div>
            <div className="font-semibold text-base text-foreground">{asset.name}</div>
          </div>

          {/* Status selector */}
          <div>
            <div className="font-semibold mb-3 pb-2 text-sm text-foreground border-b border-border/60">
              Status
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium text-foreground/80">
                Asset Status <span className="text-danger">*</span>
              </label>
              <Select
                value={selected}
                onValueChange={(v) => setSelected(v as ManualAssetStatus)}
                ariaLabel="Asset Status"
                className="w-full"
                options={MANUAL_STATUSES.map((s) => ({ value: s, label: s }))}
              />
              <p className="text-2xs text-muted-foreground/80 mt-1.5">
                "Assigned" status is managed automatically by the Assignment module.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-bl-[16px]">
          <button onClick={requestClose} className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}
