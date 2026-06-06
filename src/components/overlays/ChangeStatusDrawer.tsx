'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, updateAssetStatus } from '@/lib/api';
import type { AssetDetail, AssetListItem, ManualAssetStatus } from '@/types';

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

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,36,96,0.45)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col" style={{ width: 520, background: '#fff', boxShadow: '-8px 0 32px rgba(0,0,0,0.14)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>Change Asset Status</h2>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Update the current status of this asset</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Asset identity */}
          <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              Asset
            </div>
            <div className="font-semibold" style={{ fontSize: 16, color: '#1E293B' }}>{asset.name}</div>
          </div>

          {/* Status selector */}
          <div>
            <div className="font-semibold mb-3 pb-2" style={{ fontSize: 14, color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>
              Status
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                Asset Status <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value as ManualAssetStatus)}
                style={{
                  width: '100%',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: '#1E293B',
                  background: '#fff',
                  outline: 'none',
                  appearance: 'none',
                }}
              >
                {MANUAL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                "Assigned" status is managed automatically by the Assignment module.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <button onClick={onClose} className="rounded-lg border px-5 py-2.5 font-medium transition-colors hover:bg-gray-50"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="rounded-lg px-5 py-2.5 font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ fontSize: 14, background: '#1E3A8A' }}
          >
            {saving ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </>
  );
}
