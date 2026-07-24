'use client';

import { useEffect, useState } from 'react';
import {
  X, Plus, Trash2, Upload, Wrench, ArrowRight, ArrowLeft, Check,
  Search, FileText, ImageIcon, Store,
} from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { AddVendorDialog } from './AddVendorDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from 'sonner';
import {
  ApiError,
  getAsset,
  getCurrentRepair,
  getActiveAssignment,
  getCategory,
  getVendors,
  completeRepairReturn,
  rerouteRepair,
  retireFromRepair,
  uploadRepairInvoice,
  uploadRepairWarrantyDoc,
  uploadConditionImages,
} from '@/lib/api';
import type {
  AssetDetail, Assignment, AttributeDetail, VendorListItem, Vendor,
  RepairOutcome, RepairCostItemType, RepairCostItemInput, AttributeValuePayload,
} from '@/types';
import { addMonths, format, parseISO } from 'date-fns';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { ImageUploadZone } from '@/components/ui/ImageUploadZone';
import type { UploadedImage } from '@/components/ui/ImageUploadZone';

interface Props {
  assetId: string;
  onClose: () => void;
  /** Called after the return is fully processed so the parent can refresh. */
  onDone: () => void;
}

const today = () => new Date().toISOString().split('T')[0];
const ITEM_TYPES: RepairCostItemType[] = ['Replace', 'Upgrade', 'Repair', 'Service Charge', 'Other'];
const inputClass =
  'w-full rounded-control border border-input bg-input-background text-2sm text-foreground px-3 py-2 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring';

interface CostRow {
  itemName: string;
  itemType: RepairCostItemType;
  cost: string;
  hasWarranty: boolean;
  warrantyStartDate: string;
  warrantyExpiryDate: string;
  /** UI-only helper — number of months; auto-fills expiry. Never persisted. */
  warrantyMonths: string;
}

const emptyRow = (): CostRow => ({
  itemName: '', itemType: 'Repair', cost: '', hasWarranty: false,
  warrantyStartDate: '', warrantyExpiryDate: '', warrantyMonths: '',
});

/** start (yyyy-MM-dd) + N months → expiry (yyyy-MM-dd); '' when either is missing/invalid. */
function expiryFromMonths(start: string, months: number): string {
  if (!start || !months || months <= 0) return '';
  try {
    return format(addMonths(parseISO(start), months), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

const WARRANTY_PRESETS = [6, 12, 24];

export function ReturnFromRepairDrawer({ assetId, onClose, onDone }: Props) {
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [repairId, setRepairId] = useState<string | null>(null);
  const [repairReason, setRepairReason] = useState<string | null>(null);
  const [repairVendor, setRepairVendor] = useState<string | null>(null);
  const [repairSentAt, setRepairSentAt] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);

  const [outcome, setOutcome] = useState<RepairOutcome | null>(null);
  const [saving, setSaving] = useState(false);

  // Repaired flow
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [returnDate, setReturnDate] = useState(today());
  const [costRows, setCostRows] = useState<CostRow[]>([emptyRow()]);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [warrantyFile, setWarrantyFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<AttributeDetail[]>([]);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [assignmentAction, setAssignmentAction] = useState<'handback' | 'keep_in_store'>('keep_in_store');
  const [handbackImages, setHandbackImages] = useState<UploadedImage[]>([]);

  // Return without repair
  const [rwrReason, setRwrReason] = useState('');
  const [rwrAction, setRwrAction] = useState<'different_vendor' | 'return_as_is' | null>(null);
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorListItem | null>(null);
  const [newReason, setNewReason] = useState('');
  const [showAddVendor, setShowAddVendor] = useState(false);

  // Not repairable
  const [retireReason, setRetireReason] = useState('');
  const [showRetireConfirm, setShowRetireConfirm] = useState(false);

  // ── Load asset + repair + assignment ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Required: without the asset + open repair there is nothing to process.
        const [a, repair] = await Promise.all([getAsset(assetId), getCurrentRepair(assetId)]);
        if (cancelled) return;
        setAsset(a);
        setRepairId(repair?.id ?? null);
        setRepairReason(repair?.reason ?? null);
        setRepairVendor(repair?.vendor?.name ?? null);
        setRepairSentAt(repair?.sentAt ?? null);

        // Best-effort: an unassigned asset has no active assignment — a null (or
        // even a failed) response here just means "no assignee", it must not
        // block the form from loading.
        try {
          const active = await getActiveAssignment(assetId);
          if (!cancelled) {
            setAssignment(active);
            setAssignmentAction(active ? 'handback' : 'keep_in_store');
          }
        } catch {
          if (!cancelled) { setAssignment(null); setAssignmentAction('keep_in_store'); }
        }

        // Best-effort: category attributes for the spec-changes step.
        try {
          const cat = await getCategory(a.category.id);
          if (!cancelled) {
            setAttributes(cat.attributes.filter((at) => at.isActive));
            const values: Record<string, string> = {};
            for (const cv of a.customAttributes) values[cv.attributeId] = cv.value;
            setAttrValues(values);
          }
        } catch {
          /* leave attributes empty — the spec step will show "no custom specs" */
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : 'Failed to load repair.');
          onClose();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  // Load vendors when entering the "different vendor" branch.
  useEffect(() => {
    if (rwrAction !== 'different_vendor') return;
    let cancelled = false;
    getVendors({ search: vendorSearch || undefined, sortBy: 'name', sortOrder: 'ASC', limit: 50 })
      .then((res) => { if (!cancelled) setVendors(res.data); })
      .catch(() => { if (!cancelled) setVendors([]); });
    return () => { cancelled = true; };
  }, [rwrAction, vendorSearch]);

  const totalCost = costRows.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);

  const setRow = (i: number, patch: Partial<CostRow>) =>
    setCostRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // Warranty period helper: entering months (or a preset) auto-fills the expiry
  // from the start date; changing the start recomputes it while months is set.
  const setWarrantyMonths = (i: number, monthsStr: string) => {
    setCostRows((rows) =>
      rows.map((r, idx) => {
        if (idx !== i) return r;
        const expiry = expiryFromMonths(r.warrantyStartDate, parseInt(monthsStr, 10));
        return { ...r, warrantyMonths: monthsStr, ...(expiry ? { warrantyExpiryDate: expiry } : {}) };
      }),
    );
  };

  const setWarrantyStart = (i: number, start: string) => {
    setCostRows((rows) =>
      rows.map((r, idx) => {
        if (idx !== i) return r;
        const expiry = expiryFromMonths(start, parseInt(r.warrantyMonths, 10));
        return { ...r, warrantyStartDate: start, ...(expiry ? { warrantyExpiryDate: expiry } : {}) };
      }),
    );
  };

  const assigneeName = assignment
    ? `${assignment.assignee.firstName} ${assignment.assignee.lastName}`
    : null;

  // ── Validation ───────────────────────────────────────────────────────────
  const step1Valid = () => {
    if (costRows.length === 0) return false;
    for (const r of costRows) {
      if (!r.itemName.trim()) return false;
      if (!(parseFloat(r.cost) > 0)) return false;
      if (r.hasWarranty && r.warrantyStartDate && r.warrantyExpiryDate && r.warrantyExpiryDate < r.warrantyStartDate) {
        return false;
      }
    }
    return true;
  };

  const buildCostItems = (): RepairCostItemInput[] =>
    costRows.map((r) => ({
      itemName: r.itemName.trim(),
      itemType: r.itemType,
      cost: parseFloat(r.cost) || 0,
      hasWarranty: r.hasWarranty,
      warrantyStartDate: r.hasWarranty ? r.warrantyStartDate || undefined : undefined,
      warrantyExpiryDate: r.hasWarranty ? r.warrantyExpiryDate || undefined : undefined,
    }));

  const buildCustomAttributes = (): AttributeValuePayload[] | undefined =>
    attributes.length > 0
      ? attributes.map((at) => ({ attributeId: at.id, value: attrValues[at.id] ?? '' }))
      : undefined;

  // ── Submit handlers ──────────────────────────────────────────────────────
  const doUploadsAndFinish = async (successMsg: string) => {
    if (!repairId) return;
    if (invoiceFile) {
      try { await uploadRepairInvoice(assetId, repairId, invoiceFile); }
      catch { toast.error('Invoice upload failed — you can add it later.'); }
    }
    if (warrantyFile) {
      try { await uploadRepairWarrantyDoc(assetId, repairId, warrantyFile); }
      catch { toast.error('Warranty document upload failed — you can add it later.'); }
    }
    if (assignmentAction === 'handback' && handbackImages.length > 0) {
      // Handback created a NEW assignment (the old one was superseded) — attach the
      // condition images to the new active assignment, not the pre-repair one.
      try {
        const active = await getActiveAssignment(assetId);
        if (active) {
          await uploadConditionImages(active.id, handbackImages.map((i) => i.file), 'assigned');
        }
      } catch { toast.error('Condition images upload failed — you can add them later.'); }
    }
    toast.success(successMsg);
    onDone();
  };

  const handleCompleteRepaired = async () => {
    if (!repairId) return;
    setSaving(true);
    try {
      await completeRepairReturn(assetId, repairId, {
        outcome: 'Repaired',
        returnDate,
        costItems: buildCostItems(),
        customAttributes: buildCustomAttributes(),
        assignmentAction,
      });
      await doUploadsAndFinish('Asset return from repair processed successfully.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to process return.');
    } finally {
      setSaving(false);
    }
  };

  const handleReturnAsIs = async () => {
    if (!repairId) return;
    setSaving(true);
    try {
      await completeRepairReturn(assetId, repairId, {
        outcome: 'Return without Repair',
        returnDate: today(),
        reason: rwrReason.trim(),
        assignmentAction,
      });
      await doUploadsAndFinish('Asset return from repair processed successfully.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to process return.');
    } finally {
      setSaving(false);
    }
  };

  const handleReroute = async () => {
    if (!repairId || !selectedVendor) return;
    setSaving(true);
    try {
      await rerouteRepair(assetId, repairId, {
        reason: rwrReason.trim(),
        vendorId: selectedVendor.id,
        newReason: newReason.trim(),
      });
      toast.success('Asset routed to a different vendor.');
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to reroute repair.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetire = async () => {
    if (!repairId) return;
    setSaving(true);
    try {
      await retireFromRepair(assetId, repairId, { reason: retireReason.trim() });
      toast.success('Asset retired successfully.');
      onDone();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to retire asset.');
    } finally {
      setSaving(false);
      setShowRetireConfirm(false);
    }
  };

  // ── Header subtitle ──────────────────────────────────────────────────────
  const stepLabel = ['Repair Cost & Warranty', 'Documents', 'Spec Changes', 'Assignment'][step - 1];
  const subtitle =
    outcome === 'Repaired' ? `Step ${step} of 4 — ${stepLabel}`
    : outcome === 'Return without Repair' ? 'Return without Repair'
    : outcome === 'Not Repairable' ? 'Not Repairable'
    : 'Select the repair outcome';

  const { closing, requestClose } = useDrawerAnimation(onClose);

  return (
    <OverlayPortal>
      <div className={`fixed inset-0 z-40 bg-scrim backdrop-blur-[2px] ${closing ? 'motion-safe:animate-overlay-out' : 'motion-safe:animate-overlay-in'}`} onClick={requestClose} />
      <div className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[640px] max-w-full bg-card text-card-foreground shadow-drawer rounded-l-[16px] ${closing ? 'motion-safe:animate-drawer-out' : 'motion-safe:animate-drawer-in'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">Return from Repair</h2>
            <p className="text-2sm text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <button onClick={requestClose} className="rounded-control p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-2sm text-muted-foreground">Loading…</div>
        ) : (
          <>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Asset identity */}
              <div className="rounded-lg p-4 bg-muted/60 border border-border">
                <div className="micro-label mb-1">Asset</div>
                <div className="font-semibold text-base text-foreground">{asset?.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">
                  {asset?.displayId} · {asset?.serialNumber}
                </div>
              </div>

              {/* Original repair context — the reason it was sent out */}
              {repairReason && (
                <div className="rounded-lg p-4 bg-warning-surface/40 border border-border">
                  <div className="micro-label mb-1">Reason for Repair</div>
                  <div className="text-2sm text-foreground">{repairReason}</div>
                  {(repairVendor || repairSentAt) && (
                    <div className="text-2xs text-muted-foreground mt-1.5">
                      {repairVendor && <>Vendor: {repairVendor}</>}
                      {repairVendor && repairSentAt && ' · '}
                      {repairSentAt && <>Sent: {repairSentAt.slice(0, 10)}</>}
                    </div>
                  )}
                </div>
              )}

              {/* Outcome selection */}
              {!outcome && (
                <div className="space-y-3">
                  <div className="micro-label">Repair Outcome</div>
                  {([
                    { key: 'Repaired', desc: 'The asset was repaired — record costs, warranty, and spec changes.' },
                    { key: 'Return without Repair', desc: 'Returned without being repaired — re-route or return as is.' },
                    { key: 'Not Repairable', desc: 'Beyond repair — retire the asset.' },
                  ] as { key: RepairOutcome; desc: string }[]).map((o) => (
                    <button
                      key={o.key}
                      onClick={() => { setOutcome(o.key); setStep(1); }}
                      className="w-full text-left rounded-lg border border-border px-4 py-3 transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <div className="font-semibold text-sm text-foreground">{o.key}</div>
                      <div className="text-2sm text-muted-foreground mt-0.5">{o.desc}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Repaired flow ── */}
              {outcome === 'Repaired' && step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-foreground/80">Return Date <span className="text-danger">*</span></label>
                    <DatePicker value={returnDate} onChange={setReturnDate} ariaLabel="Return Date" className="w-full" />
                  </div>

                  <div className="space-y-3">
                    <div className="micro-label">Repair Cost Items</div>
                    {costRows.map((row, i) => (
                      <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground/70">Item {i + 1}</span>
                          {costRows.length > 1 && (
                            <button onClick={() => setCostRows((r) => r.filter((_, idx) => idx !== i))}
                              className="text-danger/70 hover:text-danger transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input value={row.itemName} onChange={(e) => setRow(i, { itemName: e.target.value })}
                            placeholder="Item name" className={inputClass} />
                          <Select value={row.itemType} onValueChange={(v) => setRow(i, { itemType: v as RepairCostItemType })}
                            ariaLabel="Item Type" className="w-full"
                            options={ITEM_TYPES.map((t) => ({ value: t, label: t }))} />
                        </div>
                        <input type="number" min="0" step="0.01" value={row.cost}
                          onChange={(e) => setRow(i, { cost: e.target.value })}
                          placeholder="Cost" className={inputClass} />
                        <label className="flex items-center gap-2 text-2sm text-foreground/80 cursor-pointer">
                          <input type="checkbox" checked={row.hasWarranty}
                            onChange={(e) => setRow(i, { hasWarranty: e.target.checked })} />
                          This item has a warranty
                        </label>
                        {row.hasWarranty && (
                          <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block mb-1 text-2xs text-muted-foreground">Warranty Start</label>
                                <DatePicker value={row.warrantyStartDate} onChange={(v) => setWarrantyStart(i, v)} ariaLabel="Warranty Start" className="w-full" />
                              </div>
                              <div>
                                <label className="block mb-1 text-2xs text-muted-foreground">Warranty Expiry</label>
                                <DatePicker value={row.warrantyExpiryDate} onChange={(v) => setRow(i, { warrantyExpiryDate: v })} ariaLabel="Warranty Expiry" className="w-full" />
                                {row.warrantyStartDate && row.warrantyExpiryDate && row.warrantyExpiryDate < row.warrantyStartDate && (
                                  <p className="text-2xs text-danger mt-1">Expiry can't be before start.</p>
                                )}
                              </div>
                            </div>
                            {/* Period helper — auto-fills expiry from start + months */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-2xs text-muted-foreground">Period:</span>
                              {WARRANTY_PRESETS.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setWarrantyMonths(i, String(m))}
                                  disabled={!row.warrantyStartDate}
                                  className={`rounded-control border px-2.5 py-1 text-2xs transition-colors disabled:opacity-40 ${
                                    row.warrantyMonths === String(m)
                                      ? 'border-primary bg-primary/5 text-primary'
                                      : 'border-border text-foreground/70 hover:bg-muted'
                                  }`}
                                >
                                  {m} mo
                                </button>
                              ))}
                              <input
                                type="number"
                                min="0"
                                value={row.warrantyMonths ?? ''}
                                onChange={(e) => setWarrantyMonths(i, e.target.value)}
                                disabled={!row.warrantyStartDate}
                                placeholder="months"
                                className="w-20 rounded-control border border-input bg-input-background px-2 py-1 text-2xs text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary disabled:opacity-40"
                              />
                              <span className="text-2xs text-muted-foreground/70">
                                {row.warrantyStartDate ? 'auto-fills expiry' : 'set a start date first'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setCostRows((r) => [...r, emptyRow()])}
                      className="flex items-center gap-1.5 text-2sm font-semibold text-primary hover:opacity-80">
                      <Plus className="w-4 h-4" /> Add another item
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-muted/60 border border-border px-4 py-3">
                    <span className="text-sm font-semibold text-foreground">Total Cost</span>
                    <span className="text-base font-bold text-foreground nums">{totalCost.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {outcome === 'Repaired' && step === 2 && (
                <div className="space-y-5">
                  <FilePickerField label="Warranty Documents" file={warrantyFile} onPick={setWarrantyFile} icon={<FileText className="w-4 h-4" />} />
                  <FilePickerField label="Invoice" file={invoiceFile} onPick={setInvoiceFile} icon={<FileText className="w-4 h-4" />} />
                  <p className="text-2xs text-muted-foreground">Both are optional · JPEG, PNG, or PDF · max 10 MB.</p>
                </div>
              )}

              {outcome === 'Repaired' && step === 3 && (
                <div className="space-y-4">
                  <p className="text-2sm text-muted-foreground">Update any specs that changed during service. Skip if nothing changed.</p>
                  {attributes.length === 0 ? (
                    <div className="text-2sm text-muted-foreground">This asset's category has no custom specs.</div>
                  ) : (
                    attributes.map((attr) => (
                      <div key={attr.id}>
                        <label className="block mb-1.5 text-xs font-medium text-foreground/80">{attr.label}</label>
                        {attr.type === 'Dropdown' ? (
                          <Select value={attrValues[attr.id] ?? ''} onValueChange={(v) => setAttrValues((p) => ({ ...p, [attr.id]: v }))}
                            ariaLabel={attr.label} className="w-full"
                            options={[{ value: '', label: 'Select…' }, ...attr.options.map((o) => ({ value: o.label, label: o.label }))]} />
                        ) : (
                          <input type={attr.type === 'Number' ? 'number' : attr.type === 'Date' ? 'date' : 'text'}
                            value={attrValues[attr.id] ?? ''} onChange={(e) => setAttrValues((p) => ({ ...p, [attr.id]: e.target.value }))}
                            className={inputClass} placeholder={`Enter ${attr.label.toLowerCase()}`} />
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {outcome === 'Repaired' && step === 4 && (
                <AssignmentStep
                  assigneeName={assigneeName}
                  action={assignmentAction}
                  setAction={setAssignmentAction}
                  images={handbackImages}
                  setImages={setHandbackImages}
                  saving={saving}
                />
              )}

              {/* ── Return without Repair ── */}
              {outcome === 'Return without Repair' && (
                <div className="space-y-5">
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-foreground/80">Reason <span className="text-danger">*</span></label>
                    <textarea value={rwrReason} onChange={(e) => setRwrReason(e.target.value)} rows={3}
                      placeholder="Why is the asset being returned without repair?" className={`${inputClass} resize-y`} />
                  </div>
                  <div className="space-y-2">
                    <div className="micro-label">Next Step</div>
                    <label className="flex items-center gap-2 text-2sm text-foreground/80 cursor-pointer">
                      <input type="radio" checked={rwrAction === 'different_vendor'} onChange={() => setRwrAction('different_vendor')} />
                      Send to a different vendor
                    </label>
                    <label className="flex items-center gap-2 text-2sm text-foreground/80 cursor-pointer">
                      <input type="radio" checked={rwrAction === 'return_as_is'} onChange={() => setRwrAction('return_as_is')} />
                      Return as is
                    </label>
                  </div>

                  {rwrAction === 'different_vendor' && (
                    <div className="space-y-3 rounded-lg border border-border p-4">
                      <div className="micro-label">New Vendor</div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                        <input value={vendorSearch} onChange={(e) => setVendorSearch(e.target.value)}
                          placeholder="Search vendors…" className={`${inputClass} pl-9`} />
                      </div>
                      <div className="max-h-[200px] overflow-y-auto space-y-2">
                        {(selectedVendor && !vendors.some((v) => v.id === selectedVendor.id) ? [selectedVendor, ...vendors] : vendors).map((v) => (
                          <button key={v.id} onClick={() => setSelectedVendor(v)}
                            className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${selectedVendor?.id === v.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/60'}`}>
                            <div className="font-semibold text-2sm text-foreground">{v.name}</div>
                            {(v.contactPerson || v.contact) && (
                              <div className="text-2xs text-muted-foreground">{[v.contactPerson, v.contact].filter(Boolean).join(' · ')}</div>
                            )}
                          </button>
                        ))}
                        <button onClick={() => setShowAddVendor(true)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-2sm font-semibold text-primary hover:bg-primary/5">
                          <Plus className="w-4 h-4" /> Add New Vendor
                        </button>
                      </div>
                      <div>
                        <label className="block mb-1.5 text-xs font-medium text-foreground/80">Reason for the new vendor <span className="text-danger">*</span></label>
                        <textarea value={newReason} onChange={(e) => setNewReason(e.target.value)} rows={2}
                          placeholder="Describe the issue for the new vendor…" className={`${inputClass} resize-y`} />
                      </div>
                    </div>
                  )}

                  {rwrAction === 'return_as_is' && (
                    <AssignmentStep
                      assigneeName={assigneeName}
                      action={assignmentAction}
                      setAction={setAssignmentAction}
                      images={handbackImages}
                      setImages={setHandbackImages}
                      saving={saving}
                    />
                  )}
                </div>
              )}

              {/* ── Not Repairable ── */}
              {outcome === 'Not Repairable' && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-danger-surface border border-border p-4 text-2sm text-danger-foreground">
                    Retiring an asset is permanent. {assigneeName && `It will be unassigned from ${assigneeName}.`}
                  </div>
                  <div>
                    <label className="block mb-1.5 text-xs font-medium text-foreground/80">Reason for retirement <span className="text-danger">*</span></label>
                    <textarea value={retireReason} onChange={(e) => setRetireReason(e.target.value)} rows={3}
                      placeholder="Why is this asset being retired?" className={`${inputClass} resize-y`} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-4 justify-between border-t border-border bg-muted/60 rounded-bl-[16px]">
              <button
                onClick={() => {
                  if (outcome === 'Repaired' && step > 1) { setStep((s) => (s - 1) as 1 | 2 | 3); return; }
                  if (outcome) { setOutcome(null); setStep(1); return; }
                  requestClose();
                }}
                className="flex items-center gap-1.5 rounded-control border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
              >
                {outcome ? <><ArrowLeft className="w-4 h-4" /> Back</> : 'Cancel'}
              </button>

              {/* Right-side action */}
              {outcome === 'Repaired' && step < 4 && (
                <button
                  onClick={() => { if (step === 1 && !step1Valid()) { toast.error('Add at least one valid cost item (name + cost).'); return; } setStep((s) => (s + 1) as 2 | 3 | 4); }}
                  className="flex items-center gap-2 rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  {step === 3 ? 'Save & Continue' : 'Continue'} <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {outcome === 'Repaired' && step === 4 && (
                <button onClick={handleCompleteRepaired} disabled={saving}
                  className="flex items-center gap-2 rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
                  <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                </button>
              )}
              {outcome === 'Return without Repair' && rwrAction === 'different_vendor' && (
                <button onClick={handleReroute} disabled={saving || !rwrReason.trim() || !selectedVendor || !newReason.trim()}
                  className="flex items-center gap-2 rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
                  <Store className="w-4 h-4" /> {saving ? 'Saving…' : 'Send to Vendor'}
                </button>
              )}
              {outcome === 'Return without Repair' && rwrAction === 'return_as_is' && (
                <button onClick={handleReturnAsIs} disabled={saving || !rwrReason.trim()}
                  className="flex items-center gap-2 rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
                  <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
                </button>
              )}
              {outcome === 'Not Repairable' && (
                <button onClick={() => { if (!retireReason.trim()) { toast.error('Enter a retirement reason.'); return; } setShowRetireConfirm(true); }}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-control px-5 py-2.5 text-sm font-semibold bg-danger text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
                  <Wrench className="w-4 h-4" /> Retire Asset
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {showAddVendor && (
        <AddVendorDialog
          onCreated={(v: Vendor) => { setSelectedVendor({ id: v.id, name: v.name, contactPerson: v.contactPerson, contact: v.contact }); setVendors((prev) => [{ id: v.id, name: v.name, contactPerson: v.contactPerson, contact: v.contact }, ...prev]); }}
          onClose={() => setShowAddVendor(false)}
        />
      )}
      {showRetireConfirm && (
        <ConfirmDialog
          title="Retire this asset?"
          description="Are you sure you want to retire this asset? This action cannot be undone."
          confirmLabel="Retire Asset"
          onConfirm={handleRetire}
          onCancel={() => setShowRetireConfirm(false)}
        />
      )}
    </OverlayPortal>
  );
}

// ── Assignment handling sub-step (shared by Repaired step 4 and Return as Is) ─
function AssignmentStep({
  assigneeName, action, setAction, images, setImages, saving,
}: {
  assigneeName: string | null;
  action: 'handback' | 'keep_in_store';
  setAction: (a: 'handback' | 'keep_in_store') => void;
  images: UploadedImage[];
  setImages: (i: UploadedImage[]) => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      {assigneeName ? (
        <div className="rounded-lg bg-muted/60 border border-border p-4">
          <div className="micro-label mb-1">Currently Assigned To</div>
          <div className="font-semibold text-2sm text-foreground">{assigneeName}</div>
        </div>
      ) : (
        <div className="text-2sm text-muted-foreground">This asset is not currently assigned.</div>
      )}

      <div className="space-y-2">
        <div className="micro-label">Assignment</div>
        {assigneeName && (
          <label className="flex items-center gap-2 text-2sm text-foreground/80 cursor-pointer">
            <input type="radio" checked={action === 'handback'} onChange={() => setAction('handback')} />
            Hand back to {assigneeName}
          </label>
        )}
        <label className="flex items-center gap-2 text-2sm text-foreground/80 cursor-pointer">
          <input type="radio" checked={action === 'keep_in_store'} onChange={() => setAction('keep_in_store')} />
          Keep in Store (mark Available)
        </label>
      </div>

      {action === 'handback' && assigneeName && (
        <div>
          <label className="mb-2 text-xs font-medium text-foreground/80 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" /> Condition Photos at Handback (Optional)
          </label>
          <ImageUploadZone images={images} onChange={setImages} uploading={saving} />
        </div>
      )}
    </div>
  );
}

// ── Simple file picker (JPEG/PNG/PDF) ─────────────────────────────────────
function FilePickerField({
  label, file, onPick, icon,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium text-foreground/80">{label} <span className="text-muted-foreground/70">(Optional)</span></label>
      {file ? (
        <div className="flex items-center justify-between rounded-control border border-border px-3 py-2.5">
          <span className="flex items-center gap-2 text-2sm text-foreground truncate">{icon}{file.name}</span>
          <button onClick={() => onPick(null)} className="text-danger/70 hover:text-danger transition-colors"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 rounded-control border border-dashed border-border px-3 py-2.5 text-2sm text-muted-foreground cursor-pointer hover:bg-muted/60 transition-colors">
          <Upload className="w-4 h-4" /> Choose file
          <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}
