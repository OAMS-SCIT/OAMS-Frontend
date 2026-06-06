'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, getCategory } from '@/lib/api';
import type { CategoryDetail } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Props {
  categoryId: string;
  onClose: () => void;
}

export function ViewCategoryDrawer({ categoryId, onClose }: Props) {
  const [category, setCategory] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategory(categoryId)
      .then(setCategory)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : 'Failed to load category.');
        onClose();
      })
      .finally(() => setLoading(false));
  }, [categoryId, onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,36,96,0.45)' }} onClick={onClose} />
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
        style={{ width: 520, background: '#fff', boxShadow: '-8px 0 32px rgba(0,0,0,0.14)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E293B', letterSpacing: '-0.2px' }}>Category Details</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>Read-only view of this category and its attributes</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#94A3B8' }} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center" style={{ fontSize: 13, color: '#94A3B8' }}>
            Loading…
          </div>
        ) : category ? (
          <div className="flex-1 overflow-y-auto px-6 py-6" style={{ gap: 24, display: 'flex', flexDirection: 'column' }}>

            {/* General Information */}
            <section>
              <SectionHeader title="General Information" />
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E2E8F0' }}>
                <ReadRow label="Category Name" value={category.name} />
                <ReadRow label="Description" value={category.description || '—'} />
                <div className="px-4 py-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }}>
                    Status
                  </span>
                  <StatusBadge status={category.status} />
                </div>
                <ReadRow label="Date Created" value={new Date(category.createdAt).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })} />
                <ReadRow label="Asset Count" value={String(category.assetCount)} last />
              </div>
            </section>

            {/* Custom Attributes */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader title="Custom Attributes" inline />
                <span
                  className="rounded-full px-2.5 py-0.5 font-semibold"
                  style={{ fontSize: 12, background: '#EFF6FF', color: '#1E3A8A' }}
                >
                  {category.attributes.length}
                </span>
              </div>

              {category.attributes.length === 0 ? (
                <p style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic' }}>
                  No custom attributes defined for this category.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {category.attributes.map((attr) => (
                    <div
                      key={attr.id}
                      className="rounded-xl px-4 py-3"
                      style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                    >
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{attr.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            className="rounded-full px-2.5 py-0.5"
                            style={{ fontSize: 11, background: '#EFF6FF', color: '#2563EB', fontWeight: 500 }}
                          >
                            {attr.type}
                          </span>
                          {attr.isRequired && (
                            <span
                              className="rounded-full px-2.5 py-0.5"
                              style={{ fontSize: 11, background: '#FEF2F2', color: '#DC2626', fontWeight: 500 }}
                            >
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      {attr.type === 'Dropdown' && attr.options.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          {attr.options.map((opt) => (
                            <span
                              key={opt.id}
                              className="rounded-md px-2 py-0.5"
                              style={{ fontSize: 11, background: '#fff', border: '1px solid #E2E8F0', color: '#475569' }}
                            >
                              {opt.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {/* Footer */}
        <div
          className="flex items-center justify-end px-6 py-4"
          style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}
        >
          <button
            onClick={onClose}
            className="rounded-lg border px-5 py-2.5 font-medium transition-colors hover:bg-gray-50"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function SectionHeader({ title, inline }: { title: string; inline?: boolean }) {
  if (inline) {
    return (
      <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', letterSpacing: '-0.1px' }}>{title}</span>
    );
  }
  return (
    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', letterSpacing: '-0.1px', marginBottom: 10 }}>
      {title}
    </h3>
  );
}

function ReadRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className="px-4 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid #F1F5F9' }}
    >
      <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
        {label}
      </span>
      <span style={{ fontSize: 13.5, color: '#1E293B', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
