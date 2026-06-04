'use client';

import { useState } from 'react';
import { X, CloudUpload } from 'lucide-react';
import { Asset, AssetCondition } from '@/types';
import { mockCategories } from '@/lib/mock-data';

interface Props {
  onClose: () => void;
  onSave: (asset: Asset) => void;
}

const CONDITIONS: AssetCondition[] = ['New', 'Good', 'Fair', 'Poor'];

export function RegisterAssetDrawer({ onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: '', brand: '', model: '', serialNumber: '',
    categoryId: '', purchaseDate: '', purchasePrice: '',
    vendor: '', purchaseOrderRef: '', warrantyStart: '',
    warrantyExpiry: '', warrantyProvider: '', condition: 'New' as AssetCondition,
    location: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCategory = mockCategories.find(c => c.id === form.categoryId);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = 'Asset name is required';
    if (!form.brand) e.brand = 'Brand is required';
    if (!form.model) e.model = 'Model is required';
    if (!form.serialNumber) e.serialNumber = 'Serial number is required';
    if (!form.categoryId) e.categoryId = 'Category is required';
    if (form.warrantyStart && form.warrantyExpiry && form.warrantyExpiry < form.warrantyStart)
      e.warrantyExpiry = 'Expiry must be after start date';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const now = new Date().toISOString().split('T')[0];
    const newAsset: Asset = {
      id: `AST-${String(Date.now()).slice(-4)}`,
      name: form.name, brand: form.brand, model: form.model,
      serialNumber: form.serialNumber,
      categoryId: form.categoryId,
      categoryName: selectedCategory?.name || '',
      deviceType: 'Other',
      purchaseDate: form.purchaseDate || now,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
      vendor: form.vendor || undefined,
      purchaseOrderRef: form.purchaseOrderRef || undefined,
      warrantyStart: form.warrantyStart || undefined,
      warrantyExpiry: form.warrantyExpiry || undefined,
      warrantyProvider: form.warrantyProvider || undefined,
      condition: form.condition,
      location: form.location || 'IT Storage',
      status: 'Available',
      registeredDate: now,
      registeredBy: 'Alex Rivera',
      lastModified: now,
    };
    onSave(newAsset);
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,36,96,0.45)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col" style={{ width: 520, background: '#fff', boxShadow: '-8px 0 32px rgba(0,0,0,0.14)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>Register New Asset</h2>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>Fill in the details to register a new asset</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1 - Basic Info */}
          <FormSection title="Basic Information">
            <FormField label="Asset Name / Description" required error={errors.name}>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                className="form-input" placeholder="e.g. Dell XPS 15 Laptop" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Brand" required error={errors.brand}>
                <input type="text" value={form.brand} onChange={e => set('brand', e.target.value)}
                  className="form-input" placeholder="e.g. Dell" />
              </FormField>
              <FormField label="Model" required error={errors.model}>
                <input type="text" value={form.model} onChange={e => set('model', e.target.value)}
                  className="form-input" placeholder="e.g. XPS 15 9530" />
              </FormField>
            </div>
            <FormField label="Serial Number" required error={errors.serialNumber}>
              <input type="text" value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)}
                className="form-input font-mono" placeholder="Unique serial number" />
            </FormField>
          </FormSection>

          {/* Section 2 - Category */}
          <FormSection title="Category & Attributes">
            <FormField label="Category" required error={errors.categoryId}>
              <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)} className="form-input">
                <option value="">Select a category...</option>
                {mockCategories.filter(c => c.status === 'Active').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormField>
            {!form.categoryId && (
              <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>Select a category to see additional fields</p>
            )}
            {selectedCategory && selectedCategory.customAttributes.map(attr => (
              <FormField key={attr.id} label={attr.label} required={attr.required}>
                <input type={attr.type === 'Number' ? 'number' : 'text'}
                  className="form-input" placeholder={`Enter ${attr.label.toLowerCase()}`} />
              </FormField>
            ))}
          </FormSection>

          {/* Section 3 - Purchase */}
          <FormSection title="Purchase Details">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Purchase Date">
                <input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} className="form-input" />
              </FormField>
              <FormField label="Purchase Price">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#94A3B8' }}>$</span>
                  <input type="number" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)}
                    className="form-input pl-7" placeholder="0.00" />
                </div>
              </FormField>
            </div>
            <FormField label="Vendor / Supplier Name">
              <input type="text" value={form.vendor} onChange={e => set('vendor', e.target.value)}
                className="form-input" placeholder="Vendor or supplier name" />
            </FormField>
            <FormField label="Purchase Order Reference (Optional)">
              <input type="text" value={form.purchaseOrderRef} onChange={e => set('purchaseOrderRef', e.target.value)}
                className="form-input" placeholder="e.g. PO-2024-001" />
            </FormField>
          </FormSection>

          {/* Section 4 - Warranty */}
          <FormSection title="Warranty">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Warranty Start Date">
                <input type="date" value={form.warrantyStart} onChange={e => set('warrantyStart', e.target.value)} className="form-input" />
              </FormField>
              <FormField label="Warranty Expiry Date" error={errors.warrantyExpiry}>
                <input type="date" value={form.warrantyExpiry} onChange={e => set('warrantyExpiry', e.target.value)} className="form-input" />
              </FormField>
            </div>
            <FormField label="Warranty Provider / Contact (Optional)">
              <input type="text" value={form.warrantyProvider} onChange={e => set('warrantyProvider', e.target.value)}
                className="form-input" placeholder="Provider name or contact info" />
            </FormField>
          </FormSection>

          {/* Section 5 - Physical */}
          <FormSection title="Physical Details">
            <FormField label="Condition">
              <div className="flex gap-2">
                {CONDITIONS.map(c => (
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
              <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                className="form-input" placeholder="e.g. Office 3A, IT Storage" />
            </FormField>
          </FormSection>

          {/* Section 6 - Images */}
          <FormSection title="Asset Images">
            <div className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#CBD5E1' }}>
              <CloudUpload className="w-8 h-8 mb-3" style={{ color: '#CBD5E1' }} />
              <div className="font-medium mb-1" style={{ fontSize: 14, color: '#64748B' }}>Drag images here or click to browse</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Supported: JPG, PNG. Max 5 images.</div>
            </div>
          </FormSection>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <button onClick={onClose} className="rounded-lg border px-5 py-2.5 font-medium transition-colors hover:bg-gray-50"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button onClick={handleSave} className="rounded-lg px-5 py-2.5 font-semibold text-white transition-colors hover:opacity-90"
            style={{ fontSize: 14, background: '#1E3A8A' }}>
            Register Asset
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
