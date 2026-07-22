'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Paperclip, FileText, ImageIcon, XCircle } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { toast } from 'sonner';
import { ApiError, createUpgrade, updateUpgrade, uploadUpgradeInvoice } from '@/lib/api';
import type { AssetUpgrade, CreateUpgradePayload, UpgradeType } from '@/types';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';

interface Props {
  assetId: string;
  assetName: string;
  assetDisplayId: string;
  /** Pass an existing entry to open in edit mode; omit for create. */
  existing?: AssetUpgrade;
  onClose: () => void;
  onSaved: (entry: AssetUpgrade) => void;
}

const UPGRADE_TYPES: UpgradeType[] = ['Part Replaced', 'Part Added'];

const EMPTY = {
  upgradeDate: new Date().toISOString().split('T')[0],
  upgradeType: '' as UpgradeType | '',
  specBefore: '',
  specAfter: '',
  cost: '',
  vendorName: '',
};

export function AddUpgradeDrawer({
  assetId,
  assetName,
  assetDisplayId,
  existing,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!existing;

  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Invoice file state
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  // Existing URL when editing — shown as current attachment
  const [existingInvoiceUrl, setExistingInvoiceUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existing) {
      setForm({
        upgradeDate: existing.upgradeDate,
        upgradeType: existing.upgradeType,
        specBefore: existing.specBefore ?? '',
        specAfter: existing.specAfter,
        cost: String(existing.cost),
        vendorName: existing.vendorName,
      });
      setExistingInvoiceUrl(existing.invoiceUrl ?? null);
    }
  }, [existing]);

  const set = (k: keyof typeof EMPTY, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.upgradeDate) e.upgradeDate = 'Date is required';
    if (!form.upgradeType) e.upgradeType = 'Upgrade type is required';
    if (!form.specAfter.trim()) e.specAfter = 'Specification after is required';
    if (!form.cost || parseFloat(form.cost) <= 0) e.cost = 'Cost must be greater than 0';
    if (!form.vendorName.trim()) e.vendorName = 'Vendor name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload: CreateUpgradePayload = {
      upgradeDate: form.upgradeDate,
      upgradeType: form.upgradeType as UpgradeType,
      specBefore: form.specBefore.trim() || undefined,
      specAfter: form.specAfter.trim(),
      cost: parseFloat(form.cost),
      vendorName: form.vendorName.trim(),
    };

    try {
      // Step 1: create or update the upgrade record
      let saved = isEdit
        ? await updateUpgrade(existing!.id, payload)
        : await createUpgrade(assetId, payload);

      // Step 2: upload invoice file if a new one was picked
      if (invoiceFile) {
        saved = await uploadUpgradeInvoice(saved.id, invoiceFile);
      }

      toast.success(isEdit ? 'Upgrade entry updated.' : 'Upgrade entry added.');
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save upgrade entry.');
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
            <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">
              {isEdit ? 'Edit Upgrade Entry' : 'Add Upgrade Entry'}
            </h2>
            <p className="text-2sm text-muted-foreground mt-0.5">
              {isEdit ? 'Update this upgrade log entry' : 'Log an upgrade performed on this asset'}
            </p>
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
            <div className="font-semibold text-[15px] text-foreground">{assetName}</div>
            <div className="text-xs text-muted-foreground/80 font-mono mt-0.5">{assetDisplayId}</div>
          </div>

          {/* Form */}
          <div>
            <div className="font-semibold mb-3 pb-2 text-sm text-foreground border-b border-border/60">
              Upgrade Details
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Upgrade Date" required error={errors.upgradeDate}>
                  <DatePicker value={form.upgradeDate}
                    onChange={(v) => set('upgradeDate', v)} ariaLabel="Upgrade Date" className="w-full" />
                </Field>
                <Field label="Upgrade Type" required error={errors.upgradeType}>
                  <Select value={form.upgradeType}
                    onValueChange={(v) => set('upgradeType', v)} className="w-full"
                    placeholder="Select type…" ariaLabel="Upgrade Type"
                    options={[{ value: '', label: 'Select type…' }, ...UPGRADE_TYPES.map((t) => ({ value: t, label: t }))]} />
                </Field>
              </div>

              <Field label="Specification Before (Optional)">
                <input type="text" value={form.specBefore}
                  onChange={(e) => set('specBefore', e.target.value)}
                  className="upg-input" placeholder="e.g. 8GB RAM DDR4" />
              </Field>

              <Field label="Specification After" required error={errors.specAfter}>
                <input type="text" value={form.specAfter}
                  onChange={(e) => set('specAfter', e.target.value)}
                  className="upg-input" placeholder="e.g. 32GB RAM DDR4" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Cost" required error={errors.cost}>
                  <div className="relative">
                    <span className="absolute top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none left-3 text-muted-foreground/70">$</span>
                    <input type="number" value={form.cost}
                      onChange={(e) => set('cost', e.target.value)}
                      className="upg-input" style={{ paddingLeft: 28 }}
                      placeholder="0.00" min="0.01" step="0.01" />
                  </div>
                </Field>
                <Field label="Vendor / Provider" required error={errors.vendorName}>
                  <input type="text" value={form.vendorName}
                    onChange={(e) => set('vendorName', e.target.value)}
                    className="upg-input" placeholder="e.g. Kingston Technology" />
                </Field>
              </div>

              <Field label="Reference / Invoice (Optional)">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setInvoiceFile(f);
                  }}
                />
                {/* Show newly picked file */}
                {invoiceFile ? (
                  <div className="flex items-center gap-2 rounded-control border border-border px-3 py-2 bg-muted/40">
                    {invoiceFile.type === 'application/pdf'
                      ? <FileText className="w-4 h-4 text-danger shrink-0" />
                      : <ImageIcon className="w-4 h-4 text-primary shrink-0" />}
                    <span className="text-xs text-foreground/80 truncate flex-1">{invoiceFile.name}</span>
                    <button
                      type="button"
                      onClick={() => { setInvoiceFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-muted-foreground hover:text-danger transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : existingInvoiceUrl ? (
                  /* Show existing attachment when editing */
                  <div className="flex items-center gap-2 rounded-control border border-border px-3 py-2 bg-muted/40">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate flex-1">Existing invoice attached</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-primary hover:underline"
                    >
                      Replace
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 w-full rounded-control border border-dashed border-border px-3 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:border-ring"
                  >
                    <Paperclip className="w-4 h-4 shrink-0" />
                    Attach invoice or receipt (JPEG, PNG, PDF · max 10 MB)
                  </button>
                )}
              </Field>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-bl-[16px]">
          <button onClick={requestClose}
            className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Confirm'}
          </button>
        </div>
      </div>

      <style>{`
        .upg-input {
          width: 100%;
          border: 1px solid var(--input);
          border-radius: 0.625rem;
          padding: 8px 12px;
          font-size: 13px;
          color: var(--foreground);
          background: var(--input-background);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .upg-input:focus {
          border-color: var(--ring);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 15%, transparent);
        }
        .upg-input::placeholder {
          color: color-mix(in srgb, var(--muted-foreground) 60%, transparent);
        }
      `}</style>
    </OverlayPortal>
  );
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium text-foreground/80">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
