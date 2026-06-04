'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, MoreHorizontal, Eye, Pencil, UserX, Trash2, Info, RefreshCw } from 'lucide-react';
import type { Designation, UserListItem, UserRole, UserStatus } from '@/types';
import { mockDesignations } from '@/lib/mock-data';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { CreateUserDrawer } from '@/components/overlays/CreateUserDrawer';
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog';
import { ApiError, getUsers, updateUserStatus } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

const PER_PAGE = 10;

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<'users' | 'designations'>('users');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | ''>('');
  const [filterStatus, setFilterStatus] = useState<UserStatus | ''>('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<UserListItem | null>(null);
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [designations] = useState<Designation[]>(mockDesignations);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

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
      const result = await getUsers({
        search: debouncedSearch || undefined,
        role: filterRole || undefined,
        status: filterStatus || undefined,
        page,
        limit: PER_PAGE,
      });
      setUsers(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterRole, filterStatus, page]);

  useEffect(() => {
    if (tab === 'users') load();
  }, [tab, load]);

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
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update status.');
    }
  };

  const filteredDesignations = designations.filter(d =>
    !search || d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>User Management</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
          style={{ background: '#1E3A8A', fontSize: 14 }}>
          <Plus className="w-4 h-4" /> Create User
        </button>
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

      {tab === 'users' && (
        <div>
          {/* Info banner */}
          <div className="flex items-start gap-3 rounded-xl p-4 mb-5" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#2563EB' }} />
            <p style={{ fontSize: 13, color: '#1D4ED8' }}>
              Only Admin-role users can log into the system. Employee accounts are used for asset tracking only.
            </p>
          </div>

          {/* Filter bar */}
          <div className="rounded-xl mb-4 p-4 flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <div className="relative flex-1" style={{ minWidth: 240 }}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-lg border pl-9 pr-3 py-2 focus:outline-none"
                style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
            </div>
            <select value={filterRole} onChange={e => { setFilterRole(e.target.value as UserRole | ''); setPage(1); }}
              className="rounded-lg border px-3 py-2" style={{ borderColor: '#CBD5E1', fontSize: 13 }}>
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Employee">Employee</option>
            </select>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as UserStatus | ''); setPage(1); }}
              className="rounded-lg border px-3 py-2" style={{ borderColor: '#CBD5E1', fontSize: 13 }}>
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Users Table */}
          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16" style={{ fontSize: 13, color: '#64748B' }}>
                Loading users…
              </div>
            ) : error ? (
              <EmptyState
                icon="users"
                title="Couldn't load users"
                subtitle={error}
                action={
                  <button onClick={() => load()}
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
                          <div className="relative">
                            <button onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                              className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors" style={{ color: '#64748B' }}>
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenu === user.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                                <div className="absolute right-0 z-20 rounded-xl shadow-lg overflow-hidden py-1" style={{ top: '100%', minWidth: 160, background: '#fff', border: '1px solid #E2E8F0' }}>
                                  <button onClick={() => setOpenMenu(null)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                    style={{ fontSize: 13, color: '#334155' }}>
                                    <Eye className="w-3.5 h-3.5" /> View Profile
                                  </button>
                                  <button onClick={() => setOpenMenu(null)}
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
                                  <button onClick={() => setOpenMenu(null)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                    style={{ fontSize: 13, color: '#EF4444' }}>
                                    <Trash2 className="w-3.5 h-3.5" /> Remove User
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
                    Showing {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} of {total} users
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
      )}

      {tab === 'designations' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ fontSize: 18, color: '#1E293B' }}>Designation Management</h2>
            <button className="flex items-center gap-2 rounded-lg border px-4 py-2.5 font-medium hover:bg-gray-50 transition-colors"
              style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
              <Plus className="w-4 h-4" /> New Designation
            </button>
          </div>
          <div className="rounded-xl mb-4 p-4 flex items-center gap-3" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search designations..." className="w-full rounded-lg border pl-9 pr-3 py-2 focus:outline-none"
                style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
            </div>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                  {['Designation Title', 'Last Modified', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDesignations.map((d, i) => (
                  <tr key={d.id} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                    <td className="px-5 py-3.5 font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{d.title}</td>
                    <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{d.lastModified}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={d.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button className="text-blue-500 hover:text-blue-700" style={{ fontSize: 13 }}>Edit</button>
                        <button className="text-amber-500 hover:text-amber-700" style={{ fontSize: 13 }}>Change Status</button>
                        <button className="text-red-400 hover:text-red-600" style={{ fontSize: 13 }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateUserDrawer
          onClose={() => setShowCreate(false)}
          onSave={() => { setShowCreate(false); load(); }}
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
    </div>
  );
}
