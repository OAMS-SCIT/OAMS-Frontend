'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Search, MoreHorizontal, Eye, Pencil, UserX, Trash2, Info, RefreshCw, X, KeyRound } from 'lucide-react';
import type { DesignationManageItem, UserListItem, UserRole, UserStatus } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton';
import { Select } from '@/components/ui/Select';
import { PortalMenu } from '@/components/ui/PortalMenu';
import { OverlayPortal } from '@/components/overlays/OverlayPortal';
import { CreateUserDrawer } from '@/components/overlays/CreateUserDrawer';
import { EditUserDrawer } from '@/components/overlays/EditUserDrawer';
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog';
import {
  ApiError,
  createDesignation,
  deleteDesignation,
  deleteUser,
  getDesignationsManage,
  getUsers,
  resendCredentials,
  updateDesignation,
  updateDesignationStatus,
  updateUserStatus,
} from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

const PER_PAGE = 10;

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
}

// ── Inline designation name dialog ─────────────────────────────────────────

interface DesignationDialogProps {
  title: string;
  initialValue?: string;
  onConfirm: (name: string) => Promise<void>;
  onClose: () => void;
}

function DesignationDialog({ title, initialValue = '', onConfirm, onClose }: DesignationDialogProps) {
  const [name, setName] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <OverlayPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-[2px] motion-safe:animate-overlay-in">
      <div className="rounded-2xl flex flex-col w-[440px] bg-card text-card-foreground shadow-pop motion-safe:animate-pop-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-base tracking-[-0.01em] text-foreground">{title}</h2>
          <button onClick={onClose} className="rounded-control p-1.5 text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            <label className="block font-medium mb-1.5 text-2sm text-foreground/80">
              Designation Name <span className="text-danger">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full rounded-control border border-input bg-input-background text-2sm px-3 py-2 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
            />
          </div>
          <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-b-2xl">
            <button type="button" onClick={onClose}
              className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || saving}
              className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </OverlayPortal>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'designations'>('users');

  // ── Users tab state ──
  const [userSearch, setUserSearch] = useState('');
  const [userDebouncedSearch, setUserDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | ''>('');
  const [filterStatus, setFilterStatus] = useState<UserStatus | ''>('');
  const [openMenu, setOpenMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<UserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserListItem | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [userPage, setUserPage] = useState(1);

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  // ── Designations tab state ──
  const [dSearch, setDSearch] = useState('');
  const [dDebouncedSearch, setDDebouncedSearch] = useState('');
  const [dFilterStatus, setDFilterStatus] = useState<'Active' | 'Inactive' | ''>('');
  const [dPage, setDPage] = useState(1);
  const [designations, setDesignations] = useState<DesignationManageItem[]>([]);
  const [dTotal, setDTotal] = useState(0);
  const [dLoading, setDLoading] = useState(true);
  const [dError, setDError] = useState<string | null>(null);

  const [showCreateDesig, setShowCreateDesig] = useState(false);
  const [editDesig, setEditDesig] = useState<DesignationManageItem | null>(null);
  const [deactivateDesig, setDeactivateDesig] = useState<DesignationManageItem | null>(null);
  const [deleteDesig, setDeleteDesig] = useState<DesignationManageItem | null>(null);

  const userTotalPages = Math.max(1, Math.ceil(userTotal / PER_PAGE));
  const dTotalPages = Math.max(1, Math.ceil(dTotal / PER_PAGE));
  const hasActiveUserFilters = Boolean(userSearch || filterRole || filterStatus);
  const hasActiveDesignationFilters = Boolean(dSearch || dFilterStatus);

  const clearUserFilters = () => {
    setUserSearch('');
    setUserDebouncedSearch('');
    setFilterRole('');
    setFilterStatus('');
    setUserPage(1);
  };

  const clearDesignationFilters = () => {
    setDSearch('');
    setDDebouncedSearch('');
    setDFilterStatus('');
    setDPage(1);
  };

  // ── Debounce: users ──
  useEffect(() => {
    const t = setTimeout(() => { setUserDebouncedSearch(userSearch); setUserPage(1); }, 350);
    return () => clearTimeout(t);
  }, [userSearch]);

  // ── Debounce: designations ──
  useEffect(() => {
    const t = setTimeout(() => { setDDebouncedSearch(dSearch); setDPage(1); }, 350);
    return () => clearTimeout(t);
  }, [dSearch]);

  const loadUsers = useCallback(async () => {
    setUserLoading(true);
    setUserError(null);
    try {
      const result = await getUsers({
        search: userDebouncedSearch || undefined,
        role: filterRole || undefined,
        status: filterStatus || undefined,
        page: userPage,
        limit: PER_PAGE,
      });
      setUsers(result.data);
      setUserTotal(result.total);
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'Failed to load users.');
      setUsers([]);
      setUserTotal(0);
    } finally {
      setUserLoading(false);
    }
  }, [userDebouncedSearch, filterRole, filterStatus, userPage]);

  const loadDesignations = useCallback(async () => {
    setDLoading(true);
    setDError(null);
    try {
      const result = await getDesignationsManage({
        search: dDebouncedSearch || undefined,
        status: dFilterStatus || undefined,
        page: dPage,
        limit: PER_PAGE,
      });
      setDesignations(result.data);
      setDTotal(result.total);
    } catch (err) {
      setDError(err instanceof Error ? err.message : 'Failed to load designations.');
      setDesignations([]);
      setDTotal(0);
    } finally {
      setDLoading(false);
    }
  }, [dDebouncedSearch, dFilterStatus, dPage]);

  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab, loadUsers]);
  useEffect(() => { if (tab === 'designations') loadDesignations(); }, [tab, loadDesignations]);

  // ── User actions ──
  const handleToggleStatus = (user: UserListItem) => {
    setOpenMenu(null);
    if (user.status === 'Active') {
      setConfirmTarget(user);
    } else {
      void executeStatusChange(user, 'Active');
    }
  };

  const executeStatusChange = async (user: UserListItem, next: UserStatus) => {
    try {
      await updateUserStatus(user.id, next);
      toast.success(`${user.firstName} ${user.lastName} set to ${next}.`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update status.');
    }
  };

  const handleDeleteUser = (user: UserListItem) => {
    setOpenMenu(null);
    setDeleteTarget(user);
  };

  const executeDeleteUser = async (user: UserListItem) => {
    try {
      await deleteUser(user.id);
      toast.success(`${user.firstName} ${user.lastName} removed successfully.`);
      loadUsers();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to remove user.');
    }
  };

  const handleResendCredentials = async (user: UserListItem) => {
    setOpenMenu(null);
    if (resendingId) return;
    setResendingId(user.id);
    try {
      await resendCredentials(user.id);
      toast.success(`New temporary credentials emailed to ${user.email}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to resend credentials.');
    } finally {
      setResendingId(null);
    }
  };

  // ── Designation actions ──
  const handleCreateDesignation = async (name: string) => {
    try {
      await createDesignation(name);
      toast.success(`Designation "${name}" created.`);
      setShowCreateDesig(false);
      loadDesignations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create designation.');
      throw err;
    }
  };

  const handleUpdateDesignation = async (name: string) => {
    if (!editDesig) return;
    try {
      await updateDesignation(editDesig.id, name);
      toast.success(`Designation updated to "${name}".`);
      setEditDesig(null);
      loadDesignations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update designation.');
      throw err;
    }
  };

  const executeDesignationStatusChange = async (desig: DesignationManageItem, status: 'Active' | 'Inactive') => {
    try {
      await updateDesignationStatus(desig.id, status);
      toast.success(`"${desig.name}" set to ${status}.`);
      setDeactivateDesig(null);
      loadDesignations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update status.');
    }
  };

  const executeDeleteDesignation = async (desig: DesignationManageItem) => {
    try {
      await deleteDesignation(desig.id);
      toast.success(`"${desig.name}" removed successfully.`);
      setDeleteDesig(null);
      loadDesignations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to remove designation.');
    }
  };

  return (
    <div className="motion-safe:animate-fade-rise">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">User Management</h1>
        {tab === 'users' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98]">
            <Plus className="w-4 h-4" /> Create User
          </button>
        )}
        {tab === 'designations' && (
          <button onClick={() => setShowCreateDesig(true)}
            className="flex items-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98]">
            <Plus className="w-4 h-4" /> New Designation
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-5">
        {[
          { key: 'users', label: 'Users' },
          { key: 'designations', label: 'Designations' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as 'users' | 'designations')}
            className={`mr-6 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <div>
          <div className="flex items-start gap-3 rounded-lg p-4 mb-5 bg-info-surface border border-info/30">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-info" />
            <p className="text-2sm text-info-foreground">
              Both Admin and Employee accounts can sign in. Employees see only their own profile; admin tools stay restricted to the Admin role.
            </p>
          </div>

          <div className="rounded-lg mb-4 p-4 flex items-center gap-3 flex-wrap bg-card border border-border shadow-card">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-control border border-input bg-input-background text-2sm pl-9 pr-3 py-2 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring" />
            </div>
            <Select value={filterRole} onValueChange={v => { setFilterRole(v as UserRole | ''); setUserPage(1); }}
              ariaLabel="Role" placeholder="All Roles"
              options={[
                { value: '', label: 'All Roles' },
                { value: 'Admin', label: 'Admin' },
                { value: 'Employee', label: 'Employee' },
              ]} />
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v as UserStatus | ''); setUserPage(1); }}
              ariaLabel="Status" placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]} />
            <ClearFiltersButton onClear={clearUserFilters} disabled={!hasActiveUserFilters} />
          </div>

          <div className="rounded-lg overflow-hidden bg-card border border-border shadow-card">
            {userLoading ? (
              <div className="flex items-center justify-center py-16 text-2sm text-muted-foreground">
                Loading users…
              </div>
            ) : userError ? (
              <EmptyState
                icon="users"
                title="Couldn't load users"
                subtitle={userError}
                action={
                  <button onClick={() => loadUsers()}
                    className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                }
              />
            ) : users.length === 0 ? (
              <EmptyState icon="users" title="No users found" subtitle="Try adjusting your search or filters." />
            ) : (
              <>
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="bg-muted/60 border-b-2 border-border">
                      {(
                        [
                          { label: 'Name',           width: '22%' },
                          { label: 'Email & Contact', width: '22%' },
                          { label: 'Designation',    width: '18%' },
                          { label: 'Role',           width: '12%' },
                          { label: 'Status',         width: '12%' },
                          { label: 'Actions',        width: '8%'  },
                        ] as const
                      ).map(({ label, width }) => (
                        <th key={label} className="text-left px-5 py-3 micro-label" style={{ width }}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.id}
                        className={`border-b border-border/60 transition-colors hover:bg-primary/[0.04] ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar user={user} size={34} />
                            <div className="min-w-0 flex-1">
                              <div
                                className="font-medium text-2sm text-foreground truncate"
                                title={`${user.firstName} ${user.lastName}`}
                              >
                                {user.firstName} {user.lastName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="text-2sm text-foreground/70 truncate" title={user.email}>{user.email}</div>
                          {user.contactNumber && (
                            <div className="text-xs text-muted-foreground nums mt-0.5">{user.contactNumber}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-2sm text-muted-foreground">{user.designation?.name ?? '—'}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={user.role} /></td>
                        <td className="px-5 py-3.5">
                          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 border ${
                            user.status === 'Active'
                              ? 'bg-success-surface border-success/30'
                              : 'bg-neutral-surface border-border'
                          }`}>
                            <div className={`rounded-full w-2 h-2 ${user.status === 'Active' ? 'bg-success' : 'bg-neutral'}`} />
                            <span className={`text-xs font-medium ${user.status === 'Active' ? 'text-success-foreground' : 'text-muted-foreground'}`}>{user.status}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={(e) => {
                              if (openMenu?.id === user.id) { setOpenMenu(null); return; }
                              const rect = e.currentTarget.getBoundingClientRect();
                              setOpenMenu({ id: user.id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            }}
                            className="rounded-control p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenu?.id === user.id && (
                            <PortalMenu anchor={openMenu} onClose={() => setOpenMenu(null)}>
                              <button onClick={() => { setOpenMenu(null); router.push(`/admin/users/${user.id}`); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-2sm text-foreground hover:bg-muted transition-colors">
                                <Eye className="w-3.5 h-3.5" /> View Profile
                              </button>
                              <button onClick={() => { setOpenMenu(null); setEditTarget(user); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-2sm text-foreground hover:bg-muted transition-colors">
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              {user.isFirstLogin && (
                                <button onClick={() => handleResendCredentials(user)}
                                  disabled={resendingId === user.id}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-2sm text-foreground hover:bg-muted transition-colors disabled:opacity-50">
                                  <KeyRound className="w-3.5 h-3.5" /> {resendingId === user.id ? 'Sending…' : 'Resend Credentials'}
                                </button>
                              )}
                              {(() => {
                                const isSelf = currentUser?.id === user.id;
                                const label = user.status === 'Active' ? 'Deactivate' : 'Activate';
                                return isSelf && user.status === 'Active' ? (
                                  <button disabled
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-2sm text-warning-foreground opacity-40 cursor-not-allowed">
                                    <UserX className="w-3.5 h-3.5" /> {label}
                                  </button>
                                ) : (
                                  <button onClick={() => handleToggleStatus(user)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-2sm text-warning-foreground hover:bg-muted transition-colors">
                                    <UserX className="w-3.5 h-3.5" /> {label}
                                  </button>
                                );
                              })()}
                              {currentUser?.id === user.id ? (
                                <button disabled
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-2sm text-danger opacity-40 cursor-not-allowed">
                                  <Trash2 className="w-3.5 h-3.5" /> Remove User
                                </button>
                              ) : (
                                <button onClick={() => handleDeleteUser(user)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-2sm text-danger hover:bg-muted transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" /> Remove User
                                </button>
                              )}
                            </PortalMenu>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-5 py-4 border-t border-border/60">
                  <span className="text-2sm text-muted-foreground nums">
                    Showing {Math.min((userPage - 1) * PER_PAGE + 1, userTotal)}–{Math.min(userPage * PER_PAGE, userTotal)} of {userTotal} users
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}
                      className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40">
                      Previous
                    </button>
                    <span className="text-2sm text-muted-foreground nums">Page {userPage} of {userTotalPages}</span>
                    <button onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))} disabled={userPage >= userTotalPages}
                      className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40">
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Designations tab ── */}
      {tab === 'designations' && (
        <div>
          <div className="rounded-lg mb-4 p-4 flex items-center gap-3 flex-wrap bg-card border border-border shadow-card">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
              <input type="text" value={dSearch} onChange={e => setDSearch(e.target.value)}
                placeholder="Search designations..."
                className="w-full rounded-control border border-input bg-input-background text-2sm pl-9 pr-3 py-2 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring" />
            </div>
            <Select value={dFilterStatus} onValueChange={v => { setDFilterStatus(v as 'Active' | 'Inactive' | ''); setDPage(1); }}
              ariaLabel="Status" placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]} />
            <ClearFiltersButton onClear={clearDesignationFilters} disabled={!hasActiveDesignationFilters} />
          </div>

          <div className="rounded-lg overflow-hidden bg-card border border-border shadow-card">
            {dLoading ? (
              <div className="flex items-center justify-center py-16 text-2sm text-muted-foreground">
                Loading designations…
              </div>
            ) : dError ? (
              <EmptyState
                icon="users"
                title="Couldn't load designations"
                subtitle={dError}
                action={
                  <button onClick={() => loadDesignations()}
                    className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                }
              />
            ) : designations.length === 0 ? (
              <EmptyState icon="users" title="No designations found" subtitle="Try adjusting your search or filters." />
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/60 border-b-2 border-border">
                      {['Designation Name', 'Last Modified', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 micro-label">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {designations.map((d, i) => (
                      <tr key={d.id} className={`border-b border-border/60 transition-colors hover:bg-primary/[0.04] ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                        <td className="px-5 py-3.5 font-medium text-2sm text-foreground">{d.name}</td>
                        <td className="px-5 py-3.5 text-2sm text-muted-foreground nums">{formatDate(d.updatedAt)}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={d.status} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <button onClick={() => setEditDesig(d)}
                              className="hover:underline text-2sm text-primary">
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (d.status === 'Active') {
                                  setDeactivateDesig(d);
                                } else {
                                  void executeDesignationStatusChange(d, 'Active');
                                }
                              }}
                              className="hover:underline text-2sm text-warning-foreground">
                              {d.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => setDeleteDesig(d)}
                              className="hover:underline text-2sm text-danger">
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-5 py-4 border-t border-border/60">
                  <span className="text-2sm text-muted-foreground nums">
                    Showing {Math.min((dPage - 1) * PER_PAGE + 1, dTotal)}–{Math.min(dPage * PER_PAGE, dTotal)} of {dTotal} designations
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDPage(p => Math.max(1, p - 1))} disabled={dPage === 1}
                      className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40">
                      Previous
                    </button>
                    <span className="text-2sm text-muted-foreground nums">Page {dPage} of {dTotalPages}</span>
                    <button onClick={() => setDPage(p => Math.min(dTotalPages, p + 1))} disabled={dPage >= dTotalPages}
                      className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40">
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── User overlays ── */}
      {showCreate && (
        <CreateUserDrawer
          onClose={() => setShowCreate(false)}
          onSave={() => { setShowCreate(false); loadUsers(); }}
        />
      )}

      {editTarget && (
        <EditUserDrawer
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={() => { setEditTarget(null); loadUsers(); }}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          title="Deactivate User"
          description={`Deactivate ${confirmTarget.firstName} ${confirmTarget.lastName}? They will immediately lose access to the system.`}
          confirmLabel="Deactivate"
          onConfirm={() => { void executeStatusChange(confirmTarget, 'Inactive'); setConfirmTarget(null); }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Remove User"
          description={`Permanently remove ${deleteTarget.firstName} ${deleteTarget.lastName}? This action cannot be undone. If they have any asset history, removal will be blocked — deactivate the account instead.`}
          confirmLabel="Remove"
          onConfirm={() => { void executeDeleteUser(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Designation overlays ── */}
      {showCreateDesig && (
        <DesignationDialog
          title="New Designation"
          onConfirm={handleCreateDesignation}
          onClose={() => setShowCreateDesig(false)}
        />
      )}

      {editDesig && (
        <DesignationDialog
          title="Edit Designation"
          initialValue={editDesig.name}
          onConfirm={handleUpdateDesignation}
          onClose={() => setEditDesig(null)}
        />
      )}

      {deactivateDesig && (
        <ConfirmDialog
          title="Deactivate Designation"
          description={`Deactivate "${deactivateDesig.name}"? It will be hidden from the user creation dropdown but existing assignments will be preserved.`}
          confirmLabel="Deactivate"
          onConfirm={() => void executeDesignationStatusChange(deactivateDesig, 'Inactive')}
          onCancel={() => setDeactivateDesig(null)}
        />
      )}

      {deleteDesig && (
        <ConfirmDialog
          title="Delete Designation"
          description={`Permanently delete "${deleteDesig.name}"? This cannot be undone. If any users are assigned to this designation the deletion will be blocked — deactivate it instead.`}
          confirmLabel="Delete"
          onConfirm={() => { void executeDeleteDesignation(deleteDesig); setDeleteDesig(null); }}
          onCancel={() => setDeleteDesig(null)}
        />
      )}
    </div>
  );
}
