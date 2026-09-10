'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { getAssets, ApiError } from '@/lib/api';
import type { AssetListItem, LinkedAssetRef } from '@/types';

/**
 * The minimum an asset needs for the picker — deliberately narrower than
 * `AssetListItem` so an already-linked `LinkedAssetRef` can be fed straight
 * back in when the edit drawer hydrates.
 */
export interface PickableAsset {
  id: string;
  displayId: string;
  name: string;
  categoryName: string;
  serialNumber?: string;
}

/** Narrows a search result to what the picker displays. */
export function toPickable(asset: AssetListItem | LinkedAssetRef): PickableAsset {
  const categoryName =
    'categoryName' in asset ? asset.categoryName : (asset.category?.name ?? '');
  return {
    id: asset.id,
    displayId: asset.displayId,
    name: asset.name,
    categoryName,
    serialNumber: 'serialNumber' in asset ? asset.serialNumber : undefined,
  };
}

interface AssetPickerProps {
  /** `single` collapses to a preview card on select; `multiple` builds a chip list. */
  mode?: 'single' | 'multiple';
  selected: PickableAsset[];
  onChange: (next: PickableAsset[]) => void;
  /** Assets that must never be offered — e.g. the asset being edited itself. */
  excludeIds?: string[];
  error?: string;
  placeholder?: string;
}

const inputClass =
  'w-full rounded-control border bg-input-background text-2sm text-foreground pl-9 pr-3 py-2.5 placeholder:text-muted-foreground/60 outline-none transition-colors focus:ring-2 focus:ring-ring/40';

/**
 * Searchable asset picker for the Linked Asset section (OAMS-282).
 *
 * Searching is server-side (`GET /assets?search=`), which already matches both
 * the asset ID (`AST-0001`) and the asset name — the two things the admin is
 * told they can search by — so the whole catalogue is reachable rather than
 * just the first page.
 */
export function AssetPicker({
  mode = 'single',
  selected,
  onChange,
  excludeIds = [],
  error,
  placeholder = 'Search by asset ID or name…',
}: AssetPickerProps) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<PickableAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Same 300 ms debounce as VendorSelect.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Promise.resolve() defers the initial loading setter to a microtask so every
  // setState sits inside an async callback — the repo's set-state-in-effect rule.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
        return getAssets({ search: debounced || undefined, limit: 50 });
      })
      .then((res) => {
        if (!cancelled && res) {
          setResults(res.data.map(toPickable));
          setLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResults([]);
          setLoadError(err instanceof ApiError ? err.message : 'Failed to load assets.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hidden = new Set([...excludeIds, ...selected.map((a) => a.id)]);
  const options = results.filter((a) => !hidden.has(a.id));

  const pick = (asset: PickableAsset) => {
    onChange(mode === 'single' ? [asset] : [...selected, asset]);
    setSearch('');
    setOpen(false);
  };

  const remove = (id: string) => onChange(selected.filter((a) => a.id !== id));

  // Single mode collapses into a preview card once something is chosen.
  if (mode === 'single' && selected.length > 0) {
    const asset = selected[0];
    return (
      <div className="rounded-control border border-primary/40 bg-secondary/50 px-3 py-2.5 flex items-start justify-between gap-3 motion-safe:animate-pop-in">
        <div className="min-w-0">
          <div className="font-medium text-2sm text-foreground truncate">{asset.name}</div>
          <div className="text-2xs text-muted-foreground font-mono mt-0.5">
            {asset.displayId} · {asset.categoryName || '—'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange([])}
          className="shrink-0 flex items-center gap-1 rounded-control px-2 py-1 text-2xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <X className="w-3.5 h-3.5" /> Change
        </button>
      </div>
    );
  }

  return (
    <div>
      {mode === 'multiple' && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((asset) => (
            <span
              key={asset.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary text-secondary-foreground pl-2.5 pr-1.5 py-1 text-2xs font-medium"
            >
              <span className="font-mono">{asset.displayId}</span>
              <span className="truncate max-w-[140px]">{asset.name}</span>
              <button
                type="button"
                onClick={() => remove(asset.id)}
                aria-label={`Remove ${asset.displayId}`}
                className="rounded-full p-0.5 transition-colors hover:bg-foreground/10"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div ref={dropdownRef} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground/70" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`${inputClass} ${error ? 'border-danger' : 'border-input focus:border-ring'}`}
        />

        {open && (
          <div className="absolute w-full z-10 rounded-xl mt-1 overflow-hidden overflow-y-auto max-h-[220px] bg-popover border border-border shadow-pop motion-safe:animate-pop-in">
            {loading ? (
              <div className="px-4 py-3 text-2sm text-muted-foreground/80">Searching…</div>
            ) : loadError ? (
              <div className="px-4 py-3 text-2sm text-danger">{loadError}</div>
            ) : options.length === 0 ? (
              <div className="px-4 py-3 text-2sm text-muted-foreground/80">
                No matching assets found
              </div>
            ) : (
              options.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  className="w-full text-left px-4 py-2.5 transition-colors hover:bg-muted"
                  // onMouseDown + preventDefault so the input blur doesn't beat the click.
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    pick(asset);
                  }}
                >
                  <div className="font-medium text-2sm text-foreground">{asset.name}</div>
                  <div className="text-2xs text-muted-foreground font-mono">
                    {asset.displayId} · {asset.categoryName || '—'}
                    {asset.serialNumber ? ` · ${asset.serialNumber}` : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
