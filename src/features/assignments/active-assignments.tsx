'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye, RotateCcw, AlertTriangle } from 'lucide-react';
import { Asset } from '@/types';
import { mockAssignmentHistory } from '@/lib/mock-data';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ReturnAssetDrawer } from '@/components/overlays/ReturnAssetDrawer';

interface Props {
  assets: Asset[];
  onReturnAsset: (id: string) => void;
}

export function ActiveAssignments({ assets, onReturnAsset }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [returnAsset, setReturnAsset] = useState<Asset | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const assignedAssets = assets.filter(a => a.status === 'Assigned');
  const filtered = assignedAssets.filter(a => {
    const asgn = mockAssignmentHistory.find(h => h.assetId === a.id && h.isActive);
    const q = search.toLowerCase();
    const matchSearch = !q || a.name.toLowerCase().includes(q) || (a.assignedTo || '').toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    const matchCat = !filterCategory || a.categoryName === filterCategory;
    const isOverdue = asgn?.expectedReturn && asgn.expectedReturn < today;
    if (overdueOnly && !isOverdue) return false;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(assets.map(a => a.categoryName))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>Active Assignments</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
            {assignedAssets.length} assets currently assigned to employees
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl mb-4 p-4 flex items-center gap-3 flex-wrap" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
        <div className="relative flex-1" style={{ minWidth: 240 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by employee or asset name..." className="w-full rounded-lg border pl-9 pr-3 py-2 focus:outline-none"
            style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="rounded-lg border px-3 py-2" style={{ borderColor: '#CBD5E1', fontSize: 13 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <button
          onClick={() => setOverdueOnly(o => !o)}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 font-medium transition-all"
          style={{
            fontSize: 13, borderColor: overdueOnly ? '#F59E0B' : '#E2E8F0',
            background: overdueOnly ? '#FFFBEB' : '#fff',
            color: overdueOnly ? '#D97706' : '#64748B',
          }}>
          <AlertTriangle className="w-4 h-4" />
          Overdue Only
        </button>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="assignments" title="No active assignments" subtitle="No assets are currently assigned matching your filters." />
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                {['Asset Name', 'Asset ID', 'Serial Number', 'Assigned To', 'Assignment Date', 'Expected Return', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset, i) => {
                const asgn = mockAssignmentHistory.find(h => h.assetId === asset.id && h.isActive);
                const isOverdue = asgn?.expectedReturn && asgn.expectedReturn < today;
                return (
                  <tr key={asset.id}
                    style={{
                      background: i % 2 === 0 ? '#fff' : '#F8FAFC',
                      borderBottom: '1px solid #F1F5F9',
                      borderLeft: isOverdue ? '3px solid #EF4444' : '3px solid transparent',
                    }}
                    className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{asset.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{asset.categoryName}</div>
                    </td>
                    <td className="px-5 py-3.5" style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'monospace' }}>{asset.id}</td>
                    <td className="px-5 py-3.5" style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{asset.serialNumber}</td>
                    <td className="px-5 py-3.5">
                      {asset.assignedTo && (
                        <div className="flex items-center gap-2">
                          <Avatar name={asset.assignedTo} size={26} />
                          <div>
                            <div style={{ fontSize: 13, color: '#334155', fontWeight: 500 }}>{asset.assignedTo}</div>
                            {asgn && <div style={{ fontSize: 11, color: '#94A3B8' }}>{asgn.employeeDesignation}</div>}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{asset.assignedDate}</td>
                    <td className="px-5 py-3.5">
                      {asgn?.expectedReturn ? (
                        <span style={{ fontSize: 13, color: isOverdue ? '#EF4444' : '#64748B', fontWeight: isOverdue ? 600 : 400 }}>
                          {asgn.expectedReturn}
                        </span>
                      ) : (
                        <span style={{ fontSize: 13, color: '#CBD5E1' }}>—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {isOverdue ? (
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
                        <button onClick={() => router.push(`/admin/inventory/${asset.id}`)}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 border hover:bg-gray-50 transition-colors"
                          style={{ fontSize: 12, color: '#475569', borderColor: '#E2E8F0' }}>
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button onClick={() => setReturnAsset(asset)}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 border hover:bg-amber-50 transition-colors"
                          style={{ fontSize: 12, color: '#D97706', borderColor: '#FDE68A' }}>
                          <RotateCcw className="w-3.5 h-3.5" /> Return
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {returnAsset && (
        <ReturnAssetDrawer
          assetName={returnAsset.name}
          assignedTo={returnAsset.assignedTo || ''}
          since={returnAsset.assignedDate || ''}
          onClose={() => setReturnAsset(null)}
          onConfirm={() => { onReturnAsset(returnAsset.id); setReturnAsset(null); }}
        />
      )}
    </div>
  );
}
