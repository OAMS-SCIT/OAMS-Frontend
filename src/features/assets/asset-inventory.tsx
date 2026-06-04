'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronDown, Eye, Pencil, MoreHorizontal, Trash2, RefreshCw, X } from 'lucide-react';
import { Asset, AssetStatus } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { mockUsers } from '@/lib/mock-data';
import { RegisterAssetDrawer } from '@/components/overlays/RegisterAssetDrawer';

interface Props {
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
  onUpdateStatus: (id: string, status: AssetStatus) => void;
}

const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Under Repair', 'Reserved', 'Lost/Stolen', 'Retired'];
const CATEGORIES = ['Laptops', 'Monitors', 'Phones', 'Peripherals', 'Other'];

function getWarrantyStyle(expiry?: string) {
  if (!expiry) return { color: '#94A3B8' };
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return { color: '#EF4444', fontWeight: 600 };
  if (days <= 30) return { color: '#EF4444' };
  if (days <= 90) return { color: '#F59E0B' };
  return { color: '#64748B' };
}

export function AssetInventory({ assets, onAddAsset, onUpdateStatus }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || a.brand.toLowerCase().includes(q)
      || a.model.toLowerCase().includes(q) || a.serialNumber.toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    const matchCat = !filterCategory || a.categoryName === filterCategory;
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const activeFilters = [
    filterCategory && { label: filterCategory, clear: () => setFilterCategory('') },
    filterStatus && { label: filterStatus, clear: () => setFilterStatus('') },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>Asset Inventory</h1>
        <button
          onClick={() => setShowRegister(true)}
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
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, brand, model, serial number..."
            className="w-full rounded-lg border pl-9 pr-3 py-2 focus:outline-none focus:ring-2"
            style={{ borderColor: '#CBD5E1', fontSize: 13 }}
          />
        </div>
        <div className="flex items-center gap-2">
          <SelectFilter value={filterCategory} onChange={v => { setFilterCategory(v); setPage(1); }} options={CATEGORIES} placeholder="Category" />
          <SelectFilter value={filterStatus} onChange={v => { setFilterStatus(v); setPage(1); }} options={STATUSES} placeholder="Status" />
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {activeFilters.map(f => (
            <button key={f.label} onClick={f.clear} className="flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors hover:bg-blue-100"
              style={{ background: '#EFF6FF', color: '#2563EB', fontSize: 12, border: '1px solid #BFDBFE' }}>
              {f.label}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {paginated.length === 0 ? (
          <EmptyState icon="assets" title="No assets found" subtitle="Try adjusting your search or filters, or register a new asset to get started."
            action={
              <button onClick={() => setShowRegister(true)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:opacity-90"
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
                    {['Asset ID', 'Asset Name', 'Brand / Model', 'Category', 'Serial Number', 'Assigned To', 'Status', 'Warranty Expiry', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((asset, i) => {
                    const user = mockUsers.find(u => u.id === asset.assignedToId);
                    const warrantyStyle = getWarrantyStyle(asset.warrantyExpiry);
                    return (
                      <tr key={asset.id}
                        style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}
                        className="group hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3.5" style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>{asset.id}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium cursor-pointer hover:text-blue-600" style={{ fontSize: 13, color: '#1E293B' }}
                            onClick={() => router.push(`/admin/inventory/${asset.id}`)}>
                            {asset.name}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div style={{ fontSize: 13, color: '#334155' }}>{asset.brand}</div>
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>{asset.model}</div>
                        </td>
                        <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{asset.categoryName}</td>
                        <td className="px-5 py-3.5" style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{asset.serialNumber}</td>
                        <td className="px-5 py-3.5">
                          {asset.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <Avatar user={user} name={asset.assignedTo} size={26} />
                              <span style={{ fontSize: 13, color: '#334155' }}>{asset.assignedTo}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: 13, color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5"><StatusBadge status={asset.status} /></td>
                        <td className="px-5 py-3.5" style={{ fontSize: 12, ...warrantyStyle }}>
                          {asset.warrantyExpiry || '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === asset.id ? null : asset.id); }}
                              className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                              style={{ color: '#64748B' }}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenu === asset.id && (
                              <ActionMenu
                                onView={() => { router.push(`/admin/inventory/${asset.id}`); setOpenMenu(null); }}
                                onEdit={() => setOpenMenu(null)}
                                onChangeStatus={() => setOpenMenu(null)}
                                onDelete={() => setOpenMenu(null)}
                                onClose={() => setOpenMenu(null)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>
                Showing {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)} of {filtered.length} assets
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg px-3 py-1.5 border transition-colors hover:bg-gray-50 disabled:opacity-40"
                  style={{ fontSize: 13, color: '#475569', borderColor: '#E2E8F0' }}>
                  Previous
                </button>
                <span style={{ fontSize: 13, color: '#64748B' }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="rounded-lg px-3 py-1.5 border transition-colors hover:bg-gray-50 disabled:opacity-40"
                  style={{ fontSize: 13, color: '#475569', borderColor: '#E2E8F0' }}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showRegister && (
        <RegisterAssetDrawer
          onClose={() => setShowRegister(false)}
          onSave={(asset) => { onAddAsset(asset); setShowRegister(false); }}
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
        onChange={e => onChange(e.target.value)}
        className="appearance-none rounded-lg border px-3 pr-8 py-2 focus:outline-none focus:ring-2 cursor-pointer"
        style={{ borderColor: '#CBD5E1', fontSize: 13, color: value ? '#1E293B' : '#94A3B8', background: '#fff' }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#94A3B8' }} />
    </div>
  );
}

function ActionMenu({ onView, onEdit, onChangeStatus, onDelete, onClose }: {
  onView: () => void; onEdit: () => void; onChangeStatus: () => void; onDelete: () => void; onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 z-20 rounded-xl shadow-lg overflow-hidden py-1" style={{ top: '100%', minWidth: 160, background: '#fff', border: '1px solid #E2E8F0' }}>
        {[
          { icon: Eye, label: 'View Details', action: onView, color: '#334155' },
          { icon: Pencil, label: 'Edit', action: onEdit, color: '#334155' },
          { icon: RefreshCw, label: 'Change Status', action: onChangeStatus, color: '#334155' },
          { icon: Trash2, label: 'Delete', action: onDelete, color: '#EF4444' },
        ].map(item => (
          <button key={item.label} onClick={item.action}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
            style={{ fontSize: 13, color: item.color }}>
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}
