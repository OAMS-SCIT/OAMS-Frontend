'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { toast } from 'sonner';
import {
  ApiError,
  createCategory,
  getCategory,
  updateCategory,
} from '@/lib/api';
import type {
  AttributeDetail,
  AttributeType,
  CreateAttributePayload,
  UpdateAttributePayload,
} from '@/types';

// ── Local form state ──────────────────────────────────────────────────────

interface AttributeRow {
  /** UUID from the server if this is an existing attribute, undefined if new. */
  id?: string;
  label: string;
  type: AttributeType;
  isRequired: boolean;
  order: number;
  /** Comma-separated string used in the textarea for Dropdown options. */
  optionsRaw: string;
  /** Persisted option IDs — needed so the server can soft-delete removed ones. */
  existingOptionIds: { id: string; label: string }[];
}

function newRow(order: number): AttributeRow {
  return {
    label: '',
    type: 'Text',
    isRequired: false,
    order,
    optionsRaw: '',
    existingOptionIds: [],
  };
}

function attributeDetailToRow(attr: AttributeDetail): AttributeRow {
  return {
    id: attr.id,
    label: attr.label,
    type: attr.type,
    isRequired: attr.isRequired,
    order: attr.order,
    optionsRaw: attr.options.map((o) => o.label).join(', '),
    existingOptionIds: attr.options.map((o) => ({ id: o.id, label: o.label })),
  };
}

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  /** Existing category ID to edit. Omit for create mode. */
  categoryId?: string;
  onClose: () => void;
  /** Called after a successful save so the parent can refresh its list. */
  onSaved: () => void;
}

const ATTRIBUTE_TYPES: AttributeType[] = ['Text', 'Number', 'Date', 'Dropdown'];

// ── Component ─────────────────────────────────────────────────────────────

export function CategoryDrawer({ categoryId, onClose, onSaved }: Props) {
  const isEdit = !!categoryId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [attributes, setAttributes] = useState<AttributeRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // Load existing category when in edit mode
  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    getCategory(categoryId)
      .then((detail) => {
        setName(detail.name);
        setDescription(detail.description ?? '');
        setAttributes(detail.attributes.map(attributeDetailToRow));
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load category.');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [categoryId, onClose]);

  // ── Attribute row helpers ────────────────────────────────────────────────

  const addRow = () =>
    setAttributes((a) => [...a, newRow(a.length)]);

  const removeRow = (idx: number) =>
    setAttributes((a) => a.filter((_, i) => i !== idx));

  const updateRow = (idx: number, patch: Partial<AttributeRow>) =>
    setAttributes((a) =>
      a.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );

  // ── Validation ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Category name is required';
    attributes.forEach((row, i) => {
      if (!row.label.trim()) e[`attr_${i}`] = 'Label is required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit) {
        const updatedAttrs: UpdateAttributePayload[] = attributes.map((row) => {
          const base: UpdateAttributePayload = {
            ...(row.id ? { id: row.id } : {}),
            label: row.label.trim(),
            type: row.type,
            isRequired: row.isRequired,
            order: row.order,
          };

          if (row.type === 'Dropdown') {
            // Parse typed options, then merge with existing persisted IDs
            const typedLabels = row.optionsRaw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);

            base.options = typedLabels.map((label) => {
              const existing = row.existingOptionIds.find(
                (o) => o.label === label,
              );
              return existing ? { id: existing.id, label } : { label };
            });
          }

          return base;
        });

        await updateCategory(categoryId!, {
          name: name.trim(),
          description: description.trim() || undefined,
          attributes: updatedAttrs,
        });
        toast.success('Category updated successfully.');
      } else {
        const newAttrs: import('@/types').CreateAttributePayload[] = attributes.map((row) => ({
          label: row.label.trim(),
          type: row.type,
          isRequired: row.isRequired,
          order: row.order,
          options:
            row.type === 'Dropdown'
              ? row.optionsRaw
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((label) => ({ label }))
              : undefined,
        }));

        await createCategory({
          name: name.trim(),
          description: description.trim() || undefined,
          attributes: newAttrs,
        });
        toast.success('Category created successfully.');
      }

      onSaved();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to save category.',
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const { closing, requestClose } = useDrawerAnimation(onClose);
  return (
    <OverlayPortal>
      <div
        className={`fixed inset-0 z-40 bg-scrim backdrop-blur-[2px] ${closing ? 'motion-safe:animate-overlay-out' : 'motion-safe:animate-overlay-in'}`}
        onClick={requestClose}
      />
      <div className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[520px] bg-card text-card-foreground shadow-drawer rounded-l-[16px] ${closing ? 'motion-safe:animate-drawer-out' : 'motion-safe:animate-drawer-in'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">
              {isEdit ? 'Edit Category' : 'Create Category'}
            </h2>
            <p className="text-2sm text-muted-foreground mt-0.5">
              {isEdit
                ? 'Update this category and its attributes'
                : 'Define a new asset category with custom attributes'}
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
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-2sm text-muted-foreground">
            Loading category…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Section 1 — General Info */}
            <div>
              <div className="font-semibold mb-3 pb-2 text-sm text-foreground border-b border-border/60">
                General Information
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-foreground/80">
                    Category Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    maxLength={60}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors((er) => ({ ...er, name: '' }));
                    }}
                    className="cat-input"
                    placeholder="e.g. Laptops, Monitors, Peripherals"
                  />
                  {errors.name && (
                    <p className="text-xs text-danger mt-1">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block mb-1.5 text-xs font-medium text-foreground/80">
                    Description{' '}
                    <span className="text-2xs font-normal text-muted-foreground/70">
                      (Optional)
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="cat-input resize-y"
                    placeholder="Brief description of this category…"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 — Dynamic Custom Attributes */}
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/60">
                <span className="font-semibold text-sm text-foreground">
                  Custom Attributes
                </span>
                <button
                  onClick={addRow}
                  className="flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground border border-primary/20 transition-colors hover:bg-primary/15"
                >
                  <Plus className="w-3 h-3" />
                  Add Attribute
                </button>
              </div>

              {attributes.length === 0 && (
                <p className="text-xs text-muted-foreground/80 italic">
                  No attributes yet. Click "+ Add Attribute" to define custom
                  fields for assets in this category.
                </p>
              )}

              <div className="space-y-3">
                {attributes.map((row, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-3 space-y-2 bg-muted/60 border border-border"
                  >
                    {/* Row header */}
                    <div className="flex items-center justify-between">
                      <span className="micro-label font-semibold tracking-[0.04em]">
                        Attribute {i + 1}
                      </span>
                      <button
                        onClick={() => removeRow(i)}
                        className="rounded-control p-1 text-muted-foreground/80 transition-colors hover:bg-danger-surface hover:text-danger"
                        title="Remove attribute"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Label + Type */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1 text-2xs font-medium text-foreground/80">
                          Label <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          value={row.label}
                          onChange={(e) => {
                            updateRow(i, { label: e.target.value });
                            setErrors((er) => ({
                              ...er,
                              [`attr_${i}`]: '',
                            }));
                          }}
                          className="cat-input cat-input-sm"
                          placeholder="e.g. RAM Size"
                        />
                        {errors[`attr_${i}`] && (
                          <p className="text-2xs text-danger mt-0.5">
                            {errors[`attr_${i}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block mb-1 text-2xs font-medium text-foreground/80">
                          Type
                        </label>
                        <Select
                          value={row.type}
                          onValueChange={(v) =>
                            updateRow(i, { type: v as AttributeType })
                          }
                          ariaLabel="Attribute type"
                          className="w-full text-2xs py-1.5"
                          options={ATTRIBUTE_TYPES.map((t) => ({ value: t, label: t }))}
                        />
                      </div>
                    </div>

                    {/* Dropdown options sub-input */}
                    {row.type === 'Dropdown' && (
                      <div>
                        <label className="block mb-1 text-2xs font-medium text-foreground/80">
                          Options{' '}
                          <span className="font-normal text-muted-foreground/70">
                            (comma-separated)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={row.optionsRaw}
                          onChange={(e) =>
                            updateRow(i, { optionsRaw: e.target.value })
                          }
                          className="cat-input cat-input-sm"
                          placeholder="e.g. Intel, AMD, Apple Silicon"
                        />
                      </div>
                    )}

                    {/* Required toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateRow(i, { isRequired: !row.isRequired })
                        }
                        className={`relative shrink-0 rounded-full transition-colors w-8 h-[18px] ${
                          row.isRequired ? 'bg-primary' : 'bg-input'
                        }`}
                        role="switch"
                        aria-checked={row.isRequired}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 rounded-full bg-white w-3.5 h-3.5 transition-transform ${
                            row.isRequired ? 'translate-x-[14px]' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-xs text-foreground/70">
                        Required field
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-bl-[16px]">
          <button
            onClick={requestClose}
            className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Category'}
          </button>
        </div>
      </div>

      <style>{`
        .cat-input {
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
        .cat-input:focus {
          border-color: var(--ring);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 15%, transparent);
        }
        .cat-input::placeholder {
          color: color-mix(in srgb, var(--muted-foreground) 60%, transparent);
        }
        .cat-input-sm {
          font-size: 12px;
          padding: 6px 10px;
        }
      `}</style>
    </OverlayPortal>
  );
}
