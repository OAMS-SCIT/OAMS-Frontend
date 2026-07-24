'use client';

import { useState } from 'react';
import { Store } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { toast } from 'sonner';
import { ApiError, createVendor } from '@/lib/api';
import type { Vendor } from '@/types';

interface Props {
  /** Called with the created vendor so the parent can select it. */
  onCreated: (vendor: Vendor) => void;
  onClose: () => void;
}

export function AddVendorDialog({ onCreated, onClose }: Props) {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Vendor name is required.');
      return;
    }
    setSaving(true);
    try {
      const vendor = await createVendor({
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        contact: contact.trim() || undefined,
      });
      toast.success(`Vendor "${vendor.name}" added.`);
      onCreated(vendor);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add vendor.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-control border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus:border-primary';

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim backdrop-blur-[2px] motion-safe:animate-overlay-in"
        onClick={onClose}
      >
        <div
          className="rounded-2xl flex flex-col w-[440px] bg-card text-card-foreground shadow-pop motion-safe:animate-pop-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-4">
            <div className="shrink-0 flex items-center justify-center rounded-full w-10 h-10 bg-primary/10">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-bold text-base tracking-[-0.01em] text-foreground">Add New Vendor</h2>
          </div>

          {/* Body */}
          <div className="px-6 pb-2 space-y-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-foreground/80">
                Vendor Name <span className="text-danger">*</span>
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. QuickFix Repairs"
                className={inputClass}
              />
              {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-medium text-foreground/80">Contact Person</label>
              <input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Kamal Silva"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-medium text-foreground/80">Phone / Email</label>
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. +94 77 000 0000"
                className={inputClass}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 py-4 mt-2 justify-end border-t border-border bg-muted/60 rounded-b-2xl">
            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? 'Adding…' : 'Add Vendor'}
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
