'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Clock, Eye, ImageIcon, RefreshCw, Search, X } from 'lucide-react';
import { ApiError, getMyAssetFilterOptions, getMyAssets } from '@/lib/api';
import { warrantyStyle } from '@/lib/warranty';
import type { AssetStatus, MyAssetFilterOptions, MyAssetListItem } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton';

const PER_PAGE = 10;

/**
 * The employee's My Assets list: every asset currently assigned to the
 * signed-in user, most recent assigned date first. Backed by GET /api/me/assets,
 * which scopes to the JWT user, so this screen can only ever show the caller's
 * own assets.
 */
export function MyAssets() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL is the source of truth for the list state (?q=, ?category=,
  // ?status=, ?page=), so it survives a refresh and coming back from the asset
  // detail view (OAMS-250).
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const status = (searchParams.get('status') ?? '') as AssetStatus | '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const updateQuery = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // The input is local so typing stays instant; it reaches the URL (and the
  // API) after the same 350ms debounce Asset Inventory uses.
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => {
    const term = searchInput.trim();
    if (term === q) return;
    const t = setTimeout(() => updateQuery({ q: term || null, page: null }), 350);
    return () => clearTimeout(t);
  }, [searchInput, q, updateQuery]);

  const setPage = (next: number) => updateQuery({ page: next > 1 ? String(next) : null });
  const clearSearch = () => {
    setSearchInput('');
    updateQuery({ q: null, page: null });
  };
  const setFilter = (key: 'category' | 'status', value: string) =>
    updateQuery({ [key]: value || null, page: null });
  const clearAll = () => {
    setSearchInput('');
    updateQuery({ q: null, category: null, status: null, page: null });
  };

  // Dropdown values: every active category, and the statuses an assigned asset
  // can have (GET /categories is Admin-only, so they come from the /me API).
  // Loaded once; on failure the dropdowns simply offer "All" and the list
  // still works.
  const [options, setOptions] = useState<MyAssetFilterOptions>({ categories: [], statuses: [] });
  useEffect(() => {
    let cancelled = false;
    getMyAssetFilterOptions()
      .then((result) => {
        if (!cancelled) setOptions(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryName = options.categories.find((c) => c.id === category)?.name ?? 'Selected category';
  const isFiltered = Boolean(q || category || status);
  const activeFilters = [
    q && { key: 'q', label: `Search: "${q}"`, clear: clearSearch },
    category && { key: 'category', label: `Category: ${categoryName}`, clear: () => setFilter('category', '') },
    status && { key: 'status', label: `Status: ${status}`, clear: () => setFilter('status', '') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const [rows, setRows] = useState<MyAssetListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Version counter + deferred setState, matching the loaders in asset-detail:
  // setting state synchronously inside an effect body cascades renders.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoading(true);
          setError(null);
        }
        return getMyAssets({
          search: q || undefined,
          categoryId: category || undefined,
          status: status || undefined,
          page,
          limit: PER_PAGE,
        });
      })
      .then((result) => {
        if (cancelled) return;
        setRows(result.data);
        setTotal(result.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load your assets.');
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q, category, status, page, version]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="motion-safe:animate-fade-rise">
      <div className="mb-6">
        <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">My Assets</h1>
        <p className="mt-1 text-2sm text-muted-foreground">Every asset currently assigned to you.</p>
      </div>

      {/* Filter bar */}
      <div className="rounded-lg mb-4 p-4 flex items-center gap-3 flex-wrap bg-card border border-border shadow-card">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, brand, model or serial number…"
            aria-label="Search my assets"
            className="w-full rounded-control border border-input bg-input-background text-2sm pl-9 pr-9 py-2 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-control p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={category}
            onValueChange={(v) => setFilter('category', v)}
            ariaLabel="Filter by category"
            placeholder="Category"
            options={[
              { value: '', label: 'All Categories' },
              ...options.categories.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            value={status}
            onValueChange={(v) => setFilter('status', v)}
            ariaLabel="Filter by status"
            placeholder="Status"
            options={[
              { value: '', label: 'All Statuses' },
              ...options.statuses.map((s) => ({ value: s, label: s })),
            ]}
          />
          <ClearFiltersButton onClear={clearAll} disabled={!isFiltered && !searchInput} />
        </div>
      </div>

      {/* Active filter chips: each one clears just its own filter */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={f.clear}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs bg-secondary text-secondary-foreground border border-primary/20 transition-colors hover:bg-primary/15"
            >
              {f.label}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg overflow-hidden bg-card border border-border shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-2sm text-muted-foreground">
            Loading your assets…
          </div>
        ) : error ? (
          <EmptyState
            icon="myassets"
            title="Couldn't load your assets"
            subtitle={error}
            action={
              <button
                onClick={reload}
                className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            }
          />
        ) : rows.length === 0 && isFiltered ? (
          <EmptyState
            icon="myassets"
            title="No matching assets found"
            subtitle="None of your assets match the current search or filters. Try changing or clearing them."
            action={
              <button
                onClick={clearAll}
                className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold border border-border text-foreground/80 transition-colors hover:bg-muted"
              >
                <X className="w-4 h-4" /> Clear filters
              </button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="myassets"
            title="No assets currently assigned"
            subtitle="No assets are currently assigned to you. Contact your administrator if this is incorrect."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-muted/60 border-b-2 border-border">
                    {[
                      'Asset',
                      'Brand / Model',
                      'Category',
                      'Serial Number',
                      'Status',
                      'Warranty Expiry',
                      'Assigned Date',
                      'Actions',
                    ].map((label) => (
                      <th key={label} className="text-left px-5 py-3 micro-label whitespace-nowrap">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.assignmentId}
                      className={`border-b border-border/60 transition-colors hover:bg-primary/[0.04] ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
                    >
                      {/* Image + name + Asset ID share one cell, like the admin lists. */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <AssetThumb url={row.asset.imageUrl} name={row.asset.name} />
                          <div className="min-w-0">
                            <div className="font-medium text-2sm text-foreground truncate max-w-[220px]" title={row.asset.name}>
                              {row.asset.name}
                            </div>
                            <div className="text-2xs text-muted-foreground/80 font-mono">{row.asset.displayId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-2sm text-foreground/80">{row.asset.brand ?? '—'}</div>
                        <div className="text-2xs text-muted-foreground/80">{row.asset.model}</div>
                      </td>
                      <td className="px-5 py-3.5 text-2sm text-muted-foreground">
                        {row.asset.category?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">
                        {row.asset.serialNumber ?? '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={row.asset.status} />
                        <PendingConfirmation row={row} />
                      </td>
                      <td className={`px-5 py-3.5 text-xs nums whitespace-nowrap ${warrantyStyle(row.asset.warrantyExpiryDate)}`}>
                        {row.asset.warrantyExpiryDate ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs nums text-muted-foreground whitespace-nowrap">
                        {row.assignmentDate}
                      </td>
                      <td className="px-5 py-3.5">
                        {/* Opens the employee asset detail view, which OAMS-250 delivers. */}
                        <button
                          disabled
                          title="Asset details are coming soon"
                          className="flex items-center gap-1 text-2sm font-medium whitespace-nowrap text-foreground/70 transition-colors hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-foreground/70"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-border/60">
              <span className="text-2sm text-muted-foreground nums">
                Showing {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} of {total} assets
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-2sm text-muted-foreground nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AssetThumb({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="flex items-center justify-center shrink-0 w-10 h-10 rounded-control bg-muted border border-border" title="No image">
        <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="shrink-0 w-10 h-10 rounded-control object-cover border border-border" />
  );
}

/**
 * A short, single-line flag under the status badge for a handover the employee
 * still has to confirm (OAMS-251 / OAMS-252). The full wording is the tooltip.
 */
function PendingConfirmation({ row }: { row: MyAssetListItem }) {
  if (row.confirmationStatus !== 'Pending') return null;
  const handback = row.assignmentType === 'Handback';
  return (
    <div
      className="flex items-center gap-1 mt-1.5 text-2xs font-medium whitespace-nowrap text-warning-foreground"
      title={handback ? 'Handback Confirmation Pending' : 'Receipt Confirmation Pending'}
    >
      <Clock className="w-3 h-3" />
      {handback ? 'Handback pending' : 'Receipt pending'}
    </div>
  );
}
