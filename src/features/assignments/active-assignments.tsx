'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Eye, RefreshCw, AlertTriangle, RotateCcw } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import type { ActiveAssignmentListItem, AssetCondition, CategoryListItem, AssignmentConfirmationStatus, AssignmentType } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton';
import { ReturnAssetDrawer } from '@/components/overlays/ReturnAssetDrawer';
import { ApiError, getAssignments, getCategories, returnAssignment, uploadConditionImages } from '@/lib/api';

const PER_PAGE = 10;

function ConfirmationBadge({ status }: { status: AssignmentConfirmationStatus }) {
  const style =
    status === 'Accepted' ? 'bg-success-surface text-success-foreground'
    : status === 'Rejected' ? 'bg-danger-surface text-danger-foreground'
    : 'bg-warning-surface text-warning-foreground';
  // The employee "reports an issue" rather than rejecting; label it that way.
  const label = status === 'Rejected' ? 'Issue Reported' : status;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium text-2xs ${style}`}>{label}</span>;
}

/**
 * The admin's views of the employee's handover confirmation (OAMS-251/252).
 * Pending Receipt / Pending Handback are the "pending confirmations" lists: an
 * assignment leaves them as soon as the employee accepts or reports an issue.
 */
const CONFIRMATION_VIEWS: Record<string, { label: string; assignmentType?: AssignmentType; confirmationStatus: AssignmentConfirmationStatus }> = {
  'pending-receipt': { label: 'Pending Receipt', assignmentType: 'General', confirmationStatus: 'Pending' },
  'pending-handback': { label: 'Pending Handback', assignmentType: 'Handback', confirmationStatus: 'Pending' },
  accepted: { label: 'Accepted', confirmationStatus: 'Accepted' },
  rejected: { label: 'Issue Reported', confirmationStatus: 'Rejected' },
};

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
  const [confirmationView, setConfirmationView] = useState('');
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
  const hasActiveFilters = Boolean(
    search || filterCategory || dateFrom || dateTo || overdueOnly || confirmationView,
  );

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setFilterCategory('');
    setDateFrom('');
    setDateTo('');
    setOverdueOnly(false);
    setConfirmationView('');
    setPage(1);
  };

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
      const view = CONFIRMATION_VIEWS[confirmationView];
      const result = await getAssignments({
        search: debouncedSearch || undefined,
        categoryId: filterCategory || undefined,
        assignmentDateFrom: dateFrom || undefined,
        assignmentDateTo: dateTo || undefined,
        overdue: overdueOnly || undefined,
        assignmentType: view?.assignmentType,
        confirmationStatus: view?.confirmationStatus,
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
  }, [debouncedSearch, filterCategory, dateFrom, dateTo, overdueOnly, confirmationView, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirmReturn = async (
    returnDate: string,
    condition: AssetCondition,
    notes?: string,
    images?: File[],
  ) => {
    if (!returnRow) return;
    // Capture before clearing the row below — the upload needs the assignment id.
    const assignmentId = returnRow.id;
    setReturnSaving(true);
    try {
      await returnAssignment(assignmentId, {
        returnDate,
        conditionAtReturn: condition,
        returnNotes: notes,
      });
      // Return-time condition images (OAMS-256). The return is already committed
      // and cannot be undone, so a failed upload degrades to a warning.
      if (images && images.length > 0) {
        try {
          await uploadConditionImages(assignmentId, images, 'returned');
        } catch {
          toast.error('Return processed, but the condition images could not be uploaded.');
        }
      }
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
      <div className="rounded-lg mb-4 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-card border border-border shadow-card">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by assignee, asset name, or serial number…"
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
          <Select
            value={confirmationView}
            onValueChange={(v) => { setConfirmationView(v); setPage(1); }}
            ariaLabel="Employee confirmation"
            placeholder="All Confirmations"
            options={[
              { value: '', label: 'All Confirmations' },
              ...Object.entries(CONFIRMATION_VIEWS).map(([value, v]) => ({ value, label: v.label })),
            ]}
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
            className={`flex items-center gap-2 rounded-control border px-3 py-2 text-2sm font-medium transition-all whitespace-nowrap ${
              overdueOnly
                ? 'border-warning bg-warning-surface text-warning-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Overdue Only
          </button>
          <ClearFiltersButton onClear={clearFilters} disabled={!hasActiveFilters} />
        </div>
      </div>

      {/* Card list */}
      {loading ? (
        <div className="rounded-lg bg-card border border-border shadow-card flex items-center justify-center py-16 text-2sm text-muted-foreground">
          Loading assignments…
        </div>
      ) : error ? (
        <div className="rounded-lg bg-card border border-border shadow-card">
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
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg bg-card border border-border shadow-card">
          {debouncedSearch ? (
            <EmptyState
              icon="assignments"
              title="No matching assignments found"
              subtitle="No active assignment matches that assignee, asset name, or serial number. Try a different search or clear your filters."
            />
          ) : (
            <EmptyState icon="assignments" title="No active assignments" subtitle="No assets are currently assigned matching your filters." />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`rounded-lg bg-card border border-border shadow-card p-4 border-l-[3px] ${row.isOverdue ? 'border-l-danger' : 'border-l-transparent'}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <button onClick={() => router.push(`/admin/inventory/${row.asset.id}`)} className="text-left group">
                    <span className="font-bold text-base tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary">{row.asset.name}</span>
                    <span className="text-2sm text-muted-foreground"> · {row.asset.displayId}</span>
                  </button>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-2xs ${
                      row.assignmentType === 'Handback'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {row.assignmentType === 'Handback' ? 'Handback' : 'General'}
                    </span>
                    {row.isOverdue && (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium text-2xs bg-warning-surface text-warning-foreground">
                        <AlertTriangle className="w-3 h-3" /> Overdue
                      </span>
                    )}
                    <span className="text-2xs text-muted-foreground">Employee Confirmation</span>
                    <ConfirmationBadge status={row.confirmationStatus} />
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <button onClick={() => router.push(`/admin/inventory/${row.asset.id}`)}
                    className="flex items-center gap-1 text-2sm font-medium text-foreground/70 transition-colors hover:text-foreground">
                    <Eye className="w-3.5 h-3.5" /> View Detail
                  </button>
                  {/* Accept / report-an-issue belongs to the employee (OAMS-251);
                      the admin only sees the outcome in the badge above. */}
                  <button onClick={() => setReturnRow(row)}
                    className="flex items-center gap-1 text-2sm font-semibold text-warning-foreground transition-opacity hover:opacity-80">
                    <RotateCcw className="w-3.5 h-3.5" /> Process Return
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border/60 my-3" />

              {/* Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <div className="micro-label mb-1">Serial Number</div>
                  <div className="text-2sm text-foreground font-mono truncate" title={row.asset.serialNumber}>{row.asset.serialNumber}</div>
                </div>
                <div>
                  <div className="micro-label mb-1">Assignee</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar user={row.assignee} size={22} />
                    <span className="text-2sm text-foreground truncate">{assigneeName(row.assignee)}</span>
                  </div>
                </div>
                <div>
                  <div className="micro-label mb-1">Assignment Date</div>
                  <div className="text-2sm text-foreground nums">{row.assignmentDate}</div>
                </div>
                <div>
                  <div className="micro-label mb-1">Expected Return</div>
                  <div className={`text-2sm nums ${row.isOverdue ? 'text-danger font-semibold' : 'text-foreground'}`}>
                    {row.expectedReturnDate ?? '—'}
                  </div>
                </div>
              </div>

              {row.confirmationStatus === 'Rejected' && row.confirmationNote && (
                <div className="mt-3">
                  <div className="micro-label mb-1">Reported Issue</div>
                  <div className="text-2sm text-danger/90">{row.confirmationNote}</div>
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between px-1 pt-2">
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
        </div>
      )}

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
