'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Plus, RefreshCw, Mail, Phone, KeyRound } from 'lucide-react';
import type { EmployeeAssignmentItem, UserListItem } from '@/types';
import { ApiError, getEmployeeAssignments, getUser, resendCredentials } from '@/lib/api';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { EditUserDrawer } from '@/components/overlays/EditUserDrawer';
import { AssignAssetToEmployeeDrawer } from '@/components/overlays/AssignAssetToEmployeeDrawer';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

/** Filter options for the single assignments list. `undefined` = all records. */
const FILTERS = [
  { key: 'all', label: 'All', isReturned: undefined },
  { key: 'active', label: 'Active', isReturned: false },
  { key: 'returned', label: 'Returned', isReturned: true },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export function EmployeeProfileView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const [user, setUser] = useState<UserListItem | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<EmployeeAssignmentItem[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');

  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [resending, setResending] = useState(false);

  const loadUser = useCallback(async () => {
    setUserLoading(true);
    setUserError(null);
    try {
      setUser(await getUser(userId));
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to load user.');
      setUser(null);
    } finally {
      setUserLoading(false);
    }
  }, [userId]);

  // One request for the whole list. The API returns active rows first, then
  // returned — the order is applied server-side, so it is used as-is.
  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    try {
      const { isReturned } = FILTERS.find((f) => f.key === filter)!;
      const result = await getEmployeeAssignments(userId, isReturned);
      setAssignments(result.data);
    } catch {
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [userId, filter]);

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const goToAsset = (assetId: string) => router.push(`/admin/inventory/${assetId}`);

  const handleResendCredentials = async () => {
    if (!user || resending) return;
    setResending(true);
    try {
      await resendCredentials(user.id);
      toast.success(`New temporary credentials emailed to ${user.email}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to resend credentials.');
    } finally {
      setResending(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-2sm text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="motion-safe:animate-fade-rise">
        <BackLink onClick={() => router.push('/admin/users')} />
        <EmptyState
          icon="users"
          title="Couldn't load this user"
          subtitle={userError ?? 'The user could not be found.'}
          action={
            <button onClick={() => loadUser()}
              className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]">
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          }
        />
      </div>
    );
  }

  const designationName = user.designation?.name ?? '—';
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="motion-safe:animate-fade-rise space-y-6">
      <BackLink onClick={() => router.push('/admin/users')} />

      {/* ── Section 1 — Profile Summary ── */}
      <div className="rounded-2xl p-6 bg-card border border-border shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar user={user} size={56} />
            <div className="min-w-0">
              <h1 className="font-bold text-xl tracking-[-0.02em] text-foreground truncate">{fullName}</h1>
              <div className="text-2sm text-muted-foreground mt-0.5">{designationName}</div>
              <div className="mt-2"><StatusBadge status={user.role} /></div>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {user.isFirstLogin && (
              <button onClick={handleResendCredentials} disabled={resending}
                className="flex items-center gap-2 rounded-control border border-border px-4 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted disabled:opacity-60">
                <KeyRound className="w-4 h-4" /> {resending ? 'Sending…' : 'Resend Credentials'}
              </button>
            )}
            <button onClick={() => setShowEdit(true)}
              className="flex items-center gap-2 rounded-control border border-border px-4 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted">
              <Pencil className="w-4 h-4" /> Edit User
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <ReadField label="First Name" value={user.firstName} />
          <ReadField label="Last Name" value={user.lastName} />
          <ReadField label="Role" value={user.role} />
          <ReadField label="Email Address" value={user.email} icon={<Mail className="w-3.5 h-3.5" />} />
          <ReadField label="Contact Number" value={user.contactNumber || '—'} icon={<Phone className="w-3.5 h-3.5" />} />
          <ReadField label="Designation" value={designationName} />
        </div>
      </div>

      {/* ── Section 2 — Assigned Assets (active + returned in one list) ── */}
      <section className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="font-semibold text-base tracking-[-0.01em] text-foreground">Assigned Assets</h2>
            <div className="flex items-center gap-1 rounded-control bg-muted/60 p-0.5">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  aria-pressed={filter === f.key}
                  className={`rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-2xs font-semibold transition-colors ${
                    filter === f.key
                      ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowAssign(true)}
            className="shrink-0 flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98]">
            <Plus className="w-4 h-4" /> Assign New Asset
          </button>
        </div>

        {assignmentsLoading ? (
          <TableLoading label="Loading assignments…" />
        ) : assignments.length === 0 ? (
          <EmptyState
            icon={filter === 'all' ? 'history' : 'assets'}
            title={
              filter === 'active' ? 'No assets currently assigned.'
                : filter === 'returned' ? 'No returned assets.'
                : 'No assignment history.'
            }
            subtitle={
              filter === 'returned'
                ? 'Nothing has been handed back yet.'
                : 'Use “Assign New Asset” to hand over an asset.'
            }
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted/60 border-b-2 border-border">
                {['Asset ID', 'Asset Name', 'Category', 'Status', 'Assigned Date', 'Handover Date'].map(h => (
                  <th key={h} className="text-left px-6 py-3 micro-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignments.map((row, i) => (
                <AssignmentRow key={row.id} row={row} zebra={i % 2 === 1} onClick={() => goToAsset(row.asset.id)} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Overlays */}
      {showEdit && (
        <EditUserDrawer
          user={user}
          onClose={() => setShowEdit(false)}
          onSave={() => { setShowEdit(false); loadUser(); }}
        />
      )}
      {showAssign && (
        <AssignAssetToEmployeeDrawer
          employee={{ id: user.id, firstName: user.firstName, lastName: user.lastName, designationName: user.designation?.name ?? null }}
          onClose={() => setShowAssign(false)}
          onAssigned={loadAssignments}
        />
      )}
    </div>
  );
}

function AssignmentRow({ row, zebra, onClick }: { row: EmployeeAssignmentItem; zebra: boolean; onClick: () => void }) {
  return (
    <tr onClick={onClick}
      className={`border-b border-border/60 cursor-pointer transition-colors hover:bg-primary/[0.04] ${zebra ? 'bg-muted/30' : 'bg-card'}`}>
      <td className="px-6 py-3.5 text-2sm font-mono text-muted-foreground">{row.asset.displayId}</td>
      <td className="px-6 py-3.5 text-2sm font-medium text-foreground">{row.asset.name}</td>
      <td className="px-6 py-3.5 text-2sm text-muted-foreground">{row.asset.category?.name ?? '—'}</td>
      {/*
        Status comes from `isReturned` alone. Deriving it from `returnDate`
        (or a non-existent `returnedAt`) mislabels active rows as Returned,
        because an active assignment has no handover date yet.
      */}
      <td className="px-6 py-3.5"><StatusBadge status={row.isReturned ? 'Returned' : 'Assigned'} /></td>
      <td className="px-6 py-3.5 text-2sm text-muted-foreground">{formatDate(row.assignmentDate)}</td>
      <td className="px-6 py-3.5 text-2sm text-muted-foreground">{formatDate(row.returnDate)}</td>
    </tr>
  );
}

function ReadField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="micro-label font-semibold tracking-[0.04em]">{label}</span>
      <span className="flex items-center gap-1.5 text-2sm text-foreground">
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
}

function TableLoading({ label }: { label: string }) {
  return <div className="flex items-center justify-center py-14 text-2sm text-muted-foreground">{label}</div>;
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 text-2sm text-muted-foreground transition-colors hover:text-foreground">
      <ArrowLeft className="w-4 h-4" /> Back to User Management
    </button>
  );
}
