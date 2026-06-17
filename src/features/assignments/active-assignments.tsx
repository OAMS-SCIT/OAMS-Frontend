'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Eye, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
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
    <div className="motion-safe:animate-fade-rise">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">Active Assignments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} {total === 1 ? 'asset' : 'assets'} currently assigned
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-lg mb-4 p-4 flex items-center gap-3 flex-wrap bg-card border border-border shadow-card">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by assignee or asset name…"
            className="w-full rounded-control border border-input bg-input-background text-2sm pl-9 pr-3 py-2 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
          />
        </div>
        <Select
          value={filterCategory}
          onValueChange={(v) => { setFilterCategory(v); setPage(1); }}
          ariaLabel="Category"
          placeholder="All Categories"
          options={[{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: c.id, label: c.name.length > 45 ? c.name.slice(0, 45) + '…' : c.name }))]}
        />
        <div className="flex items-center gap-2">
          <DatePicker
            value={dateFrom}
            onChange={(v) => { setDateFrom(v); setPage(1); }}
            ariaLabel="Assignment date from"
            placeholder="From"
          />
          <span className="text-2sm text-muted-foreground/70">–</span>
          <DatePicker
            value={dateTo}
            onChange={(v) => { setDateTo(v); setPage(1); }}
            ariaLabel="Assignment date to"
            placeholder="To"
          />
        </div>
        <button
          onClick={() => { setOverdueOnly((o) => !o); setPage(1); }}
          className={`flex items-center gap-2 rounded-control border px-3 py-2 text-2sm font-medium transition-all ${
            overdueOnly
              ? 'border-warning bg-warning-surface text-warning-foreground'
              : 'border-border bg-card text-muted-foreground hover:bg-muted'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Overdue Only
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden bg-card border border-border shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-2sm text-muted-foreground">
            Loading assignments…
          </div>
        ) : error ? (
          <EmptyState
            icon="assignments"
            title="Couldn't load assignments"
            subtitle={error}
            action={
              <button onClick={load} className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]">
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState icon="assignments" title="No active assignments" subtitle="No assets are currently assigned matching your filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="bg-muted/60 border-b-2 border-border">
                    {['Asset Name', 'Asset ID', 'Serial Number', 'Assignee', 'Assignment Date', 'Expected Return', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 micro-label whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={`border-b border-border/60 border-l-[3px] transition-colors hover:bg-primary/[0.04] ${
                        row.isOverdue ? 'border-l-danger' : 'border-l-transparent'
                      } ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-2sm text-foreground">{row.asset.name}</div>
                        {row.asset.category && <div className="text-2xs text-muted-foreground/80">{row.asset.category.name}</div>}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground/80 font-mono">{row.asset.displayId}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{row.asset.serialNumber}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar user={row.assignee} size={26} />
                          <div className="text-2sm text-foreground/80 font-medium">{assigneeName(row.assignee)}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-2sm text-muted-foreground nums">{row.assignmentDate}</td>
                      <td className="px-5 py-3.5">
                        {row.expectedReturnDate ? (
                          <span className={`text-2sm nums ${row.isOverdue ? 'text-danger font-semibold' : 'text-muted-foreground'}`}>
                            {row.expectedReturnDate}
                          </span>
                        ) : (
                          <span className="text-2sm text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {row.isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-2xs bg-warning-surface text-warning-foreground">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-2xs bg-success-surface text-success-foreground">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => router.push(`/admin/inventory/${row.asset.id}`)}
                            className="flex items-center gap-1 rounded-control px-3 py-1.5 border border-border text-xs text-foreground/70 transition-colors hover:bg-muted">
                            <Eye className="w-3.5 h-3.5" /> View Detail
                          </button>
                          <button onClick={() => setReturnRow(row)}
                            className="flex items-center gap-1 rounded-control px-3 py-1.5 border border-warning/40 text-xs text-warning-foreground transition-colors hover:bg-warning-surface">
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
            <div className="flex items-center justify-between px-5 py-4 border-t border-border/60">
              <span className="text-2sm text-muted-foreground nums">
                Showing {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} of {total}
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
