'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Search, MoreHorizontal, Eye, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { CategoryDrawer } from '@/components/overlays/CategoryDrawer';
import { ViewCategoryDrawer } from '@/components/overlays/ViewCategoryDrawer';
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog';
import type { CategoryListItem } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { PortalMenu, PortalMenuItem } from '@/components/ui/PortalMenu';
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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openMenu, setOpenMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [page, setPage] = useState(1);

  // Drawer state
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerCategoryId, setDrawerCategoryId] = useState<string | undefined>(undefined);
  const [viewCategoryId, setViewCategoryId] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryListItem | null>(null);

  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Debounce search
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
      setError(err instanceof Error ? err.message : 'Failed to load categories.');
      setCategories([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setDrawerCategoryId(undefined);
    setShowDrawer(true);
  };

  const openEdit = (id: string) => {
    setDrawerCategoryId(id);
    setShowDrawer(true);
    setOpenMenu(null);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategory(deletingCategory.id);
      toast.success(`Category "${deletingCategory.name}" deleted.`);
      setDeletingCategory(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete category.');
      setDeletingCategory(null);
    }
  };

  const handleChangeStatus = async (category: CategoryListItem) => {
    setOpenMenu(null);
    const next = category.status === 'Active' ? 'Inactive' : 'Active';
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, status: next } : c)),
    );
    try {
      await updateCategoryStatus(category.id, next);
      toast.success(`"${category.name}" set to ${next}.`);
    } catch (err) {
      // Roll back on failure
      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id ? { ...c, status: category.status } : c,
        ),
      );
      toast.error(err instanceof ApiError ? err.message : 'Failed to update status.');
    }
  };

  return (
    <div className="motion-safe:animate-fade-rise">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">Asset Categories</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Create Category
        </button>
      </div>

      <div className="rounded-lg mb-4 p-4 flex items-center gap-3 bg-card border border-border shadow-card">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search category name..."
            className="w-full rounded-control border border-input bg-input-background text-2sm pl-9 pr-3 py-2 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
          />
        </div>
        <Select
          value={filterStatus}
          onValueChange={(v) => { setFilterStatus(v); setPage(1); }}
          ariaLabel="Status"
          placeholder="All Statuses"
          options={[
            { value: '', label: 'All Statuses' },
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
      </div>

      <div className="rounded-lg overflow-hidden bg-card border border-border shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-2sm text-muted-foreground">
            Loading categories…
          </div>
        ) : error ? (
          <EmptyState
            icon="assets"
            title="Couldn't load categories"
            subtitle={error}
            action={
              <button
                onClick={() => load()}
                className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            }
          />
        ) : categories.length === 0 ? (
          <EmptyState
            icon="assets"
            title="No categories found"
            subtitle="Create your first asset category to get started."
            action={
              <button
                onClick={openCreate}
                className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" /> Create Category
              </button>
            }
          />
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="bg-muted/60 border-b-2 border-border">
                  {['Category Name', 'Description', 'No. of Attributes', 'No. of Assets', 'Status', 'Date Created', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 micro-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, i) => (
                  <tr
                    key={cat.id}
                    className={`border-b border-border/60 transition-colors hover:bg-primary/[0.04] ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-2sm text-foreground" title={cat.name.length > 45 ? cat.name : undefined}>
                        {cat.name.length > 45 ? cat.name.slice(0, 45) + '…' : cat.name}
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-[200px]">
                      <div className="text-2sm text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                        {cat.description}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="rounded-full px-2.5 py-0.5 font-semibold text-2sm bg-secondary text-secondary-foreground nums">
                        {cat.attributeCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="font-semibold text-2sm text-foreground nums">{cat.assetCount}</span>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={cat.status} /></td>
                    <td className="px-5 py-4 text-2sm text-muted-foreground nums">{formatDate(cat.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div>
                        <button
                          onClick={(e) => {
                            if (openMenu?.id === cat.id) { setOpenMenu(null); return; }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setOpenMenu({ id: cat.id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          }}
                          className="rounded-control p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {openMenu?.id === cat.id && (
                          <PortalMenu anchor={openMenu} onClose={() => setOpenMenu(null)}>
                            <PortalMenuItem icon={Eye} label="View Details" onClick={() => { setOpenMenu(null); setViewCategoryId(cat.id); }} />
                            <PortalMenuItem icon={Pencil} label="Edit" onClick={() => { openEdit(cat.id); setOpenMenu(null); }} />
                            <PortalMenuItem icon={RefreshCw} label="Change Status" onClick={() => { handleChangeStatus(cat); setOpenMenu(null); }} />
                            <PortalMenuItem icon={Trash2} label="Delete" danger onClick={() => { setOpenMenu(null); setDeletingCategory(cat); }} />
                          </PortalMenu>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-5 py-4 border-t border-border/60">
              <span className="text-2sm text-muted-foreground nums">
                Showing {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} of {total} categories
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-2sm text-muted-foreground nums">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showDrawer && (
        <CategoryDrawer
          categoryId={drawerCategoryId}
          onClose={() => setShowDrawer(false)}
          onSaved={() => load()}
        />
      )}
      {viewCategoryId && (
        <ViewCategoryDrawer
          categoryId={viewCategoryId}
          onClose={() => setViewCategoryId(null)}
        />
      )}
      {deletingCategory && (
        <ConfirmDialog
          title="Delete Category"
          description={`Are you sure you want to delete category "${deletingCategory.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeletingCategory(null)}
        />
      )}
    </div>
  );
}
