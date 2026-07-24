'use client';

import { useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { getVendors } from '@/lib/api';
import type { VendorListItem, Vendor } from '@/types';
import { AddVendorDialog } from '@/components/overlays/AddVendorDialog';

interface Props {
  value: VendorListItem | null;
  onChange: (v: VendorListItem | null) => void;
}

/**
 * Searchable vendor picker with "Add New Vendor" — same collapse-on-select UX
 * as the Send to Repair form. Selecting collapses to a chip with a Change link.
 */
export function VendorSelect({ value, onChange }: Props) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [vendors, setVendors] = useState<VendorListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (value) return;
    let cancelled = false;
    setLoading(true);
    getVendors({ search: debounced || undefined, sortBy: 'name', sortOrder: 'ASC', limit: 50 })
      .then((res) => { if (!cancelled) setVendors(res.data); })
      .catch(() => { if (!cancelled) setVendors([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [value, debounced]);

  const inputClass =
    'w-full rounded-control border border-input bg-input-background text-2sm text-foreground pl-9 pr-3 py-2 placeholder:text-muted-foreground/60 outline-none transition-colors focus:ring-2 focus:ring-ring/40 focus:border-ring';

  if (value) {
    return (
      <div className="rounded-control border border-border bg-muted/40 px-3 py-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-2sm text-foreground truncate">{value.name}</div>
          {(value.contactPerson || value.contact) && (
            <div className="text-2xs text-muted-foreground truncate">
              {[value.contactPerson, value.contact].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <button type="button" onClick={() => onChange(null)}
          className="shrink-0 text-2sm font-medium text-primary transition-opacity hover:opacity-80">
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors by name…" className={inputClass} />
      </div>
      <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
        {vendors.map((v) => (
          <button key={v.id} type="button" onClick={() => onChange(v)}
            className="w-full text-left rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/60">
            <div className="font-medium text-2sm text-foreground">{v.name}</div>
            {(v.contactPerson || v.contact) && (
              <div className="text-2xs text-muted-foreground">
                {[v.contactPerson, v.contact].filter(Boolean).join(' · ')}
              </div>
            )}
          </button>
        ))}
        {!loading && vendors.length === 0 && (
          <p className="text-2sm text-muted-foreground text-center py-3">No vendors found.</p>
        )}
        <button type="button" onClick={() => setShowAdd(true)}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2.5 text-2sm font-semibold text-primary transition-colors hover:bg-primary/5">
          <Plus className="w-4 h-4" /> Add New Vendor
        </button>
      </div>

      {showAdd && (
        <AddVendorDialog
          onCreated={(vendor: Vendor) =>
            onChange({ id: vendor.id, name: vendor.name, contactPerson: vendor.contactPerson, contact: vendor.contact })
          }
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
