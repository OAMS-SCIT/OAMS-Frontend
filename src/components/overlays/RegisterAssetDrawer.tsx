'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { ImageUploadZone, type UploadedImage } from '@/components/ui/ImageUploadZone';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { BrandCombobox, type BrandComboboxHandle } from '@/components/ui/BrandCombobox';
import { DatePicker } from '@/components/ui/DatePicker';
import { toast } from 'sonner';
import {
  ApiError,
  createAsset,
  deleteAssetImage,
  getAsset,
  getBrands,
  getCategories,
  getCategory,
  updateAsset,
  uploadAssetImages,
} from '@/lib/api';
import type {
  AssetCondition,
  AssetDetail,
  AssetImageItem,
  AttributeDetail,
  AttributeValuePayload,
  BrandListItem,
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
  /** Existing-brand id; mutually exclusive with brandName. */
  brandId: string;
  /** New-brand name (created on save); mutually exclusive with brandId. */
  brandName: string;
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
  name: '', description: '', brandId: '', brandName: '', model: '', serialNumber: '',
  categoryId: '', purchaseDate: '', purchasePrice: '', vendorName: '',
  purchaseOrderRef: '', warrantyStartDate: '', warrantyExpiryDate: '',
  warrantyProvider: '', condition: 'New', location: '',
};

function assetDetailToForm(a: AssetDetail): FormState {
  return {
    name: a.name,
    description: a.description ?? '',
    brandId: a.brand.id,
    brandName: '',
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
  const [brands, setBrands] = useState<BrandListItem[]>([]);
  const brandRef = useRef<BrandComboboxHandle>(null);
  const [categoryAttrs, setCategoryAttrs] = useState<AttributeDetail[]>([]);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingAttrs, setLoadingAttrs] = useState(false);
  const [attrLoadError, setAttrLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  // Edit mode: images already saved on the server, plus the IDs the user has
  // marked for removal. Both adds (uploadedImages) and removals are staged
  // locally and only flushed to the backend on the "Edit Asset" click.
  const [existingImages, setExistingImages] = useState<AssetImageItem[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  // Load categories list + (edit) existing asset on mount
  useEffect(() => {
    const init = async () => {
      try {
        const [catResult, brandResult] = await Promise.all([
          getCategories({ status: 'Active', limit: 100 }),
          getBrands(),
        ]);
        setCategories(catResult.data);
        setBrands(brandResult);

        if (assetId) {
          const asset = await getAsset(assetId);
          setForm(assetDetailToForm(asset));
          setExistingImages(asset.images ?? []);
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

  // Reload dynamic attributes when category selection changes.
  // `loadingInit` is intentionally excluded from deps — the category dropdown
  // is hidden while init is in-flight (create mode) and edit mode pre-loads
  // attrs in the init effect itself, so this effect only needs to run when
  // the user explicitly changes the selected category.
  useEffect(() => {
    if (!form.categoryId) return;
    let cancelled = false;
    setLoadingAttrs(true);
    setAttrLoadError(false);
    setCategoryAttrs([]);
    setAttrValues({});
    getCategory(form.categoryId)
      .then((detail) => { if (!cancelled) setCategoryAttrs(detail.attributes); })
      .catch(() => {
        if (!cancelled) {
          setAttrLoadError(true);
          toast.error('Failed to load category attributes.');
        }
      })
      .finally(() => { if (!cancelled) setLoadingAttrs(false); });
    return () => { cancelled = true; };
  }, [form.categoryId]);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '' }));
  };

  // Brand is one-of: an existing id OR a new name (created on save). Setting one
  // clears the other so only a single value is ever sent.
  const selectExistingBrand = (id: string) => {
    setForm((f) => ({ ...f, brandId: id, brandName: '' }));
    setErrors((e) => ({ ...e, brand: '' }));
  };
  const selectNewBrand = (name: string) => {
    setForm((f) => ({ ...f, brandId: '', brandName: name }));
    setErrors((e) => ({ ...e, brand: '' }));
  };
  const clearBrand = () => setForm((f) => ({ ...f, brandId: '', brandName: '' }));

  const setAttr = (attributeId: string, value: string) => {
    setAttrValues((prev) => ({ ...prev, [attributeId]: value }));
    setErrors((e) => ({ ...e, [`attr_${attributeId}`]: '' }));
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = (brand: { brandId?: string; brandName?: string }): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Asset name is required';
    if (!brand.brandId && !brand.brandName) e.brand = 'Brand is required';
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

    // Block submission while category attributes are still loading —
    // categoryAttrs is [] during the fetch, so required-attr checks would
    // silently pass and allow incomplete records to be created (TC-ASSET-034).
    if (loadingAttrs) {
      toast.error('Category attributes are still loading, please wait.');
      return false;
    }

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
    // Resolve the brand: a committed existing id / new name from form state, or
    // whatever is still typed in the field (exact match → id, else new name).
    // Read the return value directly since form state may not update this tick.
    const brand: { brandId?: string; brandName?: string } =
      form.brandId || form.brandName
        ? { brandId: form.brandId || undefined, brandName: form.brandName || undefined }
        : brandRef.current?.commitTyped() ?? {};

    if (!validate(brand)) {
      toast.error('Please fix the highlighted fields before saving.');
      return;
    }
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
          brandId: brand.brandId,
          brandName: brand.brandName,
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
        // Flush deferred image changes. Deletes run BEFORE the upload so the
        // backend's 5-image cap is evaluated against the post-deletion count.
        // Each call returns the full updated detail, so the last one wins.
        try {
          for (const imageId of removedImageIds) {
            saved = await deleteAssetImage(assetId!, imageId);
          }
          if (uploadedImages.length > 0) {
            saved = await uploadAssetImages(
              assetId!,
              uploadedImages.map((i) => i.file),
            );
          }
        } catch {
          toast.error('Asset details saved, but updating images failed. Try again from Edit.');
        }
        toast.success('Asset updated successfully.');
      } else {
        saved = await createAsset({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          brandId: brand.brandId,
          brandName: brand.brandName,
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
        // Persist any images selected during registration (previously discarded).
        if (uploadedImages.length > 0) {
          try {
            saved = await uploadAssetImages(
              saved.id,
              uploadedImages.map((i) => i.file),
            );
          } catch {
            toast.error('Asset created, but image upload failed. Add images via Edit.');
          }
        }
        toast.success('Asset registered successfully.');
      }
      // If we sent a new brand name and the resolved brand wasn't already in our
      // list, the backend created it — surface the spec's confirmation message.
      if (brand.brandName && !brands.some((b) => b.id === saved.brand.id)) {
        toast.success('Brand added successfully');
      }
      // Staged previews are object URLs — revoke them now that they're saved.
      uploadedImages.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save asset.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit-mode image management (deferred to "Edit Asset" click) ────────────

  // Mark an existing (server) image for deletion. The actual DELETE is deferred
  // to handleSave so nothing hits the backend until "Edit Asset" is clicked;
  // clicking Cancel discards the removal. New files are staged via
  // setUploadedImages (same as register) and uploaded on save too.
  const handleRemoveExistingImage = (imageId: string) => {
    setRemovedImageIds((ids) => [...ids, imageId]);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderAttrInput = (attr: AttributeDetail) => {
    const fieldId = `attr-${attr.id}`;
    const val = attrValues[attr.id] ?? '';
    const err = errors[`attr_${attr.id}`];

    if (attr.type === 'Dropdown') {
      return (
        <FormField key={attr.id} fieldId={fieldId} label={attr.label} required={attr.isRequired} error={err}>
          <SearchableSelect
            value={val}
            onValueChange={(v) => setAttr(attr.id, v)}
            placeholder="Select…"
            searchPlaceholder={`Search ${attr.label.toLowerCase()}…`}
            ariaLabel={attr.label}
            className="w-full"
            options={[{ value: '', label: 'Select…' }, ...attr.options.map((opt) => ({ value: opt.label, label: opt.label }))]}
          />
        </FormField>
      );
    }

    return (
      <FormField key={attr.id} fieldId={fieldId} label={attr.label} required={attr.isRequired} error={err}>
        <input
          id={fieldId}
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

  const { closing, requestClose } = useDrawerAnimation(onClose);
  return (
    <OverlayPortal>
      <div className={`fixed inset-0 z-40 bg-scrim backdrop-blur-[2px] ${closing ? 'motion-safe:animate-overlay-out' : 'motion-safe:animate-overlay-in'}`} onClick={requestClose} />
      <div className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[520px] bg-card text-card-foreground shadow-drawer rounded-l-[16px] ${closing ? 'motion-safe:animate-drawer-out' : 'motion-safe:animate-drawer-in'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">
              {isEdit ? 'Edit Asset' : 'Register New Asset'}
            </h2>
            <p className="text-2sm text-muted-foreground mt-0.5">
              {isEdit ? 'Update the details for this asset' : 'Fill in the details to register a new asset'}
            </p>
          </div>
          <button onClick={requestClose} className="rounded-control p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {loadingInit ? (
          <div className="flex-1 flex items-center justify-center text-2sm text-muted-foreground">
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
                  <BrandCombobox
                    ref={brandRef}
                    brands={brands}
                    brandId={form.brandId}
                    brandName={form.brandName}
                    onSelectExisting={selectExistingBrand}
                    onSelectNew={selectNewBrand}
                    onClear={clearBrand}
                    error={errors.brand}
                  />
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
                <SearchableSelect
                  value={form.categoryId}
                  onValueChange={(v) => set('categoryId', v)}
                  placeholder="Select a category…"
                  searchPlaceholder="Search categories…"
                  ariaLabel="Category"
                  className="w-full"
                  disabled={isEdit}
                  options={[{ value: '', label: 'Select a category…' }, ...categories.map((c) => ({ value: c.id, label: c.name.length > 45 ? c.name.slice(0, 45) + '…' : c.name }))]}
                />
              </FormField>
              {!form.categoryId && (
                <p className="text-xs text-muted-foreground/80 italic">Select a category to see additional fields</p>
              )}
              {loadingAttrs && (
                <p className="text-xs text-muted-foreground/80">Loading attributes…</p>
              )}
              {attrLoadError && !loadingAttrs && (
                <p style={{ fontSize: 12, color: '#EF4444' }}>
                  Failed to load category attributes. Please try selecting the category again.
                </p>
              )}
              {categoryAttrs.map(renderAttrInput)}
            </FormSection>

            {/* Section 3 - Purchase */}
            <FormSection title="Purchase Details">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Purchase Date" required error={errors.purchaseDate}>
                  <DatePicker value={form.purchaseDate} onChange={(v) => set('purchaseDate', v)} ariaLabel="Purchase Date" className="w-full" />
                </FormField>
                <FormField label="Purchase Price" required error={errors.purchasePrice}>
                  <div className="relative">
                    <span className="absolute top-1/2 -translate-y-1/2 pointer-events-none select-none text-sm left-3 z-[1] text-muted-foreground/70">
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
                  <DatePicker value={form.warrantyStartDate} onChange={(v) => set('warrantyStartDate', v)} ariaLabel="Warranty Start Date" className="w-full" />
                </FormField>
                <FormField label="Warranty Expiry Date" error={errors.warrantyExpiryDate}>
                  <DatePicker value={form.warrantyExpiryDate} onChange={(v) => set('warrantyExpiryDate', v)} ariaLabel="Warranty Expiry Date" className="w-full" />
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
                      className={`flex-1 rounded-control py-2 border text-2sm font-medium transition-all ${
                        form.condition === c
                          ? 'border-primary bg-secondary text-secondary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted'
                      }`}>
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

            {/* Section 6 - Images. Both modes stage changes locally and flush
                them on save. Edit also shows existing server images, hiding any
                the user has marked for removal. */}
            <FormSection title="Asset Images">
              {isEdit ? (
                <ImageUploadZone
                  images={uploadedImages}
                  onChange={setUploadedImages}
                  existing={existingImages
                    .filter((i) => !removedImageIds.includes(i.id))
                    .map((i) => ({ id: i.id, url: i.url }))}
                  onRemoveExisting={handleRemoveExistingImage}
                />
              ) : (
                <ImageUploadZone images={uploadedImages} onChange={setUploadedImages} />
              )}
            </FormSection>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-bl-[16px]">
          <button onClick={requestClose} className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || loadingInit || loadingAttrs}
            className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Edit Asset' : 'Register Asset'}
          </button>
        </div>
      </div>

      <style>{`
        .form-input {
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
        .form-input:focus {
          border-color: var(--ring);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 15%, transparent);
        }
        .form-input::placeholder {
          color: color-mix(in srgb, var(--muted-foreground) 60%, transparent);
        }
        .form-input:disabled { background: var(--muted); cursor: not-allowed; }
        .form-input.font-mono { font-family: monospace; }
      `}</style>
    </OverlayPortal>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-semibold mb-3 pb-2 text-sm text-foreground border-b border-border/60">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormField({ label, fieldId, required, error, children }: { label: string; fieldId?: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={fieldId} className="block mb-1.5 text-xs font-medium text-foreground/80">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
