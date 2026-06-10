'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Eye, ChevronDown, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import type { ActiveAssignmentListItem, AssetCondition, CategoryListItem } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReturnAssetDrawer } from '@/components/overlays/ReturnAssetDrawer';
import { ApiError, getAssignments, getCategories, returnAssignment } from '@/lib/api';

const PER_PAGE = 10;

const assigneeName = (a: ActiveAssignmentListItem['assignee']) =>
  `${a.firstName} ${a.lastName}`.trim();

export function ActiveAssignments() {
  const router = useRouter();

  // ── Filter state ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);

  // ── Data state ───────────────────────────────────────────────────────────
  const [rows, setRows] = useState<ActiveAssignmentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);

  // ── Process Return drawer state ──────────────────────────────────────────
  const [returnRow, setReturnRow] = useState<ActiveAssignmentListItem | null>(null);
  const [returnSaving, setReturnSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
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
      const result = await getAssignments({
        search: debouncedSearch || undefined,
        categoryId: filterCategory || undefined,
        assignmentDateFrom: dateFrom || undefined,
        assignmentDateTo: dateTo || undefined,
        overdue: overdueOnly || undefined,
        page,
        limit: PER_PAGE,
      });
      setRows(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load assignments.');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterCategory, dateFrom, dateTo, overdueOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirmReturn = async (
    returnDate: string,
    condition: AssetCondition,
    notes?: string,
  ) => {
    if (!returnRow) return;
    setReturnSaving(true);
    try {
      await returnAssignment(returnRow.id, {
        returnDate,
        conditionAtReturn: condition,
        returnNotes: notes,
      });
      toast.success(`"${returnRow.asset.name}" returned. Now Available.`);
      setReturnRow(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to process return.');
    } finally {
      setReturnSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>Active Assignments</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
            {total} {total === 1 ? 'asset' : 'assets'} currently assigned
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl mb-4 p-4 flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="relative flex-1" style={{ minWidth: 240 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by assignee or asset name…"
            className="w-full rounded-lg border pl-9 pr-3 py-2 focus:outline-none"
            style={{ borderColor: '#CBD5E1', fontSize: 13 }}
          />
        </div>
        <div className="relative">
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
            className="appearance-none rounded-lg border px-3 pr-8 py-2 focus:outline-none cursor-pointer"
            style={{ borderColor: '#CBD5E1', fontSize: 13, color: filterCategory ? '#1E293B' : '#94A3B8', background: '#fff' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#94A3B8' }} />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            aria-label="Assignment date from"
            className="rounded-lg border px-3 py-2 focus:outline-none"
            style={{ borderColor: '#CBD5E1', fontSize: 13, color: dateFrom ? '#1E293B' : '#94A3B8' }}
          />
          <span style={{ fontSize: 13, color: '#94A3B8' }}>–</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            aria-label="Assignment date to"
            className="rounded-lg border px-3 py-2 focus:outline-none"
            style={{ borderColor: '#CBD5E1', fontSize: 13, color: dateTo ? '#1E293B' : '#94A3B8' }}
          />
        </div>
        <button
          onClick={() => { setOverdueOnly((o) => !o); setPage(1); }}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 font-medium transition-all"
          style={{
            fontSize: 13,
            borderColor: overdueOnly ? '#F59E0B' : '#E2E8F0',
            background: overdueOnly ? '#FFFBEB' : '#fff',
            color: overdueOnly ? '#D97706' : '#64748B',
          }}
        >
          <AlertTriangle className="w-4 h-4" />
          Overdue Only
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16" style={{ fontSize: 13, color: '#64748B' }}>
            Loading assignments…
          </div>
        ) : error ? (
          <EmptyState
            icon="assignments"
            title="Couldn't load assignments"
            subtitle={error}
            action={
              <button onClick={load} className="flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:opacity-90"
                style={{ background: '#1E3A8A', fontSize: 13, fontWeight: 600 }}>
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState icon="assignments" title="No active assignments" subtitle="No assets are currently assigned matching your filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 980 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    {['Asset Name', 'Asset ID', 'Serial Number', 'Assignee', 'Assignment Date', 'Expected Return', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{
                        background: i % 2 === 0 ? '#fff' : '#F8FAFC',
                        borderBottom: '1px solid #F1F5F9',
                        borderLeft: row.isOverdue ? '3px solid #EF4444' : '3px solid transparent',
                      }}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{row.asset.name}</div>
                        {row.asset.category && <div style={{ fontSize: 11, color: '#94A3B8' }}>{row.asset.category.name}</div>}
                      </td>
                      <td className="px-5 py-3.5" style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>{row.asset.displayId}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{row.asset.serialNumber}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar user={row.assignee} size={26} />
                          <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{assigneeName(row.assignee)}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{row.assignmentDate}</td>
                      <td className="px-5 py-3.5">
                        {row.expectedReturnDate ? (
                          <span style={{ fontSize: 13, color: row.isOverdue ? '#EF4444' : '#64748B', fontWeight: row.isOverdue ? 600 : 400 }}>
                            {row.expectedReturnDate}
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: '#CBD5E1' }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {row.isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium" style={{ fontSize: 11, background: '#FFFBEB', color: '#D97706' }}>
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium" style={{ fontSize: 11, background: '#ECFDF5', color: '#059669' }}>
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => router.push(`/admin/inventory/${row.asset.id}`)}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 border hover:bg-gray-50 transition-colors"
                            style={{ fontSize: 12, color: '#475569', borderColor: '#E2E8F0' }}>
                            <Eye className="w-3.5 h-3.5" /> View Detail
                          </button>
                          <button onClick={() => setReturnRow(row)}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 border hover:bg-amber-50 transition-colors"
                            style={{ fontSize: 12, color: '#D97706', borderColor: '#FDE68A' }}>
                            <RotateCcw className="w-3.5 h-3.5" /> Process Return
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 13, color: '#64748B' }}>
                Showing {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} of {total}
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

      {/* Process Return — reuses the OAMS-28 return side panel */}
      {returnRow && (
        <ReturnAssetDrawer
          assetName={returnRow.asset.name}
          assignedTo={assigneeName(returnRow.assignee)}
          since={returnRow.assignmentDate}
          saving={returnSaving}
          onClose={() => setReturnRow(null)}
          onConfirm={handleConfirmReturn}
        />
      )}
    </div>
  );
}
