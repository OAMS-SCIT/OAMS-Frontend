'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ImageUploadZone, type UploadedImage } from '@/components/ui/ImageUploadZone';
import { toast } from 'sonner';
import {
  ApiError,
  createAsset,
  getAsset,
  getCategories,
  getCategory,
  updateAsset,
} from '@/lib/api';
import type {
  AssetCondition,
  AssetDetail,
  AttributeDetail,
  AttributeValuePayload,
  CategoryListItem,
} from '@/types';

interface Props {
  /**
   * Pass an existing asset ID to open in edit mode.
   * Omit for register (create) mode.
   */
  assetId?: string;
  onClose: () => void;
  /** Called with the saved/created asset so the parent can refresh. */
  onSaved: (asset: AssetDetail) => void;
}

const CONDITIONS: AssetCondition[] = ['New', 'Good', 'Fair', 'Poor'];

interface FormState {
  name: string;
  description: string;
  brand: string;
  model: string;
  serialNumber: string;
  categoryId: string;
  purchaseDate: string;
  purchasePrice: string;
  vendorName: string;
  purchaseOrderRef: string;
  warrantyStartDate: string;
  warrantyExpiryDate: string;
  warrantyProvider: string;
  condition: AssetCondition;
  location: string;
}

const EMPTY_FORM: FormState = {
  name: '', description: '', brand: '', model: '', serialNumber: '',
  categoryId: '', purchaseDate: '', purchasePrice: '', vendorName: '',
  purchaseOrderRef: '', warrantyStartDate: '', warrantyExpiryDate: '',
  warrantyProvider: '', condition: 'New', location: '',
};

function assetDetailToForm(a: AssetDetail): FormState {
  return {
    name: a.name,
    description: a.description ?? '',
    brand: a.brand,
    model: a.model,
    serialNumber: a.serialNumber,
    categoryId: a.category.id,
    purchaseDate: a.purchaseDate ?? '',
    purchasePrice: a.purchasePrice != null ? String(a.purchasePrice) : '',
    vendorName: a.vendorName ?? '',
    purchaseOrderRef: a.purchaseOrderRef ?? '',
    warrantyStartDate: a.warrantyStartDate ?? '',
    warrantyExpiryDate: a.warrantyExpiryDate ?? '',
    warrantyProvider: a.warrantyProvider ?? '',
    condition: a.condition,
    location: a.location ?? '',
  };
}

export function RegisterAssetDrawer({ assetId, onClose, onSaved }: Props) {
  const isEdit = !!assetId;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [categoryAttrs, setCategoryAttrs] = useState<AttributeDetail[]>([]);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingAttrs, setLoadingAttrs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  // Load categories list + (edit) existing asset on mount
  useEffect(() => {
    const init = async () => {
      try {
        const catResult = await getCategories({ status: 'Active', limit: 100 });
        setCategories(catResult.data);

        if (assetId) {
          const asset = await getAsset(assetId);
          setForm(assetDetailToForm(asset));
          // Pre-load attributes for the asset's category
          const detail = await getCategory(asset.category.id);
          setCategoryAttrs(detail.attributes);
          // Pre-fill existing attribute values
          const vals: Record<string, string> = {};
          for (const av of asset.customAttributes) {
            vals[av.attributeId] = av.value;
          }
          setAttrValues(vals);
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load data.');
        onClose();
      } finally {
        setLoadingInit(false);
      }
    };
    init();
  }, [assetId, onClose]);

  // Reload dynamic attributes when category selection changes
  useEffect(() => {
    if (!form.categoryId || loadingInit) return;
    setLoadingAttrs(true);
    setCategoryAttrs([]);
    setAttrValues({});
    getCategory(form.categoryId)
      .then((detail) => setCategoryAttrs(detail.attributes))
      .catch(() => toast.error('Failed to load category attributes.'))
      .finally(() => setLoadingAttrs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.categoryId]);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  const setAttr = (attributeId: string, value: string) => {
    setAttrValues((prev) => ({ ...prev, [attributeId]: value }));
    setErrors((e) => ({ ...e, [`attr_${attributeId}`]: '' }));
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Asset name is required';
    if (!form.brand.trim()) e.brand = 'Brand is required';
    if (!form.model.trim()) e.model = 'Model is required';
    if (!form.serialNumber.trim()) e.serialNumber = 'Serial number is required';
    if (!form.categoryId) e.categoryId = 'Category is required';
    if (!form.purchaseDate) e.purchaseDate = 'Purchase date is required';
    if (!form.purchasePrice || parseFloat(form.purchasePrice) <= 0)
      e.purchasePrice = 'Purchase price must be greater than 0';
    if (
      form.warrantyStartDate &&
      form.warrantyExpiryDate &&
      form.warrantyExpiryDate <= form.warrantyStartDate
    )
      e.warrantyExpiryDate = 'Expiry must be after start date';

    // Required category attributes
    for (const attr of categoryAttrs) {
      if (attr.isRequired && !attrValues[attr.id]?.trim()) {
        e[`attr_${attr.id}`] = `${attr.label} is required`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const customAttributes: AttributeValuePayload[] = Object.entries(attrValues)
      .filter(([, v]) => v.trim() !== '')
      .map(([attributeId, value]) => ({ attributeId, value }));

    try {
      let saved: AssetDetail;
      if (isEdit) {
        saved = await updateAsset(assetId!, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          brand: form.brand.trim(),
          model: form.model.trim(),
          serialNumber: form.serialNumber.trim(),
          condition: form.condition,
          location: form.location.trim() || undefined,
          purchaseDate: form.purchaseDate,
          purchasePrice: parseFloat(form.purchasePrice),
          vendorName: form.vendorName.trim() || undefined,
          purchaseOrderRef: form.purchaseOrderRef.trim() || undefined,
          warrantyStartDate: form.warrantyStartDate || undefined,
          warrantyExpiryDate: form.warrantyExpiryDate || undefined,
          warrantyProvider: form.warrantyProvider.trim() || undefined,
          customAttributes,
        });
        toast.success('Asset updated successfully.');
      } else {
        saved = await createAsset({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          brand: form.brand.trim(),
          model: form.model.trim(),
          serialNumber: form.serialNumber.trim(),
          categoryId: form.categoryId,
          condition: form.condition,
          location: form.location.trim() || undefined,
          purchaseDate: form.purchaseDate,
          purchasePrice: parseFloat(form.purchasePrice),
          vendorName: form.vendorName.trim() || undefined,
          purchaseOrderRef: form.purchaseOrderRef.trim() || undefined,
          warrantyStartDate: form.warrantyStartDate || undefined,
          warrantyExpiryDate: form.warrantyExpiryDate || undefined,
          warrantyProvider: form.warrantyProvider.trim() || undefined,
          customAttributes,
        });
        toast.success('Asset registered successfully.');
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save asset.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderAttrInput = (attr: AttributeDetail) => {
    const val = attrValues[attr.id] ?? '';
    const err = errors[`attr_${attr.id}`];

    if (attr.type === 'Dropdown') {
      return (
        <FormField key={attr.id} label={attr.label} required={attr.isRequired} error={err}>
          <select
            value={val}
            onChange={(e) => setAttr(attr.id, e.target.value)}
            className="form-input"
          >
            <option value="">Select…</option>
            {attr.options.map((opt) => (
              <option key={opt.id} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>
      );
    }

    return (
      <FormField key={attr.id} label={attr.label} required={attr.isRequired} error={err}>
        <input
          type={attr.type === 'Number' ? 'number' : attr.type === 'Date' ? 'date' : 'text'}
          value={val}
          onChange={(e) => setAttr(attr.id, e.target.value)}
          className="form-input"
          placeholder={`Enter ${attr.label.toLowerCase()}`}
        />
      </FormField>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,36,96,0.45)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col" style={{ width: 520, background: '#fff', boxShadow: '-8px 0 32px rgba(0,0,0,0.14)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>
              {isEdit ? 'Edit Asset' : 'Register New Asset'}
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {isEdit ? 'Update the details for this asset' : 'Fill in the details to register a new asset'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Body */}
        {loadingInit ? (
          <div className="flex-1 flex items-center justify-center" style={{ fontSize: 13, color: '#64748B' }}>
            Loading…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Section 1 - Basic Info */}
            <FormSection title="Basic Information">
              <FormField label="Asset Name / Description" required error={errors.name}>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
                  className="form-input" placeholder="e.g. Dell XPS 15 Laptop" />
              </FormField>
              <FormField label="Description">
                <input type="text" value={form.description} onChange={(e) => set('description', e.target.value)}
                  className="form-input" placeholder="Optional description" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Brand" required error={errors.brand}>
                  <input type="text" value={form.brand} onChange={(e) => set('brand', e.target.value)}
                    className="form-input" placeholder="e.g. Dell" />
                </FormField>
                <FormField label="Model" required error={errors.model}>
                  <input type="text" value={form.model} onChange={(e) => set('model', e.target.value)}
                    className="form-input" placeholder="e.g. XPS 15 9530" />
                </FormField>
              </div>
              <FormField label="Serial Number" required error={errors.serialNumber}>
                <input type="text" value={form.serialNumber} onChange={(e) => set('serialNumber', e.target.value)}
                  className="form-input font-mono" placeholder="Unique serial number" />
              </FormField>
            </FormSection>

            {/* Section 2 - Category & Dynamic Attributes */}
            <FormSection title="Category & Attributes">
              <FormField label="Category" required error={errors.categoryId}>
                <select
                  value={form.categoryId}
                  onChange={(e) => set('categoryId', e.target.value)}
                  className="form-input"
                  disabled={isEdit} // category locked after creation
                >
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
              {!form.categoryId && (
                <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>Select a category to see additional fields</p>
              )}
              {loadingAttrs && (
                <p style={{ fontSize: 12, color: '#94A3B8' }}>Loading attributes…</p>
              )}
              {categoryAttrs.map(renderAttrInput)}
            </FormSection>

            {/* Section 3 - Purchase */}
            <FormSection title="Purchase Details">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Purchase Date" required error={errors.purchaseDate}>
                  <input type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} className="form-input" />
                </FormField>
                <FormField label="Purchase Price" required error={errors.purchasePrice}>
                  <div className="relative">
                    <span
                      className="absolute top-1/2 -translate-y-1/2 pointer-events-none select-none text-sm"
                      style={{ left: 12, color: '#94A3B8', zIndex: 1 }}>
                      $
                    </span>
                    <input type="number" value={form.purchasePrice}
                      onChange={(e) => set('purchasePrice', e.target.value)}
                      className="form-input" style={{ paddingLeft: 28 }}
                      placeholder="0.00" min="0.01" step="0.01" />
                  </div>
                </FormField>
              </div>
              <FormField label="Vendor / Supplier Name">
                <input type="text" value={form.vendorName} onChange={(e) => set('vendorName', e.target.value)}
                  className="form-input" placeholder="Vendor or supplier name" />
              </FormField>
              <FormField label="Purchase Order Reference (Optional)">
                <input type="text" value={form.purchaseOrderRef} onChange={(e) => set('purchaseOrderRef', e.target.value)}
                  className="form-input" placeholder="e.g. PO-2024-001" />
              </FormField>
            </FormSection>

            {/* Section 4 - Warranty */}
            <FormSection title="Warranty">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Warranty Start Date">
                  <input type="date" value={form.warrantyStartDate} onChange={(e) => set('warrantyStartDate', e.target.value)} className="form-input" />
                </FormField>
                <FormField label="Warranty Expiry Date" error={errors.warrantyExpiryDate}>
                  <input type="date" value={form.warrantyExpiryDate} onChange={(e) => set('warrantyExpiryDate', e.target.value)} className="form-input" />
                </FormField>
              </div>
              <FormField label="Warranty Provider / Contact (Optional)">
                <input type="text" value={form.warrantyProvider} onChange={(e) => set('warrantyProvider', e.target.value)}
                  className="form-input" placeholder="Provider name or contact info" />
              </FormField>
            </FormSection>

            {/* Section 5 - Physical */}
            <FormSection title="Physical Details">
              <FormField label="Condition">
                <div className="flex gap-2">
                  {CONDITIONS.map((c) => (
                    <button key={c} onClick={() => set('condition', c)}
                      className="flex-1 rounded-lg py-2 border transition-all"
                      style={{
                        fontSize: 13, fontWeight: 500,
                        borderColor: form.condition === c ? '#3B82F6' : '#E2E8F0',
                        background: form.condition === c ? '#EFF6FF' : '#fff',
                        color: form.condition === c ? '#2563EB' : '#64748B',
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </FormField>
              <FormField label="Location / Office / Room">
                <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)}
                  className="form-input" placeholder="e.g. Office 3A, IT Storage" />
              </FormField>
            </FormSection>

            {/* Section 6 - Images (register mode only) */}
            {!isEdit && (
              <FormSection title="Asset Images">
                <ImageUploadZone images={uploadedImages} onChange={setUploadedImages} />
              </FormSection>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <button onClick={onClose} className="rounded-lg border px-5 py-2.5 font-medium transition-colors hover:bg-gray-50"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || loadingInit}
            className="rounded-lg px-5 py-2.5 font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ fontSize: 14, background: '#1E3A8A' }}>
            {saving ? 'Saving…' : isEdit ? 'Edit Asset' : 'Register Asset'}
          </button>
        </div>
      </div>

      <style>{`
        .form-input {
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
        .form-input:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .form-input:disabled { background: #F8FAFC; cursor: not-allowed; }
        .form-input.font-mono { font-family: monospace; }
      `}</style>
    </>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-semibold mb-3 pb-2" style={{ fontSize: 14, color: '#1E293B', borderBottom: '1px solid #F1F5F9' }}>{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
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
