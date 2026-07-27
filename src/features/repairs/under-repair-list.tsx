'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Pencil, ArrowRight, RefreshCw, Wrench } from 'lucide-react';
import type { RepairListItem, CategoryListItem } from '@/types';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton';
import { SendToRepairDrawer } from '@/components/overlays/SendToRepairDrawer';
import { ReturnFromRepairDrawer } from '@/components/overlays/ReturnFromRepairDrawer';
import { getRepairs, getCategories } from '@/lib/api';

const PER_PAGE = 10;

/** ISO timestamp → YYYY-MM-DD for display. */
function formatDate(iso: string): string {
  return iso ? iso.slice(0, 10) : '—';
}

export function UnderRepairList() {
  const router = useRouter();

  // ── Filter / sort state ────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sentDateFrom, setSentDateFrom] = useState('');
  const [sentDateTo, setSentDateTo] = useState('');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);

  // ── Data state ─────────────────────────────────────────────────────────
  const [repairs, setRepairs] = useState<RepairListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);

  // ── UI state ────────────────────────────────────────────────────────────
  const [editRepair, setEditRepair] = useState<RepairListItem | null>(null);
  const [returnRepair, setReturnRepair] = useState<RepairListItem | null>(null);
  const [showSendToRepair, setShowSendToRepair] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasActiveFilters = Boolean(search || filterCategory || sentDateFrom || sentDateTo);

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setFilterCategory('');
    setSentDateFrom('');
    setSentDateTo('');
    setPage(1);
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Categories for the filter dropdown
  useEffect(() => {
    getCategories({ status: 'Active', limit: 100 })
      .then((result) => setCategories(result.data))
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRepairs({
        search: debouncedSearch || undefined,
        categoryId: filterCategory || undefined,
        sentDateFrom: sentDateFrom || undefined,
        sentDateTo: sentDateTo || undefined,
        sortOrder,
        page,
        limit: PER_PAGE,
      });
      setRepairs(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets under repair.');
      setRepairs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterCategory, sentDateFrom, sentDateTo, sortOrder, page]);

  useEffect(() => { load(); }, [load]);

  const handleItemReceived = (repair: RepairListItem) => setReturnRepair(repair);

  return (
    <div className="motion-safe:animate-fade-rise">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">Under Repair</h1>
          <p className="text-2sm text-muted-foreground mt-1">Assets currently sent out to a service vendor for repair.</p>
        </div>
        <button
          onClick={() => setShowSendToRepair(true)}
          className="flex items-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98] shrink-0"
        >
          <Wrench className="w-4 h-4" /> Send to Repair
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-lg mb-4 p-4 flex items-center gap-3 flex-wrap bg-card border border-border shadow-card">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by asset name, brand, model, or serial number…"
            className="w-full rounded-control border border-input bg-input-background text-2sm pl-9 pr-3 py-2 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={filterCategory}
            onValueChange={(v) => { setFilterCategory(v); setPage(1); }}
            ariaLabel="Category"
            placeholder="All Categories"
            options={[{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: c.id, label: c.name.length > 45 ? c.name.slice(0, 45) + '…' : c.name }))]}
          />
          <div className="flex items-center gap-2">
            <DatePicker
              value={sentDateFrom}
              onChange={(v) => { setSentDateFrom(v); setPage(1); }}
              ariaLabel="Sent to repair date from"
              placeholder="From"
            />
            <span className="text-2sm text-muted-foreground/70">–</span>
            <DatePicker
              value={sentDateTo}
              onChange={(v) => { setSentDateTo(v); setPage(1); }}
              ariaLabel="Sent to repair date to"
              placeholder="To"
            />
          </div>
          <button
            onClick={() => { setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC')); setPage(1); }}
            className="rounded-control border border-input px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
            title="Sort by sent date"
          >
            {sortOrder === 'DESC' ? '↓ Newest' : '↑ Oldest'}
          </button>
          <ClearFiltersButton onClear={clearFilters} disabled={!hasActiveFilters} />
        </div>
      </div>

      {/* Card list */}
      {loading ? (
        <div className="rounded-lg bg-card border border-border shadow-card flex items-center justify-center py-16 text-2sm text-muted-foreground">
          Loading assets under repair…
        </div>
      ) : error ? (
        <div className="rounded-lg bg-card border border-border shadow-card">
          <EmptyState
            icon="assets"
            title="Couldn't load assets"
            subtitle={error}
            action={
              <button onClick={load} className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]">
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            }
          />
        </div>
      ) : repairs.length === 0 ? (
        <div className="rounded-lg bg-card border border-border shadow-card">
          {hasActiveFilters ? (
            <EmptyState
              icon="assets"
              title="No matching assets found"
              subtitle="No asset under repair matches your search or filters. Try a different search or clear your filters."
            />
          ) : (
            <EmptyState
              icon="assets"
              title="No assets under repair"
              subtitle="Assets sent to a repair vendor will appear here."
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {repairs.map((repair) => (
            <div key={repair.id} className="rounded-lg bg-card border border-border shadow-card p-5">
              {/* Header row */}
              <div className="flex items-start justify-between gap-4">
                <button
                  onClick={() => router.push(`/admin/inventory/${repair.asset.id}`)}
                  className="text-left group"
                >
                  <span className="font-bold text-base tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary">
                    {repair.asset.name}
                  </span>
                  <span className="text-2sm text-muted-foreground"> · {repair.asset.displayId}</span>
                </button>

                <div className="flex items-center gap-5 shrink-0">
                  <button
                    onClick={() => setEditRepair(repair)}
                    className="flex items-center gap-1.5 text-2sm font-medium text-foreground/70 transition-colors hover:text-foreground"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Vendor / Reason
                  </button>
                  <button
                    onClick={() => handleItemReceived(repair)}
                    className="flex items-center gap-1 text-2sm font-semibold text-primary transition-opacity hover:opacity-80"
                  >
                    Item Received <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/60 my-4" />

              {/* Detail grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="micro-label mb-1">Serial Number</div>
                  <div className="text-2sm text-foreground font-mono">{repair.asset.serialNumber}</div>
                </div>
                <div>
                  <div className="micro-label mb-1">Vendor</div>
                  <div className="text-2sm text-foreground">{repair.vendor.name}</div>
                </div>
                <div>
                  <div className="micro-label mb-1">Sent Date</div>
                  <div className="text-2sm text-foreground nums">{formatDate(repair.sentAt)}</div>
                </div>
              </div>

              {/* Reason */}
              <div className="mt-4">
                <div className="micro-label mb-1">Reason</div>
                <div className="text-2sm text-foreground">{repair.reason}</div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between px-1 pt-2">
            <span className="text-2sm text-muted-foreground nums">
              Showing {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} of {total} assets
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40">
                Previous
              </button>
              <span className="text-2sm text-muted-foreground nums">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit vendor / reason — same drawer as the asset detail page, in edit mode */}
      {editRepair && (
        <SendToRepairDrawer
          asset={{ id: editRepair.asset.id, name: editRepair.asset.name, status: 'Under Repair' }}
          mode="edit"
          onClose={() => setEditRepair(null)}
          onSaved={() => { setEditRepair(null); load(); }}
        />
      )}

      {/* Return from repair wizard */}
      {returnRepair && (
        <ReturnFromRepairDrawer
          assetId={returnRepair.asset.id}
          onClose={() => setReturnRepair(null)}
          onDone={() => { setReturnRepair(null); load(); }}
        />
      )}

      {/* Send an asset to repair (asset picked in the form) */}
      {showSendToRepair && (
        <SendToRepairDrawer
          onClose={() => setShowSendToRepair(false)}
          onSaved={() => { setShowSendToRepair(false); load(); }}
        />
      )}
    </div>
  );
}
