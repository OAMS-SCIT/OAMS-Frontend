'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Search, ChevronDown, X, Plus, Check } from 'lucide-react';
import type { VendorListItem } from '@/types';

interface Props {
  vendors: VendorListItem[];
  /** Selected existing vendor id ('' if none). */
  vendorId: string;
  /** Pending new vendor name ('' if none) — created server-side on parent save. */
  vendorName: string;
  onSelectExisting: (id: string) => void;
  onSelectNew: (name: string) => void;
  onClear: () => void;
  error?: string;
  /** Optional: surface when the typed name already exists (case-insensitive). */
  onDuplicate?: (existing: VendorListItem) => void;
  placeholder?: string;
}

/** Imperative surface so the form's submit can resolve typed-but-uncommitted text. */
export interface VendorComboboxHandle {
  /**
   * Resolve the current search text on submit:
   * - exact match to an existing vendor → selects it → { vendorId }
   * - a non-empty new name → marks it pending-new → { vendorName }
   * - nothing typed → {}
   */
  commitTyped: () => { vendorId?: string; vendorName?: string };
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Type-to-filter vendor picker. Selecting an option commits an existing vendor;
 * a name with no match can be committed as a new vendor (visible "Add New" cue)
 * that the backend resolves-or-creates when the parent form is saved — no separate
 * confirm step or extra request.
 */
export const VendorCombobox = forwardRef<VendorComboboxHandle, Props>(function VendorCombobox(
  {
    vendors,
    vendorId,
    vendorName,
    onSelectExisting,
    onSelectNew,
    onClear,
    error,
    onDuplicate,
    placeholder = 'Search or add a vendor…',
  },
  ref,
) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = vendors.find((v) => v.id === vendorId) ?? null;
  const filtered = vendors.filter((v) => norm(v.name).includes(norm(search)));
  const exactMatch = vendors.find((v) => norm(v.name) === norm(search));
  const showAddNew = search.trim() !== '' && !exactMatch;

  // Close on an outside click.
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const pickExisting = (v: VendorListItem) => {
    onSelectExisting(v.id);
    setSearch('');
    setOpen(false);
  };

  const pickNew = (name: string) => {
    const trimmed = name.trim();
    const existing = vendors.find((v) => norm(v.name) === norm(trimmed));
    if (existing) {
      onDuplicate?.(existing);
      pickExisting(existing);
      return;
    }
    onSelectNew(trimmed);
    setSearch('');
    setOpen(false);
  };

  // Resolve typed text when the user commits (submit or Enter).
  const commitTyped = (): { vendorId?: string; vendorName?: string } => {
    const trimmed = search.trim();
    if (!trimmed) return {};
    const exact = vendors.find((v) => norm(v.name) === norm(trimmed));
    if (exact) {
      pickExisting(exact);
      return { vendorId: exact.id };
    }
    pickNew(trimmed);
    return { vendorName: trimmed };
  };

  // No deps array: recreate each render so the handle reads the latest state.
  useImperativeHandle(ref, () => ({ commitTyped }));

  const chip = (label: string, badge?: string) => (
    <div className="flex items-center justify-between rounded-control border border-primary bg-secondary px-3 py-2.5">
      <span className="flex items-center gap-2 min-w-0">
        <span className="font-medium text-2sm text-foreground truncate">{label}</span>
        {badge && (
          <span className="shrink-0 rounded-full bg-primary/10 text-primary text-2xs font-semibold px-2 py-0.5">
            {badge}
          </span>
        )}
      </span>
      <button type="button" onClick={onClear} className="text-primary/60 hover:text-primary transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div ref={rootRef} className="relative">
      {selected ? (
        chip(selected.name)
      ) : vendorName ? (
        chip(vendorName, 'New')
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitTyped(); }
            }}
            placeholder={placeholder}
            className={`w-full rounded-control border bg-input-background text-2sm text-foreground pl-9 pr-8 py-2.5 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 ${
              error ? 'border-danger' : 'border-input focus:border-ring'
            }`}
          />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground/70" />
        </div>
      )}

      {open && !selected && !vendorName && (
        <div className="absolute w-full z-10 rounded-xl mt-1 overflow-hidden overflow-y-auto max-h-[240px] bg-popover border border-border shadow-pop motion-safe:animate-pop-in">
          {filtered.map((v) => (
            <button key={v.id} type="button"
              className="w-full flex items-center justify-between text-left px-4 py-2.5 transition-colors hover:bg-muted"
              onMouseDown={(ev) => { ev.preventDefault(); pickExisting(v); }}>
              <span className="text-2sm text-foreground truncate">{v.name}</span>
              {v.id === vendorId && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          ))}

          {filtered.length === 0 && !showAddNew && (
            <div className="px-4 py-3 text-2sm text-muted-foreground/80">No vendors found</div>
          )}

          {showAddNew && (
            <div className="border-t border-border">
              <button type="button"
                onMouseDown={(ev) => { ev.preventDefault(); pickNew(search.trim()); }}
                className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-2sm font-medium text-primary transition-colors hover:bg-primary/5">
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">Add New “{search.trim()}”</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
