'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, createUpgrade, updateUpgrade } from '@/lib/api';
import type { AssetUpgrade, CreateUpgradePayload, UpgradeType } from '@/types';

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
  notes: '',
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

  useEffect(() => {
    if (existing) {
      setForm({
        upgradeDate: existing.upgradeDate,
        upgradeType: existing.upgradeType,
        specBefore: existing.specBefore ?? '',
        specAfter: existing.specAfter,
        cost: String(existing.cost),
        vendorName: existing.vendorName,
        notes: existing.notes ?? '',
      });
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
      notes: form.notes.trim() || undefined,
    };

    try {
      const saved = isEdit
        ? await updateUpgrade(existing!.id, payload)
        : await createUpgrade(assetId, payload);
      toast.success(isEdit ? 'Upgrade entry updated.' : 'Upgrade entry added.');
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save upgrade entry.');
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
            <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>
              {isEdit ? 'Edit Upgrade Entry' : 'Add Upgrade Entry'}
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {isEdit ? 'Update this upgrade log entry' : 'Log an upgrade performed on this asset'}
            </p>
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
            <div className="font-semibold" style={{ fontSize: 15, color: '#1E293B' }}>{assetName}</div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace', marginTop: 2 }}>{assetDisplayId}</div>
          </div>

          {/* Form */}
          <div>
            <div className="font-semibold mb-3 pb-2" style={{ fontSize: 14, color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>
              Upgrade Details
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Upgrade Date" required error={errors.upgradeDate}>
                  <input type="date" value={form.upgradeDate}
                    onChange={(e) => set('upgradeDate', e.target.value)} className="upg-input" />
                </Field>
                <Field label="Upgrade Type" required error={errors.upgradeType}>
                  <select value={form.upgradeType}
                    onChange={(e) => set('upgradeType', e.target.value)} className="upg-input">
                    <option value="">Select type…</option>
                    {UPGRADE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
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
                    <span className="absolute top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none"
                      style={{ left: 12, color: '#94A3B8' }}>$</span>
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

              <Field label="Notes (Optional)">
                <textarea value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={3} className="upg-input" style={{ resize: 'vertical' }}
                  placeholder="Any additional notes about this upgrade…" />
              </Field>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end"
          style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <button onClick={onClose}
            className="rounded-lg border px-5 py-2.5 font-medium transition-colors hover:bg-gray-50"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-lg px-5 py-2.5 font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ fontSize: 14, background: '#1E3A8A' }}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Confirm'}
          </button>
        </div>
      </div>

      <style>{`
        .upg-input {
          width: 100%;
          border: 1px solid #CBD5E1;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #1E293B;
          background: #fff;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .upg-input:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
      `}</style>
    </>
  );
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{error}</p>}
    </div>
  );
}
