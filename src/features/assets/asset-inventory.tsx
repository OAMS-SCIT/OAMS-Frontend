'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus, Search, ChevronDown, Eye, Pencil, MoreHorizontal,
  Trash2, RefreshCw, X, ChevronUp,
} from 'lucide-react';
import type { AssetDetail, AssetListItem, AssetStatus } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PortalMenu, PortalMenuItem } from '@/components/ui/PortalMenu';
import { RegisterAssetDrawer } from '@/components/overlays/RegisterAssetDrawer';
import { ChangeStatusDrawer } from '@/components/overlays/ChangeStatusDrawer';
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog';
import { ApiError, deleteAsset, getAssets } from '@/lib/api';

const PER_PAGE = 10;
const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Under Repair', 'Reserved', 'Lost/Stolen', 'Retired'];
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Added' },
  { value: 'name', label: 'Name' },
  { value: 'purchaseDate', label: 'Purchase Date' },
  { value: 'warrantyExpiryDate', label: 'Warranty Expiry' },
] as const;

type SortBy = 'createdAt' | 'name' | 'purchaseDate' | 'warrantyExpiryDate';

function warrantyStyle(expiry?: string | null) {
  if (!expiry) return 'text-muted-foreground/80';
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'text-danger font-semibold';
  if (days <= 30) return 'text-danger';
  if (days <= 90) return 'text-warning-foreground';
  return 'text-muted-foreground';
}

export function AssetInventory() {
  const router = useRouter();

  // ── Filter / sort state ────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);

  // ── Data state ─────────────────────────────────────────────────────────
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ────────────────────────────────────────────────────────────
  const [openMenu, setOpenMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [editAssetId, setEditAssetId] = useState<string | undefined>(undefined);
  const [changeStatusAsset, setChangeStatusAsset] = useState<AssetListItem | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<AssetListItem | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAssets({
        search: debouncedSearch || undefined,
        status: (filterStatus as AssetStatus) || undefined,
        sortBy,
        sortOrder,
        page,
        limit: PER_PAGE,
      });
      setAssets(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets.');
      setAssets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus, sortBy, sortOrder, page]);

  useEffect(() => { load(); }, [load]);

  // ── Sort toggle ────────────────────────────────────────────────────────
  const handleSort = (col: SortBy) => {
    if (col === sortBy) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(col);
      setSortOrder('DESC');
    }
    setPage(1);
  };

  // ── Actions ────────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deletingAsset) return;
    try {
      await deleteAsset(deletingAsset.id);
      toast.success(`Asset "${deletingAsset.name}" deleted.`);
      setDeletingAsset(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete asset.');
      setDeletingAsset(null);
    }
  };

  const handleAssetSaved = (_saved: AssetDetail) => {
    load();
  };

  const handleStatusSaved = (_updated: AssetDetail) => {
    load();
  };

  const activeFilters = [
    filterStatus && { label: filterStatus, clear: () => { setFilterStatus(''); setPage(1); } },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  const SortIcon = ({ col }: { col: SortBy }) => {
    if (sortBy !== col) return null;
    return sortOrder === 'ASC'
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  return (
    <div className="motion-safe:animate-fade-rise">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">Asset Inventory</h1>
        <button
          onClick={() => { setEditAssetId(undefined); setShowRegister(true); }}
          className="flex items-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Register New Asset
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
            placeholder="Search by name, brand, model, serial number…"
            className="w-full rounded-control border border-input bg-input-background text-2sm pl-9 pr-3 py-2 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <SelectFilter value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} options={STATUSES} placeholder="Status" />
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1); }}
              className="appearance-none rounded-control border border-input bg-input-background text-2sm text-foreground px-3 pr-8 py-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>Sort: {o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-muted-foreground/70" />
          </div>
          <button
            onClick={() => setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'))}
            className="rounded-control border border-input px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors"
            title={`Sort: ${sortOrder}`}
          >
            {sortOrder === 'ASC' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {activeFilters.map((f) => (
            <button key={f.label} onClick={f.clear}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs bg-secondary text-secondary-foreground border border-primary/20 transition-colors hover:bg-primary/15">
              {f.label}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg overflow-hidden bg-card border border-border shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-2sm text-muted-foreground">
            Loading assets…
          </div>
        ) : error ? (
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
        ) : assets.length === 0 ? (
          <EmptyState
            icon="assets"
            title="No assets found"
            subtitle="Try adjusting your search or filters, or register a new asset."
            action={
              <button onClick={() => { setEditAssetId(undefined); setShowRegister(true); }}
                className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]">
                <Plus className="w-4 h-4" /> Register New Asset
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-muted/60 border-b-2 border-border">
                    {[
                      { label: 'Asset ID', sortCol: null },
                      { label: 'Asset Name', sortCol: 'name' as SortBy },
                      { label: 'Brand / Model', sortCol: null },
                      { label: 'Category', sortCol: null },
                      { label: 'Serial Number', sortCol: null },
                      { label: 'Status', sortCol: null },
                      { label: 'Warranty Expiry', sortCol: 'warrantyExpiryDate' as SortBy },
                      { label: 'Actions', sortCol: null },
                    ].map((h) => (
                      <th
                        key={h.label}
                        className={`text-left px-5 py-3 micro-label whitespace-nowrap ${h.sortCol ? 'cursor-pointer hover:text-foreground transition-colors' : 'cursor-default'}`}
                        onClick={() => h.sortCol && handleSort(h.sortCol)}
                      >
                        {h.label}
                        {h.sortCol && <SortIcon col={h.sortCol} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset, i) => (
                    <tr
                      key={asset.id}
                      className={`border-b border-border/60 transition-colors hover:bg-primary/[0.04] ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
                    >
                      <td className="px-5 py-3.5 text-xs text-muted-foreground/80 font-mono">{asset.displayId || asset.id.slice(0, 8) + '…'}</td>
                      <td className="px-5 py-3.5">
                        <div
                          className="font-medium cursor-pointer text-2sm text-foreground transition-colors hover:text-primary"
                          onClick={() => router.push(`/admin/inventory/${asset.id}`)}
                        >
                          {asset.name}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-2sm text-foreground/80">{asset.brand}</div>
                        <div className="text-2xs text-muted-foreground/80">{asset.model}</div>
                      </td>
                      <td className="px-5 py-3.5 text-2sm text-muted-foreground">{asset.category.name}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{asset.serialNumber}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={asset.status} /></td>
                      <td className={`px-5 py-3.5 text-xs nums ${warrantyStyle(asset.warrantyExpiryDate)}`}>
                        {asset.warrantyExpiryDate ?? '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenu?.id === asset.id) { setOpenMenu(null); return; }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setOpenMenu({ id: asset.id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          }}
                          className="rounded-control p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenu?.id === asset.id && (
                          <PortalMenu anchor={openMenu} onClose={() => setOpenMenu(null)}>
                            <PortalMenuItem icon={Eye} label="View Details" onClick={() => { router.push(`/admin/inventory/${asset.id}`); setOpenMenu(null); }} />
                            <PortalMenuItem icon={Pencil} label="Edit" onClick={() => { setEditAssetId(asset.id); setShowRegister(true); setOpenMenu(null); }} />
                            <PortalMenuItem icon={RefreshCw} label="Change Status" onClick={() => { setChangeStatusAsset(asset); setOpenMenu(null); }} />
                            <PortalMenuItem icon={Trash2} label="Delete" danger onClick={() => {
                              if (asset.status === 'Assigned') {
                                toast.error('Cannot delete an assigned asset. Return the asset first.');
                                setOpenMenu(null);
                                return;
                              }
                              setDeletingAsset(asset);
                              setOpenMenu(null);
                            }} />
                          </PortalMenu>
                        )}
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
          </>
        )}
      </div>

      {/* Drawers */}
      {showRegister && (
        <RegisterAssetDrawer
          assetId={editAssetId}
          onClose={() => { setShowRegister(false); setEditAssetId(undefined); }}
          onSaved={handleAssetSaved}
        />
      )}
      {changeStatusAsset && (
        <ChangeStatusDrawer
          asset={changeStatusAsset}
          onClose={() => setChangeStatusAsset(null)}
          onSaved={handleStatusSaved}
        />
      )}
      {deletingAsset && (
        <ConfirmDialog
          title="Delete Asset"
          description={`Are you sure you want to delete asset "${deletingAsset.name}" (${deletingAsset.displayId || deletingAsset.id.slice(0, 8)})? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingAsset(null)}
        />
      )}
    </div>
  );
}

function SelectFilter({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none rounded-control border border-input bg-input-background text-2sm px-3 pr-8 py-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 ${value ? 'text-foreground' : 'text-muted-foreground/70'}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-muted-foreground/70" />
    </div>
  );
}

