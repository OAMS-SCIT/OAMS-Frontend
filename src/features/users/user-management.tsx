'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, MoreHorizontal, Eye, Pencil, UserX, Trash2, Info, RefreshCw, X } from 'lucide-react';
import type { DesignationManageItem, UserListItem, UserRole, UserStatus } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { PortalMenu } from '@/components/ui/PortalMenu';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,36,96,0.45)' }}>
      <div className="rounded-2xl shadow-2xl flex flex-col" style={{ width: 440, background: '#fff' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h2 className="font-bold" style={{ fontSize: 16, color: '#1E293B' }}>{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100" style={{ color: '#94A3B8' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5">
            <label className="block font-medium mb-1.5" style={{ fontSize: 13, color: '#374151' }}>
              Designation Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2"
              style={{ borderColor: '#CBD5E1', fontSize: 13 }}
            />
          </div>
          <div className="flex items-center gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: '0 0 16px 16px' }}>
            <button type="button" onClick={onClose}
              className="rounded-lg border px-5 py-2.5 font-medium hover:bg-gray-50 transition-colors"
              style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || saving}
              className="rounded-lg px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-50"
              style={{ fontSize: 14, background: '#1E3A8A' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function UserManagement() {
  const { user: currentUser } = useAuth();
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>User Management</h1>
        {tab === 'users' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
            style={{ background: '#1E3A8A', fontSize: 14 }}>
            <Plus className="w-4 h-4" /> Create User
          </button>
        )}
        {tab === 'designations' && (
          <button onClick={() => setShowCreateDesig(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
            style={{ background: '#1E3A8A', fontSize: 14 }}>
            <Plus className="w-4 h-4" /> New Designation
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-5" style={{ borderColor: '#E2E8F0' }}>
        {[
          { key: 'users', label: 'Users' },
          { key: 'designations', label: 'Designations' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as 'users' | 'designations')}
            className="mr-6 py-3 font-medium transition-colors"
            style={{ fontSize: 14, color: tab === t.key ? '#1E3A8A' : '#64748B', borderBottom: tab === t.key ? '2px solid #1E3A8A' : '2px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === 'users' && (
        <div>
          <div className="flex items-start gap-3 rounded-xl p-4 mb-5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#2563EB' }} />
            <p style={{ fontSize: 13, color: '#1D4ED8' }}>
              Only Admin-role users can log into the system. Employee accounts are used for asset tracking only.
            </p>
          </div>

          <div className="rounded-xl mb-4 p-4 flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <div className="relative flex-1" style={{ minWidth: 240 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-lg border pl-9 pr-3 py-2 focus:outline-none"
                style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
            </div>
            <select value={filterRole} onChange={e => { setFilterRole(e.target.value as UserRole | ''); setUserPage(1); }}
              className="rounded-lg border px-3 py-2" style={{ borderColor: '#CBD5E1', fontSize: 13 }}>
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Employee">Employee</option>
            </select>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as UserStatus | ''); setUserPage(1); }}
              className="rounded-lg border px-3 py-2" style={{ borderColor: '#CBD5E1', fontSize: 13 }}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {userLoading ? (
              <div className="flex items-center justify-center py-16" style={{ fontSize: 13, color: '#64748B' }}>
                Loading users…
              </div>
            ) : userError ? (
              <EmptyState
                icon="users"
                title="Couldn't load users"
                subtitle={userError}
                action={
                  <button onClick={() => loadUsers()}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:opacity-90"
                    style={{ background: '#1E3A8A', fontSize: 13, fontWeight: 600 }}>
                    <RefreshCw className="w-4 h-4" /> Retry
                  </button>
                }
              />
            ) : users.length === 0 ? (
              <EmptyState icon="users" title="No users found" subtitle="Try adjusting your search or filters." />
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      {['Name', 'Email Address', 'Contact', 'Designation', 'Role', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, i) => (
                      <tr key={user.id} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}
                        className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar user={user} size={34} />
                            <div>
                              <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{user.firstName} {user.lastName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#475569' }}>{user.email}</td>
                        <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{user.contactNumber}</td>
                        <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{user.designation?.name ?? '—'}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={user.role} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 rounded-full px-3 py-1"
                            style={{ display: 'inline-flex', background: user.status === 'Active' ? '#ECFDF5' : '#F8FAFC', border: '1px solid', borderColor: user.status === 'Active' ? '#A7F3D0' : '#E2E8F0' }}>
                            <div className="rounded-full" style={{ width: 8, height: 8, background: user.status === 'Active' ? '#22C55E' : '#94A3B8' }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: user.status === 'Active' ? '#059669' : '#64748B' }}>{user.status}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={(e) => {
                              if (openMenu?.id === user.id) { setOpenMenu(null); return; }
                              const rect = e.currentTarget.getBoundingClientRect();
                              setOpenMenu({ id: user.id, top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            }}
                            className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                            style={{ color: '#64748B' }}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenu?.id === user.id && (
                            <PortalMenu anchor={openMenu} onClose={() => setOpenMenu(null)}>
                              <button onClick={() => setOpenMenu(null)}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                style={{ fontSize: 13, color: '#334155' }}>
                                <Eye className="w-3.5 h-3.5" /> View Profile
                              </button>
                              <button onClick={() => { setOpenMenu(null); setEditTarget(user); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                style={{ fontSize: 13, color: '#334155' }}>
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              {(() => {
                                const isSelf = currentUser?.id === user.id;
                                const label = user.status === 'Active' ? 'Deactivate' : 'Activate';
                                return isSelf && user.status === 'Active' ? (
                                  <button disabled
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left opacity-40 cursor-not-allowed"
                                    style={{ fontSize: 13, color: '#D97706' }}>
                                    <UserX className="w-3.5 h-3.5" /> {label}
                                  </button>
                                ) : (
                                  <button onClick={() => handleToggleStatus(user)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                    style={{ fontSize: 13, color: '#D97706' }}>
                                    <UserX className="w-3.5 h-3.5" /> {label}
                                  </button>
                                );
                              })()}
                              {currentUser?.id === user.id ? (
                                <button disabled
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left opacity-40 cursor-not-allowed"
                                  style={{ fontSize: 13, color: '#EF4444' }}>
                                  <Trash2 className="w-3.5 h-3.5" /> Remove User
                                </button>
                              ) : (
                                <button onClick={() => handleDeleteUser(user)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                  style={{ fontSize: 13, color: '#EF4444' }}>
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
                <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>
                    Showing {Math.min((userPage - 1) * PER_PAGE + 1, userTotal)}–{Math.min(userPage * PER_PAGE, userTotal)} of {userTotal} users
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1}
                      className="rounded-lg px-3 py-1.5 border transition-colors hover:bg-gray-50 disabled:opacity-40"
                      style={{ fontSize: 13, color: '#475569', borderColor: '#E2E8F0' }}>
                      Previous
                    </button>
                    <span style={{ fontSize: 13, color: '#64748B' }}>Page {userPage} of {userTotalPages}</span>
                    <button onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))} disabled={userPage >= userTotalPages}
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
      )}

      {/* ── Designations tab ── */}
      {tab === 'designations' && (
        <div>
          <div className="rounded-xl mb-4 p-4 flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <div className="relative flex-1" style={{ minWidth: 240 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
              <input type="text" value={dSearch} onChange={e => setDSearch(e.target.value)}
                placeholder="Search designations..."
                className="w-full rounded-lg border pl-9 pr-3 py-2 focus:outline-none"
                style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
            </div>
            <select value={dFilterStatus} onChange={e => { setDFilterStatus(e.target.value as 'Active' | 'Inactive' | ''); setDPage(1); }}
              className="rounded-lg border px-3 py-2" style={{ borderColor: '#CBD5E1', fontSize: 13 }}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {dLoading ? (
              <div className="flex items-center justify-center py-16" style={{ fontSize: 13, color: '#64748B' }}>
                Loading designations…
              </div>
            ) : dError ? (
              <EmptyState
                icon="users"
                title="Couldn't load designations"
                subtitle={dError}
                action={
                  <button onClick={() => loadDesignations()}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:opacity-90"
                    style={{ background: '#1E3A8A', fontSize: 13, fontWeight: 600 }}>
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
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      {['Designation Name', 'Last Modified', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {designations.map((d, i) => (
                      <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                        <td className="px-5 py-3.5 font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{d.name}</td>
                        <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{formatDate(d.updatedAt)}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={d.status} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <button onClick={() => setEditDesig(d)}
                              className="hover:underline" style={{ fontSize: 13, color: '#2563EB' }}>
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
                              className="hover:underline"
                              style={{ fontSize: 13, color: '#D97706' }}>
                              {d.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => setDeleteDesig(d)}
                              className="hover:underline" style={{ fontSize: 13, color: '#EF4444' }}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #F1F5F9' }}>
                  <span style={{ fontSize: 13, color: '#64748B' }}>
                    Showing {Math.min((dPage - 1) * PER_PAGE + 1, dTotal)}–{Math.min(dPage * PER_PAGE, dTotal)} of {dTotal} designations
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDPage(p => Math.max(1, p - 1))} disabled={dPage === 1}
                      className="rounded-lg px-3 py-1.5 border transition-colors hover:bg-gray-50 disabled:opacity-40"
                      style={{ fontSize: 13, color: '#475569', borderColor: '#E2E8F0' }}>
                      Previous
                    </button>
                    <span style={{ fontSize: 13, color: '#64748B' }}>Page {dPage} of {dTotalPages}</span>
                    <button onClick={() => setDPage(p => Math.min(dTotalPages, p + 1))} disabled={dPage >= dTotalPages}
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
