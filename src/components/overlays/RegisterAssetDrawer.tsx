'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Plus, Trash2, Upload, FileText, ExternalLink } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { ImageUploadZone, type UploadedImage } from '@/components/ui/ImageUploadZone';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { BrandCombobox, type BrandComboboxHandle } from '@/components/ui/BrandCombobox';
import { DatePicker } from '@/components/ui/DatePicker';
import { VendorSelect } from '@/components/ui/VendorSelect';
import { AssetPicker, toPickable, type PickableAsset } from '@/components/ui/AssetPicker';
import { addMonths, format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  ApiError,
  createAsset,
  deleteAssetImage,
  deleteAssetDocument,
  getAsset,
  getBrands,
  getCategories,
  getCategory,
  updateAsset,
  uploadAssetImages,
  uploadAssetDocuments,
} from '@/lib/api';
import type {
  AssetCondition,
  AssetDetail,
  AssetImageItem,
  AttributeDetail,
  AttributeValuePayload,
  BrandListItem,
  CategoryListItem,
  UpdateAssetPayload,
  VendorListItem,
  WarrantyInput,
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
const WARRANTY_PRESETS = [6, 12, 24];
const ACCEPTED_DOC_TYPES = '.pdf,image/jpeg,image/png';

/** Stable client-side id for warranty rows and staged documents. */
function clientKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `k_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
}

/** start (yyyy-MM-dd) + N months → expiry (yyyy-MM-dd); '' when either is missing/invalid. */
function expiryFromMonths(start: string, months: number): string {
  if (!start || !months || months <= 0) return '';
  try {
    return format(addMonths(parseISO(start), months), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

/** One warranty row in the repeater. `key` is client-only; `id` is set in edit mode. */
interface WarrantyRow {
  key: string;
  id?: string;
  description: string;
  startDate: string;
  expiryDate: string;
  provider: string;
  /** UI-only helper: months → auto-fills the expiry. Not persisted. */
  months: string;
}

/**
 * One document in the common pool. Newly added rows carry a `file` (not yet
 * uploaded); existing rows carry a server `id` + `url`. Relevance is captured
 * inline: invoice / purchase order flags plus the warranty rows it backs
 * (referenced by their client `key`).
 */
interface DocDraft {
  key: string;
  id?: string;
  file?: File;
  fileName: string;
  url?: string;
  isInvoice: boolean;
  isPurchaseOrder: boolean;
  warrantyKeys: string[];
}

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
  purchaseOrderRef: string;
  invoiceRef: string;
  condition: AssetCondition;
  location: string;
}

const EMPTY_FORM: FormState = {
  name: '', description: '', brandId: '', brandName: '', model: '', serialNumber: '',
  categoryId: '', purchaseDate: '', purchasePrice: '',
  purchaseOrderRef: '', invoiceRef: '', condition: 'New', location: '',
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
    purchaseOrderRef: a.purchaseOrderRef ?? '',
    invoiceRef: a.invoiceRef ?? '',
    condition: a.condition,
    location: a.location ?? '',
  };
}

export function RegisterAssetDrawer({ assetId, onClose, onSaved }: Props) {
  const isEdit = !!assetId;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedVendor, setSelectedVendor] = useState<VendorListItem | null>(null);
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
  const [existingImages, setExistingImages] = useState<AssetImageItem[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  // Warranties (Spec 11) — an asset can carry several.
  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  // Common document pool with per-document relevance.
  const [docs, setDocs] = useState<DocDraft[]>([]);
  // Server document ids the user removed in edit mode (deleted on save).
  const [removedDocIds, setRemovedDocIds] = useState<string[]>([]);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Linked accessories (OAMS-282). `linkTouched` records whether the admin
  // actually engaged this section: when false the link fields are omitted from
  // the payload entirely, so editing anything else never wipes existing links.
  const [linkEnabled, setLinkEnabled] = useState(false);
  const [linkRole, setLinkRole] = useState<'parent' | 'child'>('child');
  const [linkParent, setLinkParent] = useState<PickableAsset[]>([]);
  const [linkAccessories, setLinkAccessories] = useState<PickableAsset[]>([]);
  const [linkTouched, setLinkTouched] = useState(false);

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
          setSelectedVendor(asset.vendor);
          setExistingImages(asset.images ?? []);

          // Warranties: the server id doubles as the client key so documents'
          // warrantyIds line up with the warranty rows directly.
          setWarranties(
            (asset.warranties ?? []).map((w) => ({
              key: w.id,
              id: w.id,
              description: w.description,
              startDate: w.startDate ?? '',
              expiryDate: w.expiryDate ?? '',
              provider: w.provider ?? '',
              months: '',
            })),
          );
          setDocs(
            (asset.documents ?? []).map((d) => ({
              key: d.id,
              id: d.id,
              fileName: d.fileName,
              url: d.url,
              isInvoice: d.isInvoice,
              isPurchaseOrder: d.isPurchaseOrder,
              warrantyKeys: d.warrantyIds,
            })),
          );

          // An asset is either an accessory or a parent, never both.
          if (asset.parentAsset) {
            setLinkEnabled(true);
            setLinkRole('child');
            setLinkParent([toPickable(asset.parentAsset)]);
          } else if ((asset.accessories?.length ?? 0) > 0) {
            setLinkEnabled(true);
            setLinkRole('parent');
            setLinkAccessories(asset.accessories.map(toPickable));
          }
          // Pre-load attributes for the asset's category
          const detail = await getCategory(asset.category.id);
          setCategoryAttrs(detail.attributes);
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

  // Brand is one-of: an existing id OR a new name (created on save).
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

  // ── Warranties ─────────────────────────────────────────────────────────────

  const addWarranty = () => {
    setWarranties((ws) => [
      ...ws,
      { key: clientKey(), description: '', startDate: '', expiryDate: '', provider: '', months: '' },
    ]);
  };

  const updateWarranty = (key: string, patch: Partial<WarrantyRow>) => {
    setWarranties((ws) => ws.map((w) => (w.key === key ? { ...w, ...patch } : w)));
    setErrors((e) => ({ ...e, [`warranty_${key}`]: '' }));
  };

  const removeWarranty = (key: string) => {
    setWarranties((ws) => ws.filter((w) => w.key !== key));
    // Drop this warranty's relevance from every document.
    setDocs((ds) =>
      ds.map((d) => ({ ...d, warrantyKeys: d.warrantyKeys.filter((k) => k !== key) })),
    );
  };

  // ── Documents ────────────────────────────────────────────────────────────

  const addDocFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const added: DocDraft[] = Array.from(fileList).map((file) => ({
      key: clientKey(),
      file,
      fileName: file.name,
      isInvoice: false,
      isPurchaseOrder: false,
      warrantyKeys: [],
    }));
    setDocs((ds) => [...ds, ...added]);
    setErrors((e) => ({ ...e, documents: '' }));
  };

  const removeDoc = (key: string) => {
    setDocs((ds) => {
      const doc = ds.find((d) => d.key === key);
      if (doc?.id) setRemovedDocIds((ids) => [...ids, doc.id!]);
      return ds.filter((d) => d.key !== key);
    });
  };

  /** Invoice / PO are single-per-asset, so ticking one clears it on the others. */
  const setDocRole = (key: string, role: 'invoice' | 'po', value: boolean) => {
    setDocs((ds) =>
      ds.map((d) => {
        if (d.key === key) {
          return role === 'invoice'
            ? { ...d, isInvoice: value }
            : { ...d, isPurchaseOrder: value };
        }
        if (value) {
          // Clear the same role on other docs.
          return role === 'invoice'
            ? { ...d, isInvoice: false }
            : { ...d, isPurchaseOrder: false };
        }
        return d;
      }),
    );
  };

  const toggleDocWarranty = (key: string, warrantyKey: string) => {
    setDocs((ds) =>
      ds.map((d) => {
        if (d.key !== key) return d;
        const has = d.warrantyKeys.includes(warrantyKey);
        return {
          ...d,
          warrantyKeys: has
            ? d.warrantyKeys.filter((k) => k !== warrantyKey)
            : [...d.warrantyKeys, warrantyKey],
        };
      }),
    );
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

    for (const w of warranties) {
      if (!w.description.trim()) {
        e[`warranty_${w.key}`] = 'Description is required';
      } else if (w.startDate && w.expiryDate && w.expiryDate <= w.startDate) {
        e[`warranty_${w.key}`] = 'Expiry must be after start date';
      }
    }

    if (loadingAttrs) {
      toast.error('Category attributes are still loading, please wait.');
      return false;
    }

    for (const attr of categoryAttrs) {
      if (attr.isRequired && !attrValues[attr.id]?.trim()) {
        e[`attr_${attr.id}`] = `${attr.label} is required`;
      }
    }

    if (linkEnabled && linkRole === 'child' && linkParent.length === 0) {
      e.linkedAsset = 'Select the parent asset this accessory belongs to';
    }
    if (linkEnabled && linkRole === 'parent' && linkAccessories.length === 0) {
      e.linkedAsset = 'Select at least one accessory to link';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  /**
   * Resolve a staged document's server id: existing docs already have one, new
   * ones get it from the upload result (keyed by client key).
   */
  const buildDocumentPayload = (idByKey: Record<string, string>) => {
    const resolve = (d: DocDraft) => d.id ?? idByKey[d.key];

    const warrantyPayload: WarrantyInput[] = warranties.map((w) => ({
      id: w.id,
      key: w.id ? undefined : w.key,
      description: w.description.trim(),
      startDate: w.startDate || undefined,
      expiryDate: w.expiryDate || undefined,
      provider: w.provider.trim() || undefined,
      documentIds: docs
        .filter((d) => d.warrantyKeys.includes(w.key))
        .map(resolve)
        .filter((id): id is string => !!id),
    }));

    const invoiceDoc = docs.find((d) => d.isInvoice);
    const poDoc = docs.find((d) => d.isPurchaseOrder);

    return {
      warranties: warrantyPayload,
      invoiceDocumentId: invoiceDoc ? resolve(invoiceDoc) ?? null : null,
      purchaseOrderDocumentId: poDoc ? resolve(poDoc) ?? null : null,
    };
  };

  const handleSave = async () => {
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

    const linkFields: Pick<UpdateAssetPayload, 'parentAssetId' | 'accessoryIds'> =
      !linkTouched
        ? {}
        : !linkEnabled
          ? isEdit
            ? { parentAssetId: null, accessoryIds: [] }
            : {}
          : linkRole === 'child'
            ? { parentAssetId: linkParent[0]?.id ?? null, accessoryIds: [] }
            : { parentAssetId: null, accessoryIds: linkAccessories.map((a) => a.id) };

    // New (unsaved) documents, in a fixed order so upload results map back.
    const newDocs = docs.filter((d) => !d.id && d.file);

    try {
      let saved: AssetDetail;

      if (isEdit) {
        // 1. Core fields.
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
          vendorId: selectedVendor?.id || undefined,
          purchaseOrderRef: form.purchaseOrderRef.trim() || undefined,
          invoiceRef: form.invoiceRef.trim() || undefined,
          customAttributes,
          ...linkFields,
        });

        // 2. Images — deletes before uploads so the 5-image cap is fair.
        try {
          for (const imageId of removedImageIds) {
            saved = await deleteAssetImage(assetId!, imageId);
          }
          if (uploadedImages.length > 0) {
            saved = await uploadAssetImages(assetId!, uploadedImages.map((i) => i.file));
          }
        } catch {
          toast.error('Asset details saved, but updating images failed. Try again from Edit.');
        }

        // 3. Documents + warranties.
        try {
          for (const docId of removedDocIds) {
            await deleteAssetDocument(assetId!, docId);
          }
          const idByKey: Record<string, string> = {};
          if (newDocs.length > 0) {
            const res = await uploadAssetDocuments(assetId!, newDocs.map((d) => d.file!));
            res.documents.forEach((rd, i) => { idByKey[newDocs[i].key] = rd.id; });
          }
          saved = await updateAsset(assetId!, buildDocumentPayload(idByKey));
        } catch {
          toast.error('Asset details saved, but updating documents/warranties failed. Try again from Edit.');
        }

        toast.success('Asset updated successfully.');
      } else {
        // 1. Create the asset (warranties/documents are wired up afterwards, once
        //    the asset id exists and any files are uploaded).
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
          vendorId: selectedVendor?.id || undefined,
          purchaseOrderRef: form.purchaseOrderRef.trim() || undefined,
          invoiceRef: form.invoiceRef.trim() || undefined,
          customAttributes,
          ...linkFields,
        });

        if (uploadedImages.length > 0) {
          try {
            saved = await uploadAssetImages(saved.id, uploadedImages.map((i) => i.file));
          } catch {
            toast.error('Asset created, but image upload failed. Add images via Edit.');
          }
        }

        if (warranties.length > 0 || docs.length > 0) {
          try {
            const idByKey: Record<string, string> = {};
            if (newDocs.length > 0) {
              const res = await uploadAssetDocuments(saved.id, newDocs.map((d) => d.file!));
              res.documents.forEach((rd, i) => { idByKey[newDocs[i].key] = rd.id; });
            }
            saved = await updateAsset(saved.id, buildDocumentPayload(idByKey));
          } catch {
            toast.error('Asset created, but saving documents/warranties failed. Add them via Edit.');
          }
        }

        toast.success('Asset registered successfully.');
      }

      if (brand.brandName && !brands.some((b) => b.id === saved.brand.id)) {
        toast.success('Brand added successfully');
      }
      uploadedImages.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      onSaved(saved);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save asset.');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit-mode image management (deferred to save) ──────────────────────────

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

            {/* Section 3 - Purchase (no document upload here — see Documents) */}
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
              <FormField label="Vendor / Supplier">
                <VendorSelect value={selectedVendor} onChange={setSelectedVendor} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Purchase Order Reference (Optional)">
                  <input type="text" value={form.purchaseOrderRef} onChange={(e) => set('purchaseOrderRef', e.target.value)}
                    className="form-input" placeholder="e.g. PO-2024-001" />
                </FormField>
                <FormField label="Invoice Reference (Optional)">
                  <input type="text" value={form.invoiceRef} onChange={(e) => set('invoiceRef', e.target.value)}
                    className="form-input" placeholder="e.g. INV-2024-001" />
                </FormField>
              </div>
            </FormSection>

            {/* Section 4 - Warranties (multiple) */}
            <FormSection title="Warranties">
              <p className="text-2xs text-muted-foreground -mt-1">
                Add each warranty separately — e.g. a 1-year hardware warranty and a 2-year service warranty.
              </p>
              {warranties.length === 0 && (
                <p className="text-xs text-muted-foreground/80 italic">No warranties added yet.</p>
              )}
              {warranties.map((w, idx) => (
                <div key={w.key} className="rounded-control border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-semibold text-muted-foreground">Warranty {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeWarranty(w.key)}
                      className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-danger transition-colors"
                      aria-label="Remove warranty"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <FormField label="Description" required error={errors[`warranty_${w.key}`]}>
                    <input
                      type="text"
                      value={w.description}
                      onChange={(e) => updateWarranty(w.key, { description: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Hardware, Service"
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Start Date">
                      <DatePicker
                        value={w.startDate}
                        onChange={(v) => {
                          const ex = expiryFromMonths(v, parseInt(w.months, 10));
                          updateWarranty(w.key, { startDate: v, ...(ex ? { expiryDate: ex } : {}) });
                        }}
                        ariaLabel="Warranty Start Date"
                        className="w-full"
                      />
                    </FormField>
                    <FormField label="Expiry Date">
                      <DatePicker
                        value={w.expiryDate}
                        onChange={(v) => updateWarranty(w.key, { expiryDate: v })}
                        ariaLabel="Warranty Expiry Date"
                        className="w-full"
                      />
                    </FormField>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap -mt-1">
                    <span className="text-2xs text-muted-foreground">Period:</span>
                    {WARRANTY_PRESETS.map((m) => {
                      const apply = () => {
                        const ex = expiryFromMonths(w.startDate, m);
                        updateWarranty(w.key, { months: String(m), ...(ex ? { expiryDate: ex } : {}) });
                      };
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={apply}
                          disabled={!w.startDate}
                          className={`rounded-control border px-2.5 py-1 text-2xs transition-colors disabled:opacity-40 ${
                            w.months === String(m)
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border text-foreground/70 hover:bg-muted'
                          }`}
                        >
                          {m} mo
                        </button>
                      );
                    })}
                    <input
                      type="number"
                      min="0"
                      value={w.months}
                      onChange={(e) => {
                        const ex = expiryFromMonths(w.startDate, parseInt(e.target.value, 10));
                        updateWarranty(w.key, { months: e.target.value, ...(ex ? { expiryDate: ex } : {}) });
                      }}
                      disabled={!w.startDate}
                      placeholder="months"
                      className="w-20 rounded-control border border-input bg-input-background px-2 py-1 text-2xs text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary disabled:opacity-40"
                    />
                    <span className="text-2xs text-muted-foreground/70">
                      {w.startDate ? 'auto-fills expiry' : 'set a start date first'}
                    </span>
                  </div>
                  <FormField label="Provider / Contact (Optional)">
                    <input
                      type="text"
                      value={w.provider}
                      onChange={(e) => updateWarranty(w.key, { provider: e.target.value })}
                      className="form-input"
                      placeholder="Provider name or contact info"
                    />
                  </FormField>
                </div>
              ))}
              <button
                type="button"
                onClick={addWarranty}
                className="flex items-center gap-1.5 rounded-control border border-dashed border-border px-3 py-2 text-2sm text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="w-4 h-4" /> Add warranty
              </button>
            </FormSection>

            {/* Section 5 - Documents (common upload + relevance) */}
            <FormSection title="Documents">
              <p className="text-2xs text-muted-foreground -mt-1">
                Upload each file once, then mark what it is. A single file can be the invoice and back one or more warranties.
              </p>
              <input
                ref={docInputRef}
                type="file"
                accept={ACCEPTED_DOC_TYPES}
                multiple
                hidden
                onChange={(e) => {
                  addDocFiles(e.target.files);
                  if (docInputRef.current) docInputRef.current.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-control border border-dashed border-border px-3 py-2 text-2sm text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              >
                <Upload className="w-4 h-4" /> Upload files
              </button>
              {errors.documents && <p className="text-2xs text-danger">{errors.documents}</p>}

              {docs.length === 0 ? (
                <p className="text-xs text-muted-foreground/80 italic">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {docs.map((d) => (
                    <div key={d.key} className="rounded-control border border-border p-3 space-y-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                        {d.url ? (
                          <a href={d.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-2sm text-primary hover:underline truncate">
                            <span className="truncate">{d.fileName}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-2sm text-foreground truncate">{d.fileName}</span>
                        )}
                        {!d.id && <span className="text-2xs text-muted-foreground shrink-0">(new)</span>}
                        <button
                          type="button"
                          onClick={() => removeDoc(d.key)}
                          className="ml-auto rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-danger transition-colors"
                          aria-label="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pl-6">
                        <RelevanceCheckbox
                          label="Invoice"
                          checked={d.isInvoice}
                          onChange={(v) => setDocRole(d.key, 'invoice', v)}
                        />
                        <RelevanceCheckbox
                          label="Purchase Order"
                          checked={d.isPurchaseOrder}
                          onChange={(v) => setDocRole(d.key, 'po', v)}
                        />
                        {warranties.map((w, idx) => (
                          <RelevanceCheckbox
                            key={w.key}
                            label={w.description.trim() || `Warranty ${idx + 1}`}
                            checked={d.warrantyKeys.includes(w.key)}
                            onChange={() => toggleDocWarranty(d.key, w.key)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>

            {/* Section 6 - Physical */}
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

            {/* Linked Asset (OAMS-282). */}
            <FormSection title="Linked Asset">
              <label className="flex items-center gap-2 text-2sm text-foreground/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={linkEnabled}
                  onChange={(e) => {
                    setLinkEnabled(e.target.checked);
                    setLinkTouched(true);
                    setErrors((prev) => ({ ...prev, linkedAsset: '' }));
                  }}
                />
                Is this a linked asset?
              </label>

              {linkEnabled && (
                <>
                  <FormField label="This asset is a">
                    <div className="flex gap-2">
                      {([
                        { key: 'parent', label: 'Parent Asset' },
                        { key: 'child', label: 'Child Asset (Accessory)' },
                      ] as const).map((role) => (
                        <button
                          key={role.key}
                          type="button"
                          onClick={() => {
                            setLinkRole(role.key);
                            setLinkTouched(true);
                            setErrors((prev) => ({ ...prev, linkedAsset: '' }));
                          }}
                          className={`flex-1 rounded-control py-2 border text-2sm font-medium transition-all ${
                            linkRole === role.key
                              ? 'border-primary bg-secondary text-secondary-foreground'
                              : 'border-border bg-card text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </FormField>

                  {linkRole === 'child' ? (
                    <FormField label="Parent asset" required error={errors.linkedAsset}>
                      <AssetPicker
                        mode="single"
                        selected={linkParent}
                        onChange={(next) => {
                          setLinkParent(next);
                          setLinkTouched(true);
                          setErrors((prev) => ({ ...prev, linkedAsset: '' }));
                        }}
                        excludeIds={assetId ? [assetId] : []}
                        placeholder="Search the main asset by asset ID or name…"
                      />
                    </FormField>
                  ) : (
                    <FormField label="Linked accessories" required error={errors.linkedAsset}>
                      <AssetPicker
                        mode="multiple"
                        selected={linkAccessories}
                        onChange={(next) => {
                          setLinkAccessories(next);
                          setLinkTouched(true);
                          setErrors((prev) => ({ ...prev, linkedAsset: '' }));
                        }}
                        excludeIds={assetId ? [assetId] : []}
                        placeholder="Search an accessory by asset ID or name…"
                      />
                    </FormField>
                  )}
                </>
              )}
            </FormSection>

            {/* Section 7 - Images. */}
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

/** A compact relevance checkbox used in the document rows. */
function RelevanceCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-2xs text-foreground/80 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="truncate max-w-[140px]">{label}</span>
    </label>
  );
}
