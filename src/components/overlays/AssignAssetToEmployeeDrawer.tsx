'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { toast } from 'sonner';
import { ApiError, createAssignment, getAsset, getAssets } from '@/lib/api';
import type { AssetCustomAttributeValue, AssetListItem } from '@/types';
import { DatePicker } from '@/components/ui/DatePicker';
import { StatusBadge, ConditionBadge } from '@/components/ui/StatusBadge';

// Only the employee fields this panel needs to display.
interface EmployeeLike {
  id: string;
  firstName: string;
  lastName: string;
  designationName?: string | null;
}

interface Props {
  employee: EmployeeLike;
  onClose: () => void;
  /** Called after the assignment is created so the parent can refresh its lists. */
  onAssigned: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

/**
 * Employee-first counterpart to AssignAssetDrawer: the employee is fixed and the
 * admin picks an Available asset to hand over. Used from the Employee Full
 * Profile view's "Assign New Asset" action.
 */
export function AssignAssetToEmployeeDrawer({ employee, onClose, onAssigned }: Props) {
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [assignmentDate, setAssignmentDate] = useState(today());
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Custom attributes are fetched on demand (they aren't in the list payload),
  // only when the admin expands the specs section for the selected asset.
  const [showSpecs, setShowSpecs] = useState(false);
  const [specs, setSpecs] = useState<AssetCustomAttributeValue[] | null>(null);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [specsError, setSpecsError] = useState<string | null>(null);

  // Only Available assets can be assigned.
  useEffect(() => {
    getAssets({ status: 'Available', limit: 100 })
      .then((result) => setAssets(result.data))
      .catch((err) =>
        setAssetsError(err instanceof Error ? err.message : 'Failed to load available assets.'),
      )
      .finally(() => setAssetsLoading(false));
  }, []);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = assets.find((a) => a.id === selectedAssetId) ?? null;
  const q = search.toLowerCase();
  const filtered = assets.filter((a) =>
    `${a.name} ${a.displayId} ${a.serialNumber}`.toLowerCase().includes(q),
  );

  // Reset the on-demand specs whenever the chosen asset changes.
  const resetSpecs = () => {
    setShowSpecs(false);
    setSpecs(null);
    setSpecsError(null);
  };

  const selectAsset = (a: AssetListItem) => {
    setSelectedAssetId(a.id);
    setErrors((prev) => ({ ...prev, asset: '' }));
    setSearch('');
    setDropdownOpen(false);
    resetSpecs();
  };

  const clearAsset = () => {
    setSelectedAssetId('');
    setSearch('');
    resetSpecs();
  };

  const toggleSpecs = async () => {
    if (showSpecs) {
      setShowSpecs(false);
      return;
    }
    setShowSpecs(true);
    // Fetch once per selected asset; cached in state thereafter.
    if (specs === null && !specsLoading) {
      setSpecsLoading(true);
      setSpecsError(null);
      try {
        const detail = await getAsset(selectedAssetId);
        setSpecs(detail.customAttributes ?? []);
      } catch (err) {
        setSpecsError(err instanceof ApiError ? err.message : 'Failed to load specifications.');
      } finally {
        setSpecsLoading(false);
      }
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!selectedAssetId) e.asset = 'Please select an asset';
    if (!assignmentDate) e.assignmentDate = 'Assignment date is required';
    if (expectedReturn && expectedReturn < assignmentDate) {
      e.expectedReturn = 'Expected return cannot be before the assignment date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await createAssignment({
        assetId: selectedAssetId,
        assigneeId: employee.id,
        assignmentDate,
        expectedReturnDate: expectedReturn || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(`Asset assigned to ${employee.firstName} ${employee.lastName}.`);
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to assign asset.');
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
          <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">Assign New Asset</h2>
          <button onClick={requestClose} className="rounded-control p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Employee receiving the asset */}
          <div className="rounded-lg p-4 bg-muted/60 border border-border">
            <div className="micro-label mb-1.5">
              Assigning To
            </div>
            <div className="font-semibold text-base text-foreground">{employee.firstName} {employee.lastName}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {employee.designationName ?? '—'}
            </div>
          </div>

          {/* Asset selector */}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-foreground/80">
              Select Asset <span className="text-danger">*</span>
            </label>
            <div ref={dropdownRef} className="relative">
              {assetsLoading ? (
                <div className="rounded-control border border-input px-3 py-2.5 text-2sm text-muted-foreground/80">
                  Loading available assets…
                </div>
              ) : assetsError ? (
                <div className="rounded-control border border-danger px-3 py-2.5 text-xs text-danger">
                  {assetsError}
                </div>
              ) : selected ? (
                <div className="rounded-lg border border-primary/40 bg-secondary/50 overflow-hidden motion-safe:animate-pop-in">
                  <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border/60">
                    <div className="min-w-0">
                      <div className="font-semibold text-2sm text-foreground truncate">{selected.name}</div>
                      <div className="text-2xs text-muted-foreground font-mono mt-0.5">{selected.displayId}</div>
                    </div>
                    <button onClick={clearAsset}
                      className="shrink-0 flex items-center gap-1 rounded-control px-2 py-1 text-2xs font-medium text-primary transition-colors hover:bg-primary/10">
                      <X className="w-3.5 h-3.5" /> Change
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-3">
                    <PreviewField label="Serial Number" value={selected.serialNumber} mono />
                    <PreviewField label="Category" value={selected.category?.name ?? '—'} />
                    <PreviewField label="Brand / Model" value={`${selected.brand} ${selected.model}`.trim() || '—'} />
                    <PreviewField label="Location" value={selected.location || '—'} />
                    <div className="flex flex-col gap-1">
                      <span className="micro-label">Condition</span>
                      <span><ConditionBadge condition={selected.condition} /></span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="micro-label">Status</span>
                      <span><StatusBadge status={selected.status} /></span>
                    </div>
                  </div>

                  {/* On-demand custom attributes */}
                  <div className="border-t border-border/60">
                    <button type="button" onClick={toggleSpecs}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-2xs font-medium text-primary transition-colors hover:bg-primary/5">
                      <span>{showSpecs ? 'Hide specifications' : 'View specifications'}</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSpecs ? 'rotate-180' : ''}`} />
                    </button>
                    {showSpecs && (
                      <div className="px-4 pb-3">
                        {specsLoading ? (
                          <div className="py-1.5 text-2xs text-muted-foreground">Loading specifications…</div>
                        ) : specsError ? (
                          <div className="py-1.5 text-2xs text-danger">{specsError}</div>
                        ) : specs && specs.filter((s) => s.value).length > 0 ? (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3 max-h-40 overflow-y-auto pr-1">
                            {specs.filter((s) => s.value).map((s) => (
                              <PreviewField key={s.attributeId} label={s.label} value={s.value} />
                            ))}
                          </div>
                        ) : (
                          <div className="py-1.5 text-2xs text-muted-foreground">No custom attributes for this asset.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground/70" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder="Search by name, asset ID, or serial…"
                    className={`w-full rounded-control border bg-input-background text-2sm text-foreground pl-9 pr-8 py-2.5 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 ${
                      errors.asset ? 'border-danger' : 'border-input focus:border-ring'
                    }`}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground/70" />
                </div>
              )}

              {dropdownOpen && !selected && (
                <div className="absolute w-full z-10 rounded-xl mt-1 overflow-hidden overflow-y-auto max-h-[220px] bg-popover border border-border shadow-pop motion-safe:animate-pop-in">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-3 text-2sm text-muted-foreground/80">No available assets found</div>
                  ) : (
                    filtered.map((a) => (
                      <button key={a.id}
                        className="w-full text-left px-4 py-2.5 transition-colors hover:bg-muted"
                        onMouseDown={(ev) => { ev.preventDefault(); selectAsset(a); }}>
                        <div className="font-medium text-2sm text-foreground">{a.name}</div>
                        <div className="text-2xs text-muted-foreground font-mono">{a.displayId} · {a.serialNumber}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {errors.asset && <p className="text-xs text-danger mt-1">{errors.asset}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-foreground/80">
                Assignment Date <span className="text-danger">*</span>
              </label>
              <DatePicker value={assignmentDate} onChange={(v) => setAssignmentDate(v)}
                ariaLabel="Assignment Date"
                className={`w-full ${errors.assignmentDate ? 'border-danger' : ''}`} />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium text-foreground/80">
                Expected Return <span className="text-muted-foreground/70">(Optional)</span>
              </label>
              <DatePicker value={expectedReturn} onChange={(v) => setExpectedReturn(v)}
                ariaLabel="Expected Return"
                className={`w-full ${errors.expectedReturn ? 'border-danger' : ''}`} />
              {errors.expectedReturn && <p className="text-xs text-danger mt-1">{errors.expectedReturn}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-foreground/80">
              Assignment Notes <span className="text-muted-foreground/70">(Optional)</span>
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Add any handover notes, accessories included, etc."
              className="w-full rounded-control border border-input bg-input-background text-2sm text-foreground px-3 py-2 placeholder:text-muted-foreground/60 resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-bl-[16px]">
          <button onClick={requestClose} className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
            {saving ? 'Assigning…' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}

function PreviewField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="micro-label">{label}</span>
      <span className={`text-2sm text-foreground truncate ${mono ? 'font-mono' : ''}`} title={value}>{value}</span>
    </div>
  );
}
