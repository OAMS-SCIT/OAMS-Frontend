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
  if (!expiry) return { color: '#94A3B8' };
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return { color: '#EF4444', fontWeight: 600 };
  if (days <= 30) return { color: '#EF4444' };
  if (days <= 90) return { color: '#F59E0B' };
  return { color: '#64748B' };
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>Asset Inventory</h1>
        <button
          onClick={() => { setEditAssetId(undefined); setShowRegister(true); }}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 transition-colors hover:opacity-90"
          style={{ background: '#1E3A8A', color: '#fff', fontSize: 14, fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />
          Register New Asset
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl mb-4 p-4 flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="relative flex-1" style={{ minWidth: 260 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, model, serial number…"
            className="w-full rounded-lg border pl-9 pr-3 py-2 focus:outline-none focus:ring-2"
            style={{ borderColor: '#CBD5E1', fontSize: 13 }}
          />
        </div>
        <div className="flex items-center gap-2">
          <SelectFilter value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} options={STATUSES} placeholder="Status" />
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1); }}
              className="appearance-none rounded-lg border px-3 pr-8 py-2 focus:outline-none cursor-pointer"
              style={{ borderColor: '#CBD5E1', fontSize: 13, color: '#1E293B', background: '#fff' }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>Sort: {o.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#94A3B8' }} />
          </div>
          <button
            onClick={() => setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'))}
            className="rounded-lg border px-3 py-2 hover:bg-gray-50 transition-colors"
            style={{ borderColor: '#CBD5E1', fontSize: 12, color: '#64748B' }}
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
              className="flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors hover:bg-blue-100"
              style={{ background: '#EFF6FF', color: '#2563EB', fontSize: 12, border: '1px solid #BFDBFE' }}>
              {f.label}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16" style={{ fontSize: 13, color: '#64748B' }}>
            Loading assets…
          </div>
        ) : error ? (
          <EmptyState
            icon="assets"
            title="Couldn't load assets"
            subtitle={error}
            action={
              <button onClick={load} className="flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:opacity-90"
                style={{ background: '#1E3A8A', fontSize: 13, fontWeight: 600 }}>
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
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:opacity-90"
                style={{ background: '#1E3A8A', fontSize: 13, fontWeight: 600 }}>
                <Plus className="w-4 h-4" /> Register New Asset
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
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
                        className="text-left px-5 py-3"
                        style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', cursor: h.sortCol ? 'pointer' : 'default' }}
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
                      style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-5 py-3.5" style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>{asset.displayId || asset.id.slice(0, 8) + '…'}</td>
                      <td className="px-5 py-3.5">
                        <div
                          className="font-medium cursor-pointer hover:text-blue-600"
                          style={{ fontSize: 13, color: '#1E293B' }}
                          onClick={() => router.push(`/admin/inventory/${asset.id}`)}
                        >
                          {asset.name}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div style={{ fontSize: 13, color: '#334155' }}>{asset.brand}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{asset.model}</div>
                      </td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{asset.category.name}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{asset.serialNumber}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={asset.status} /></td>
                      <td className="px-5 py-3.5" style={{ fontSize: 12, ...warrantyStyle(asset.warrantyExpiryDate) }}>
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
                          className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                          style={{ color: '#64748B' }}
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
            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>
                Showing {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} of {total} assets
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg px-3 py-1.5 border transition-colors hover:bg-gray-50 disabled:opacity-40"
                  style={{ fontSize: 13, color: '#475569', borderColor: '#E2E8F0' }}>
                  Previous
                </button>
                <span style={{ fontSize: 13, color: '#64748B' }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-lg px-3 py-1.5 border transition-colors hover:bg-gray-50 disabled:opacity-40"
                  style={{ fontSize: 13, color: '#475569', borderColor: '#E2E8F0' }}>
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
        className="appearance-none rounded-lg border px-3 pr-8 py-2 focus:outline-none focus:ring-2 cursor-pointer"
        style={{ borderColor: '#CBD5E1', fontSize: 13, color: value ? '#1E293B' : '#94A3B8', background: '#fff' }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#94A3B8' }} />
    </div>
  );
}

