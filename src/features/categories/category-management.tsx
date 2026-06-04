'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Search, MoreHorizontal, Eye, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { CategoryListItem } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ApiError,
  deleteCategory,
  getCategories,
  updateCategoryStatus,
} from '@/lib/api';

const PER_PAGE = 10;

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}

export function CategoryManagement() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Debounce the search box; reset to the first page on a new term.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCategories({
        search: debouncedSearch || undefined,
        status: filterStatus || undefined,
        page,
        limit: PER_PAGE,
      });
      setCategories(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load categories.',
      );
      setCategories([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus, page]);

  useEffect(() => {
    // Intentional data-fetch effect: `load` syncs server state into the
    // component and toggles its own loading/error flags.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleDelete = async (category: CategoryListItem) => {
    setOpenMenu(null);
    if (
      !window.confirm(
        `Delete category "${category.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteCategory(category.id);
      toast.success(`Category "${category.name}" deleted.`);
      load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to delete category.',
      );
    }
  };

  const handleChangeStatus = async (category: CategoryListItem) => {
    setOpenMenu(null);
    const next = category.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateCategoryStatus(category.id, next);
      toast.success(`"${category.name}" set to ${next}.`);
      load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update status.',
      );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>Asset Categories</h1>
        <button onClick={() => router.push('/admin/categories/new')}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
          style={{ background: '#1E3A8A', fontSize: 14 }}>
          <Plus className="w-4 h-4" /> Create Category
        </button>
      </div>

      <div className="rounded-xl mb-4 p-4 flex items-center gap-3" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search category name..." className="w-full rounded-lg border pl-9 pr-3 py-2 focus:outline-none"
            style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-lg border px-3 py-2" style={{ borderColor: '#CBD5E1', fontSize: 13 }}>
          <option value="">All Statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16" style={{ fontSize: 13, color: '#64748B' }}>
            Loading categories…
          </div>
        ) : error ? (
          <EmptyState
            icon="assets"
            title="Couldn’t load categories"
            subtitle={error}
            action={
              <button onClick={() => load()}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:opacity-90"
                style={{ background: '#1E3A8A', fontSize: 13, fontWeight: 600 }}>
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            }
          />
        ) : categories.length === 0 ? (
          <EmptyState icon="assets" title="No categories found" subtitle="Create your first asset category to get started." />
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  {['Category Name', 'Description', 'No. of Attributes', 'No. of Assets', 'Status', 'Date Created', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, i) => (
                  <tr key={cat.id} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}
                    className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold" style={{ fontSize: 13, color: '#1E293B' }}>{cat.name}</div>
                    </td>
                    <td className="px-5 py-4" style={{ maxWidth: 200 }}>
                      <div style={{ fontSize: 13, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cat.description}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="rounded-full px-2.5 py-0.5 font-semibold"
                        style={{ fontSize: 13, background: '#EFF6FF', color: '#1E3A8A' }}>
                        {cat.attributeCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="font-semibold" style={{ fontSize: 13, color: '#1E293B' }}>{cat.assetCount}</span>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={cat.status} /></td>
                    <td className="px-5 py-4" style={{ fontSize: 13, color: '#64748B' }}>{formatDate(cat.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="relative">
                        <button onClick={() => setOpenMenu(openMenu === cat.id ? null : cat.id)}
                          className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors" style={{ color: '#64748B' }}>
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenu === cat.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                            <div className="absolute right-0 z-20 rounded-xl shadow-lg overflow-hidden py-1" style={{ top: '100%', minWidth: 160, background: '#fff', border: '1px solid #E2E8F0' }}>
                              <button onClick={() => { setOpenMenu(null); router.push(`/admin/categories/${cat.id}`); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                style={{ fontSize: 13, color: '#334155' }}>
                                <Eye className="w-3.5 h-3.5" /> View Details
                              </button>
                              <button onClick={() => { setOpenMenu(null); router.push(`/admin/categories/${cat.id}/edit`); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                style={{ fontSize: 13, color: '#334155' }}>
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button onClick={() => handleChangeStatus(cat)}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                style={{ fontSize: 13, color: '#D97706' }}>
                                <RefreshCw className="w-3.5 h-3.5" /> Change Status
                              </button>
                              <button onClick={() => handleDelete(cat)}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                style={{ fontSize: 13, color: '#EF4444' }}>
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>
                Showing {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} of {total} categories
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="rounded-lg px-3 py-1.5 border transition-colors hover:bg-gray-50 disabled:opacity-40"
                  style={{ fontSize: 13, color: '#475569', borderColor: '#E2E8F0' }}>
                  Previous
                </button>
                <span style={{ fontSize: 13, color: '#64748B' }}>Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="rounded-lg px-3 py-1.5 border transition-colors hover:bg-gray-50 disabled:opacity-40"
                  style={{ fontSize: 13, color: '#475569', borderColor: '#E2E8F0' }}>
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
