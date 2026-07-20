'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Pencil, Plus, RefreshCw, Mail, Phone } from 'lucide-react';
import type { EmployeeAssignmentItem, UserListItem } from '@/types';
import { getEmployeeAssignments, getUser } from '@/lib/api';
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

// Newest assignment date first. Compare by timestamp so the ordering holds
// regardless of whether the API returns a plain date or a full ISO datetime.
const byNewest = (a: EmployeeAssignmentItem, b: EmployeeAssignmentItem) =>
  new Date(b.assignmentDate).getTime() - new Date(a.assignmentDate).getTime();

export function EmployeeProfileView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const [user, setUser] = useState<UserListItem | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  const [assigned, setAssigned] = useState<EmployeeAssignmentItem[]>([]);
  const [assignedLoading, setAssignedLoading] = useState(true);
  const [history, setHistory] = useState<EmployeeAssignmentItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

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

  const loadAssigned = useCallback(async () => {
    setAssignedLoading(true);
    try {
      const result = await getEmployeeAssignments(userId, false);
      setAssigned([...result.data].sort(byNewest));
    } catch {
      setAssigned([]);
    } finally {
      setAssignedLoading(false);
    }
  }, [userId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const result = await getEmployeeAssignments(userId);
      setHistory([...result.data].sort(byNewest));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [userId]);

  useEffect(() => { loadUser(); }, [loadUser]);
  useEffect(() => { loadAssigned(); }, [loadAssigned]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Re-fetch both lists immediately after an assign (or return) — no page refresh.
  const refreshAssignments = useCallback(() => {
    loadAssigned();
    loadHistory();
  }, [loadAssigned, loadHistory]);

  const goToAsset = (assetId: string) => router.push(`/admin/inventory/${assetId}`);

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
          <button onClick={() => setShowEdit(true)}
            className="shrink-0 flex items-center gap-2 rounded-control border border-border px-4 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-muted">
            <Pencil className="w-4 h-4" /> Edit User
          </button>
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

      {/* ── Section 2 — Currently Assigned Assets ── */}
      <section className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-base tracking-[-0.01em] text-foreground">Currently Assigned Assets</h2>
          <button onClick={() => setShowAssign(true)}
            className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98]">
            <Plus className="w-4 h-4" /> Assign New Asset
          </button>
        </div>

        {assignedLoading ? (
          <TableLoading label="Loading assigned assets…" />
        ) : assigned.length === 0 ? (
          <EmptyState icon="assets" title="No assets currently assigned." subtitle="Use “Assign New Asset” to hand over an asset." />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted/60 border-b-2 border-border">
                {['Asset ID', 'Asset Name', 'Category', 'Status', 'Assigned Date'].map(h => (
                  <th key={h} className="text-left px-6 py-3 micro-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assigned.map((row, i) => (
                <AssignmentRow key={row.id} row={row} zebra={i % 2 === 1} onClick={() => goToAsset(row.asset.id)} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Section 3 — Assignment History Log ── */}
      <section className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-base tracking-[-0.01em] text-foreground">Assignment History Log</h2>
          <span className="text-2xs text-muted-foreground">Read-only</span>
        </div>

        {historyLoading ? (
          <TableLoading label="Loading history…" />
        ) : history.length === 0 ? (
          <EmptyState icon="history" title="No assignment history." subtitle="This user has no past or present assignment records." />
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
              {history.map((row, i) => {
                const returned = row.returnedAt !== null;
                return (
                  <tr key={row.id} onClick={() => goToAsset(row.asset.id)}
                    className={`border-b border-border/60 cursor-pointer transition-colors hover:bg-primary/[0.04] ${i % 2 === 1 ? 'bg-muted/30' : 'bg-card'}`}>
                    <td className="px-6 py-3.5 text-2sm font-mono text-muted-foreground">{row.asset.displayId}</td>
                    <td className="px-6 py-3.5 text-2sm font-medium text-foreground">{row.asset.name}</td>
                    <td className="px-6 py-3.5 text-2sm text-muted-foreground">{row.asset.category?.name ?? '—'}</td>
                    <td className="px-6 py-3.5"><StatusBadge status={returned ? 'Returned' : 'Assigned'} /></td>
                    <td className="px-6 py-3.5 text-2sm text-muted-foreground">{formatDate(row.assignmentDate)}</td>
                    <td className="px-6 py-3.5 text-2sm text-muted-foreground">{formatDate(row.returnDate)}</td>
                  </tr>
                );
              })}
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
          onAssigned={refreshAssignments}
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
      <td className="px-6 py-3.5"><StatusBadge status={row.asset.status} /></td>
      <td className="px-6 py-3.5 text-2sm text-muted-foreground">{formatDate(row.assignmentDate)}</td>
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
