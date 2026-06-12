'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
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

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(15,36,96,0.45)' }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 520,
          background: '#fff',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.14)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid #E2E8F0' }}
        >
          <div>
            <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>
              {isEdit ? 'Edit Category' : 'Create Category'}
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              {isEdit
                ? 'Update this category and its attributes'
                : 'Define a new asset category with custom attributes'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ fontSize: 13, color: '#64748B' }}
          >
            Loading category…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Section 1 — General Info */}
            <div>
              <div
                className="font-semibold mb-3 pb-2"
                style={{
                  fontSize: 14,
                  color: '#1E293B',
                  borderBottom: '1px solid #F1F5F9',
                }}
              >
                General Information
              </div>
              <div className="space-y-3">
                <div>
                  <label
                    className="block mb-1.5"
                    style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}
                  >
                    Category Name <span style={{ color: '#EF4444' }}>*</span>
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
                    <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="block mb-1.5"
                    style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}
                  >
                    Description{' '}
                    <span
                      style={{
                        fontSize: 11,
                        color: '#94A3B8',
                        fontWeight: 400,
                      }}
                    >
                      (Optional)
                    </span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="cat-input"
                    style={{ resize: 'vertical' }}
                    placeholder="Brief description of this category…"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 — Dynamic Custom Attributes */}
            <div>
              <div
                className="flex items-center justify-between mb-3 pb-2"
                style={{ borderBottom: '1px solid #F1F5F9' }}
              >
                <span
                  className="font-semibold"
                  style={{ fontSize: 14, color: '#1E293B' }}
                >
                  Custom Attributes
                </span>
                <button
                  onClick={addRow}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors hover:bg-blue-50"
                  style={{
                    fontSize: 12,
                    color: '#2563EB',
                    border: '1px solid #BFDBFE',
                    background: '#EFF6FF',
                  }}
                >
                  <Plus className="w-3 h-3" />
                  Add Attribute
                </button>
              </div>

              {attributes.length === 0 && (
                <p
                  style={{
                    fontSize: 12,
                    color: '#94A3B8',
                    fontStyle: 'italic',
                  }}
                >
                  No attributes yet. Click "+ Add Attribute" to define custom
                  fields for assets in this category.
                </p>
              )}

              <div className="space-y-3">
                {attributes.map((row, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3 space-y-2"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  >
                    {/* Row header */}
                    <div className="flex items-center justify-between">
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#94A3B8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        Attribute {i + 1}
                      </span>
                      <button
                        onClick={() => removeRow(i)}
                        className="rounded-lg p-1 hover:bg-red-50 transition-colors"
                        style={{ color: '#94A3B8' }}
                        title="Remove attribute"
                      >
                        <Trash2
                          className="w-3.5 h-3.5"
                          style={{ color: '#94A3B8' }}
                        />
                      </button>
                    </div>

                    {/* Label + Type */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          className="block mb-1"
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#374151',
                          }}
                        >
                          Label <span style={{ color: '#EF4444' }}>*</span>
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
                          className="cat-input"
                          style={{ fontSize: 12, padding: '6px 10px' }}
                          placeholder="e.g. RAM Size"
                        />
                        {errors[`attr_${i}`] && (
                          <p
                            style={{
                              fontSize: 11,
                              color: '#EF4444',
                              marginTop: 2,
                            }}
                          >
                            {errors[`attr_${i}`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          className="block mb-1"
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#374151',
                          }}
                        >
                          Type
                        </label>
                        <select
                          value={row.type}
                          onChange={(e) =>
                            updateRow(i, {
                              type: e.target.value as AttributeType,
                            })
                          }
                          className="cat-input"
                          style={{ fontSize: 12, padding: '6px 10px' }}
                        >
                          {ATTRIBUTE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Dropdown options sub-input */}
                    {row.type === 'Dropdown' && (
                      <div>
                        <label
                          className="block mb-1"
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#374151',
                          }}
                        >
                          Options{' '}
                          <span
                            style={{ fontWeight: 400, color: '#94A3B8' }}
                          >
                            (comma-separated)
                          </span>
                        </label>
                        <input
                          type="text"
                          value={row.optionsRaw}
                          onChange={(e) =>
                            updateRow(i, { optionsRaw: e.target.value })
                          }
                          className="cat-input"
                          style={{ fontSize: 12, padding: '6px 10px' }}
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
                        className="relative shrink-0 rounded-full transition-colors"
                        style={{
                          width: 32,
                          height: 18,
                          background: row.isRequired ? '#1E3A8A' : '#CBD5E1',
                        }}
                        role="switch"
                        aria-checked={row.isRequired}
                      >
                        <span
                          className="absolute top-0.5 rounded-full bg-white transition-transform"
                          style={{
                            width: 14,
                            height: 14,
                            left: 2,
                            transform: row.isRequired
                              ? 'translateX(14px)'
                              : 'translateX(0)',
                          }}
                        />
                      </button>
                      <span style={{ fontSize: 12, color: '#475569' }}>
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
        <div
          className="flex items-center gap-3 px-6 py-4 justify-end"
          style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}
        >
          <button
            onClick={onClose}
            className="rounded-lg border px-5 py-2.5 font-medium transition-colors hover:bg-gray-50"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-lg px-5 py-2.5 font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60"
            style={{ fontSize: 14, background: '#1E3A8A' }}
          >
            {saving ? 'Saving…' : 'Save Category'}
          </button>
        </div>
      </div>

      <style>{`
        .cat-input {
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
        .cat-input:focus {
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
      `}</style>
    </>
  );
}
