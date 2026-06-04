'use client';

import { useState } from 'react';
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { Category } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface Props {
  categories: Category[];
}

export function CategoryManagement({ categories }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = categories.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>Asset Categories</h1>
        <button className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
          style={{ background: '#1E3A8A', fontSize: 14 }}>
          <Plus className="w-4 h-4" /> Create Category
        </button>
      </div>

      <div className="rounded-xl mb-4 p-4 flex items-center gap-3" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search category name..." className="w-full rounded-lg border pl-9 pr-3 py-2 focus:outline-none"
            style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="rounded-lg border px-3 py-2" style={{ borderColor: '#CBD5E1', fontSize: 13 }}>
          <option value="">All Statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="assets" title="No categories found" subtitle="Create your first asset category to get started." />
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                {['Category Name', 'Description', 'Custom Attributes', 'Assets', 'Status', 'Date Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cat, i) => (
                <tr key={cat.id} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}
                  className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold" style={{ fontSize: 13, color: '#1E293B' }}>{cat.name}</div>
                  </td>
                  <td className="px-5 py-4" style={{ maxWidth: 200 }}>
                    <div style={{ fontSize: 13, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat.description}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="rounded-full px-2.5 py-0.5 font-semibold"
                      style={{ fontSize: 13, background: '#EFF6FF', color: '#1E3A8A' }}>
                      {cat.customAttributes.length}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="font-semibold" style={{ fontSize: 13, color: '#1E293B' }}>{cat.assetCount}</span>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={cat.status} /></td>
                  <td className="px-5 py-4" style={{ fontSize: 13, color: '#64748B' }}>{cat.dateCreated}</td>
                  <td className="px-5 py-4">
                    <div className="relative">
                      <button onClick={() => setOpenMenu(openMenu === cat.id ? null : cat.id)}
                        className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors" style={{ color: '#64748B' }}>
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenu === cat.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                          <div className="absolute right-0 z-20 rounded-xl shadow-lg overflow-hidden py-1" style={{ top: '100%', minWidth: 160, background: '#fff', border: '1px solid #E2E8F0' }}>
                            {[
                              { icon: Eye, label: 'View Details', color: '#334155' },
                              { icon: Pencil, label: 'Edit', color: '#334155' },
                              { icon: Pencil, label: 'Change Status', color: '#D97706' },
                              { icon: Trash2, label: 'Delete', color: '#EF4444' },
                            ].map(item => (
                              <button key={item.label} onClick={() => setOpenMenu(null)}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                                style={{ fontSize: 13, color: item.color }}>
                                <item.icon className="w-3.5 h-3.5" />
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
