'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Wrench, Search } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { AddVendorDialog } from './AddVendorDialog';
import { toast } from 'sonner';
import {
  ApiError,
  getVendors,
  getAssets,
  getCurrentRepair,
  sendToRepair,
  updateRepair,
} from '@/lib/api';
import type { AssetDetail, AssetListItem, VendorListItem, Vendor, AssetStatus } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

// Accepts either the full detail shape or the lighter list item shape.
type AssetLike = Pick<AssetDetail | AssetListItem, 'id' | 'name' | 'status'>;

interface Props {
  /** When omitted (e.g. opened from the Under Repair list), the drawer shows an asset picker. */
  asset?: AssetLike;
  /**
   * 'create' (default) sends an asset to repair; 'edit' loads the asset's active
   * repair record so its vendor/reason can be updated.
   */
  mode?: 'create' | 'edit';
  onClose: () => void;
  /** Passed the refreshed asset when a new repair is created; called with no arg on edit. */
  onSaved: (updated?: AssetDetail) => void;
}

const inputClass =
  'w-full rounded-control border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary';

// Statuses that can't be sent to repair (already out, retired, or lost).
const PICKER_EXCLUDE: AssetStatus[] = ['Under Repair', 'Retired', 'Lost/Stolen'];

export function SendToRepairDrawer({ asset, mode = 'create', onClose, onSaved }: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState<VendorListItem | null>(null);
  const [reason, setReason] = useState('');
  const [repairId, setRepairId] = useState<string | null>(null);
  const [prefilling, setPrefilling] = useState(mode === 'edit');

  const [showAddVendor, setShowAddVendor] = useState(false);
  const [saving, setSaving] = useState(false);

  // Asset picker (only when no asset was passed in, e.g. from the Under Repair list).
  const needsAssetPicker = !asset;
  const [assetSearch, setAssetSearch] = useState('');
  const [debouncedAssetSearch, setDebouncedAssetSearch] = useState('');
  const [assetOptions, setAssetOptions] = useState<AssetListItem[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [pickedAsset, setPickedAsset] = useState<AssetListItem | null>(null);
  const activeAsset = asset ?? pickedAsset;

  // Debounce the vendor search input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Debounce the asset search input.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAssetSearch(assetSearch), 300);
    return () => clearTimeout(t);
  }, [assetSearch]);

  // Load selectable assets (eligible statuses only) while picking.
  useEffect(() => {
    if (!needsAssetPicker || pickedAsset) return;
    let cancelled = false;
    setLoadingAssets(true);
    getAssets({
      search: debouncedAssetSearch || undefined,
      excludeStatus: PICKER_EXCLUDE,
      sortBy: 'name',
      sortOrder: 'ASC',
      limit: 20,
    })
      .then((res) => { if (!cancelled) setAssetOptions(res.data); })
      .catch(() => { if (!cancelled) setAssetOptions([]); })
      .finally(() => { if (!cancelled) setLoadingAssets(false); });
    return () => { cancelled = true; };
  }, [needsAssetPicker, pickedAsset, debouncedAssetSearch]);

  // Load vendors (paginated, searchable).
  useEffect(() => {
    let cancelled = false;
    setLoadingVendors(true);
    getVendors({ search: debouncedSearch || undefined, sortBy: 'name', sortOrder: 'ASC', limit: 50 })
      .then((res) => {
        if (cancelled) return;
        setVendors(res.data);
      })
      .catch(() => {
        if (cancelled) return;
        setVendors([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingVendors(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  // Edit mode: prefill from the asset's active repair record.
  useEffect(() => {
    if (mode !== 'edit' || !asset) return;
    let cancelled = false;
    getCurrentRepair(asset.id)
      .then((repair) => {
        if (cancelled || !repair) return;
        setRepairId(repair.id);
        setSelectedVendor(repair.vendor);
        setReason(repair.reason);
      })
      .catch(() => {
        /* fall through to an empty form */
      })
      .finally(() => {
        if (!cancelled) setPrefilling(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, asset?.id]);

  const handleVendorCreated = (vendor: Vendor) => {
    const item: VendorListItem = {
      id: vendor.id,
      name: vendor.name,
      contactPerson: vendor.contactPerson,
      contact: vendor.contact,
    };
    setVendors((prev) => (prev.some((v) => v.id === item.id) ? prev : [item, ...prev]));
    setSelectedVendor(item);
  };

  const canSubmit = !!activeAsset && !!selectedVendor && reason.trim().length > 0 && !saving && !prefilling;

  const handleSubmit = async () => {
    if (!activeAsset || !selectedVendor || !reason.trim()) return;
    setSaving(true);
    try {
      if (repairId) {
        await updateRepair(activeAsset.id, repairId, {
          vendorId: selectedVendor.id,
          reason: reason.trim(),
        });
        toast.success('Repair details updated.');
        onSaved();
      } else {
        const updated = await sendToRepair(activeAsset.id, {
          vendorId: selectedVendor.id,
          reason: reason.trim(),
        });
        toast.success(`"${activeAsset.name}" sent to repair.`);
        onSaved(updated);
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send to repair.');
    } finally {
      setSaving(false);
    }
  };

  const isEdit = mode === 'edit';

  const { closing, requestClose } = useDrawerAnimation(onClose);
  return (
    <OverlayPortal>
      <div
        className={`fixed inset-0 z-40 bg-scrim backdrop-blur-[2px] ${closing ? 'motion-safe:animate-overlay-out' : 'motion-safe:animate-overlay-in'}`}
        onClick={requestClose}
      />
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[520px] bg-card text-card-foreground shadow-drawer rounded-l-[16px] ${closing ? 'motion-safe:animate-drawer-out' : 'motion-safe:animate-drawer-in'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">
              {isEdit ? 'Repair Details' : 'Send to Repair'}
            </h2>
            <p className="text-2sm text-muted-foreground mt-0.5">
              {isEdit
                ? 'Update the service vendor and reason for repair'
                : 'Select a vendor and note the reason for repair'}
            </p>
          </div>
          <button
            onClick={requestClose}
            className="rounded-control p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Asset — fixed identity, selected chip, or picker */}
          {asset ? (
            <div className="rounded-lg p-4 bg-muted/60 border border-border">
              <div className="micro-label mb-1">Asset</div>
              <div className="font-semibold text-base text-foreground">{asset.name}</div>
            </div>
          ) : pickedAsset ? (
            <div className="rounded-lg p-4 bg-muted/60 border border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="micro-label mb-1">Asset</div>
                  <div className="font-semibold text-base text-foreground truncate">{pickedAsset.name}</div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {pickedAsset.displayId} · {pickedAsset.serialNumber}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPickedAsset(null)}
                  className="shrink-0 text-2sm font-medium text-primary transition-opacity hover:opacity-80"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="font-semibold mb-3 pb-2 text-sm text-foreground border-b border-border/60">
                Select Asset <span className="text-danger">*</span>
              </div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                <input
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search by name, ID, or serial…"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
                {assetOptions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setPickedAsset(a)}
                    className="w-full text-left rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">{a.name}</div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {a.displayId} · {a.serialNumber}
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  </button>
                ))}
                {!loadingAssets && assetOptions.length === 0 && (
                  <p className="text-2sm text-muted-foreground text-center py-4">
                    No eligible assets found.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Service Vendor — selected chip, or search + list picker */}
          <div>
            <div className="font-semibold mb-3 pb-2 text-sm text-foreground border-b border-border/60">
              Service Vendor <span className="text-danger">*</span>
            </div>
            {selectedVendor ? (
              <div className="rounded-lg p-4 bg-muted/60 border border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">{selectedVendor.name}</div>
                    {(selectedVendor.contactPerson || selectedVendor.contact) && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {[selectedVendor.contactPerson, selectedVendor.contact].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedVendor(null)}
                    className="shrink-0 text-2sm font-medium text-primary transition-opacity hover:opacity-80"
                  >
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search vendors by name…"
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <div className="max-h-[240px] overflow-y-auto space-y-2 pr-1">
                  {vendors.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVendor(v)}
                      className="w-full text-left rounded-lg border border-border px-4 py-3 transition-colors hover:bg-muted/60"
                    >
                      <div className="font-semibold text-sm text-foreground">{v.name}</div>
                      {(v.contactPerson || v.contact) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[v.contactPerson, v.contact].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </button>
                  ))}

                  {!loadingVendors && vendors.length === 0 && (
                    <p className="text-2sm text-muted-foreground text-center py-4">
                      No vendors found.
                    </p>
                  )}

                  {/* Add New Vendor */}
                  <button
                    type="button"
                    onClick={() => setShowAddVendor(true)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4" /> Add New Vendor
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Reason for Repair */}
          <div>
            <div className="font-semibold mb-3 pb-2 text-sm text-foreground border-b border-border/60">
              Reason for Repair <span className="text-danger">*</span>
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Describe the issue…"
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-bl-[16px]">
          <button
            onClick={requestClose}
            className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            <Wrench className="w-4 h-4" />
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Send to Repair'}
          </button>
        </div>
      </div>

      {showAddVendor && (
        <AddVendorDialog
          onCreated={handleVendorCreated}
          onClose={() => setShowAddVendor(false)}
        />
      )}
    </OverlayPortal>
  );
}
