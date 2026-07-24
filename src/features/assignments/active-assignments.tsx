'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Search, Eye, RefreshCw, AlertTriangle, RotateCcw, Check, X } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import type { ActiveAssignmentListItem, AssetCondition, CategoryListItem, AssignmentType, AssignmentConfirmationStatus } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton';
import { ReturnAssetDrawer } from '@/components/overlays/ReturnAssetDrawer';
import { OverlayPortal } from '@/components/overlays/OverlayPortal';
import { ApiError, getAssignments, getCategories, returnAssignment, submitAssignmentFeedback } from '@/lib/api';

const PER_PAGE = 10;

const TABS: { value: AssignmentType; label: string }[] = [
  { value: 'General', label: 'General' },
  { value: 'Handback', label: 'Handbacks' },
];

function ConfirmationBadge({ status }: { status: AssignmentConfirmationStatus }) {
  const style =
    status === 'Accepted' ? 'bg-success-surface text-success-foreground'
    : status === 'Rejected' ? 'bg-danger-surface text-danger-foreground'
    : 'bg-warning-surface text-warning-foreground';
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 font-medium text-2xs ${style}`}>{status}</span>;
}

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

  // ── Tab (handover type) ──────────────────────────────────────────────────
  const [tab, setTab] = useState<AssignmentType>('General');

  // ── Process Return drawer state ──────────────────────────────────────────
  const [returnRow, setReturnRow] = useState<ActiveAssignmentListItem | null>(null);
  const [returnSaving, setReturnSaving] = useState(false);

  // ── Employee feedback (Accept / Reject) ──────────────────────────────────
  const [feedbackBusyId, setFeedbackBusyId] = useState<string | null>(null);
  const [rejectRow, setRejectRow] = useState<ActiveAssignmentListItem | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasActiveFilters = Boolean(search || filterCategory || dateFrom || dateTo || overdueOnly);

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setFilterCategory('');
    setDateFrom('');
    setDateTo('');
    setOverdueOnly(false);
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
      const result = await getAssignments({
        search: debouncedSearch || undefined,
        categoryId: filterCategory || undefined,
        assignmentDateFrom: dateFrom || undefined,
        assignmentDateTo: dateTo || undefined,
        overdue: overdueOnly || undefined,
        assignmentType: tab,
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
  }, [debouncedSearch, filterCategory, dateFrom, dateTo, overdueOnly, tab, page]);

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

  const handleAccept = async (row: ActiveAssignmentListItem) => {
    setFeedbackBusyId(row.id);
    try {
      await submitAssignmentFeedback(row.id, { status: 'Accepted' });
      toast.success(`"${row.asset.name}" assignment accepted.`);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to submit feedback.');
    } finally {
      setFeedbackBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectRow || !rejectNote.trim()) return;
    setFeedbackBusyId(rejectRow.id);
    try {
      await submitAssignmentFeedback(rejectRow.id, { status: 'Rejected', note: rejectNote.trim() });
      toast.success(`"${rejectRow.asset.name}" assignment rejected.`);
      setRejectRow(null);
      setRejectNote('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to submit feedback.');
    } finally {
      setFeedbackBusyId(null);
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

      {/* Tabs — General vs Handback assignments */}
      <div className="flex items-center gap-1 border-b border-border mb-4">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setPage(1); }}
            className={`relative px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.value
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="rounded-lg mb-4 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-card border border-border shadow-card">
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by assignee or asset name…"
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
          <EmptyState icon="assignments" title="No active assignments" subtitle="No assets are currently assigned matching your filters." />
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
                  {row.confirmationStatus === 'Pending' ? (
                    <>
                      <button onClick={() => handleAccept(row)} disabled={feedbackBusyId === row.id}
                        className="flex items-center gap-1 text-2sm font-semibold text-success-foreground transition-opacity hover:opacity-80 disabled:opacity-50">
                        <Check className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button onClick={() => { setRejectRow(row); setRejectNote(''); }} disabled={feedbackBusyId === row.id}
                        className="flex items-center gap-1 text-2sm font-semibold text-danger transition-opacity hover:opacity-80 disabled:opacity-50">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setReturnRow(row)}
                      className="flex items-center gap-1 text-2sm font-semibold text-warning-foreground transition-opacity hover:opacity-80">
                      <RotateCcw className="w-3.5 h-3.5" /> Process Return
                    </button>
                  )}
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
                  <div className="micro-label mb-1">Rejection Reason</div>
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

      {/* Reject feedback dialog */}
      {rejectRow && (
        <OverlayPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-[2px] motion-safe:animate-overlay-in" onClick={() => setRejectRow(null)}>
            <div className="rounded-2xl flex flex-col w-[440px] bg-card text-card-foreground shadow-pop motion-safe:animate-pop-in" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 pt-6 pb-4">
                <h2 className="font-bold text-base tracking-[-0.01em] text-foreground">Reject assignment</h2>
                <p className="text-2sm text-muted-foreground mt-1">
                  Rejecting the handover of <span className="font-medium text-foreground">{rejectRow.asset.name}</span>. Please give a reason (e.g. condition mismatch).
                </p>
              </div>
              <div className="px-6 pb-2">
                <textarea
                  autoFocus
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={3}
                  placeholder="Reason for rejection…"
                  className="w-full rounded-control border border-input bg-input-background text-2sm text-foreground px-3 py-2 placeholder:text-muted-foreground/60 resize-y transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
                />
              </div>
              <div className="flex items-center gap-3 px-6 py-4 mt-2 justify-end border-t border-border bg-muted/60 rounded-b-2xl">
                <button onClick={() => setRejectRow(null)} disabled={feedbackBusyId === rejectRow.id}
                  className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-60">
                  Cancel
                </button>
                <button onClick={handleReject} disabled={feedbackBusyId === rejectRow.id || !rejectNote.trim()}
                  className="rounded-control px-5 py-2.5 text-sm font-semibold bg-danger text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
                  {feedbackBusyId === rejectRow.id ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
