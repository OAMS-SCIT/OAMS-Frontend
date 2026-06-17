'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
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

  const { closing, requestClose } = useDrawerAnimation(onClose);
  return (
    <OverlayPortal>
      <div className={`fixed inset-0 z-40 bg-scrim backdrop-blur-[2px] ${closing ? 'motion-safe:animate-overlay-out' : 'motion-safe:animate-overlay-in'}`} onClick={requestClose} />
      <div className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[520px] bg-card text-card-foreground shadow-drawer rounded-l-[16px] ${closing ? 'motion-safe:animate-drawer-out' : 'motion-safe:animate-drawer-in'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="text-[17px] font-bold tracking-[-0.01em] text-foreground">Category Details</h2>
            <p className="text-xs text-muted-foreground/80 mt-1">Read-only view of this category and its attributes</p>
          </div>
          <button onClick={requestClose} className="rounded-control p-2 text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-2sm text-muted-foreground/80">
            Loading…
          </div>
        ) : category ? (
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">

            {/* General Information */}
            <section>
              <SectionHeader title="General Information" />
              <div className="rounded-lg overflow-hidden border border-border">
                <ReadRow label="Category Name" value={category.name} />
                <ReadRow label="Description" value={category.description || '—'} />
                <div className="px-4 py-3 border-b border-border/60">
                  <span className="block mb-1.5 micro-label font-semibold tracking-[0.04em]">
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
                <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground nums">
                  {category.attributes.length}
                </span>
              </div>

              {category.attributes.length === 0 ? (
                <p className="text-2sm text-muted-foreground/80 italic">
                  No custom attributes defined for this category.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {category.attributes.map((attr) => (
                    <div
                      key={attr.id}
                      className="rounded-lg px-4 py-3 bg-muted/60 border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2sm font-semibold text-foreground">{attr.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full px-2.5 py-0.5 text-2xs font-medium bg-info-surface text-info-foreground">
                            {attr.type}
                          </span>
                          {attr.isRequired && (
                            <span className="rounded-full px-2.5 py-0.5 text-2xs font-medium bg-danger-surface text-danger-foreground">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      {attr.type === 'Dropdown' && attr.options.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {attr.options.map((opt) => (
                            <span
                              key={opt.id}
                              className="rounded-md px-2 py-0.5 text-2xs bg-card border border-border text-foreground/70"
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
        <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-muted/60 rounded-bl-[16px]">
          <button
            onClick={requestClose}
            className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}

function SectionHeader({ title, inline }: { title: string; inline?: boolean }) {
  if (inline) {
    return (
      <span className="text-2sm font-bold tracking-[-0.01em] text-foreground">{title}</span>
    );
  }
  return (
    <h3 className="text-2sm font-bold tracking-[-0.01em] text-foreground mb-2.5">
      {title}
    </h3>
  );
}

function ReadRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`px-4 py-3 ${last ? '' : 'border-b border-border/60'}`}>
      <span className="block mb-1 micro-label font-semibold tracking-[0.04em]">
        {label}
      </span>
      <span className="text-[13.5px] font-medium text-foreground">{value}</span>
    </div>
  );
}
