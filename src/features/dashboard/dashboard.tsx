'use client';

import { useRouter } from 'next/navigation';
import {
  Database, UserCheck, CheckCircle, Wrench, Archive,
  ArrowRight, TrendingUp,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import { Asset } from '@/types';
import { mockUsers } from '@/lib/mock-data';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';

interface DashboardProps {
  assets: Asset[];
}

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#94A3B8'];

export function Dashboard({ assets }: DashboardProps) {
  const router = useRouter();

  const total = assets.length;
  const assigned = assets.filter(a => a.status === 'Assigned').length;
  const available = assets.filter(a => a.status === 'Available').length;
  const underRepair = assets.filter(a => a.status === 'Under Repair').length;
  const retired = assets.filter(a => a.status === 'Retired').length;

  const kpiCards = [
    { label: 'Total Assets', value: total, icon: Database, accent: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Assigned Assets', value: assigned, icon: UserCheck, accent: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Available Assets', value: available, icon: CheckCircle, accent: '#10B981', bg: '#ECFDF5' },
    { label: 'Under Repair', value: underRepair, icon: Wrench, accent: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Retired Assets', value: retired, icon: Archive, accent: '#94A3B8', bg: '#F8FAFC' },
  ];

  const categoryMap: Record<string, number> = {};
  assets.forEach(a => { categoryMap[a.categoryName] = (categoryMap[a.categoryName] || 0) + 1; });
  const categoryData = Object.entries(categoryMap).map(([name, count]) => ({
    name, count, percentage: Math.round((count / total) * 100),
  }));

  const statusData = [
    { name: 'Available', count: available, fill: '#10B981' },
    { name: 'Assigned', count: assigned, fill: '#3B82F6' },
    { name: 'Under Repair', count: underRepair, fill: '#F59E0B' },
    { name: 'Retired', count: retired, fill: '#94A3B8' },
  ];

  const recentAssets = [...assets].sort((a, b) => b.registeredDate.localeCompare(a.registeredDate)).slice(0, 5);
  const recentAssigned = assets.filter(a => a.status === 'Assigned' && a.assignedDate)
    .sort((a, b) => (b.assignedDate || '').localeCompare(a.assignedDate || '')).slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>Welcome back, Alex. Here's your asset overview.</p>
        </div>
        <div style={{ fontSize: 13, color: '#64748B', background: '#F1F5F9', borderRadius: 8, padding: '6px 12px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="rounded-xl p-2.5" style={{ background: card.bg }}>
                  <Icon className="w-5 h-5" style={{ color: card.accent }} />
                </div>
                <div className="flex items-center gap-1" style={{ fontSize: 11, color: '#10B981' }}>
                  <TrendingUp className="w-3 h-3" />
                  <span>+2.4%</span>
                </div>
              </div>
              <div className="font-bold" style={{ fontSize: 30, color: '#1E293B', lineHeight: 1.1 }}>{card.value}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{card.label}</div>
              <div className="mt-3" style={{ height: 3, borderRadius: 99, background: card.bg }}>
                <div style={{ height: '100%', borderRadius: 99, background: card.accent, width: `${total ? Math.min(100, (card.value / total) * 100) : 0}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: '3fr 2fr' }}>
        <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold" style={{ fontSize: 16, color: '#1E293B' }}>Asset Category Breakdown</h2>
            <button onClick={() => router.push('/admin/categories')} className="flex items-center gap-1 hover:opacity-80" style={{ fontSize: 13, color: '#3B82F6' }}>
              View All Categories <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-8">
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="count" cx="50%" cy="50%" innerRadius={52} outerRadius={80} paddingAngle={3}>
                    {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v ?? 0, 'Assets']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {categoryData.map((cat, i) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full shrink-0" style={{ width: 10, height: 10, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span style={{ fontSize: 13, color: '#334155' }}>{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold" style={{ fontSize: 13, color: '#1E293B' }}>{cat.count}</span>
                    <span style={{ fontSize: 12, color: '#94A3B8', minWidth: 32 }}>{cat.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 className="font-semibold mb-5" style={{ fontSize: 16, color: '#1E293B' }}>Asset Status Overview</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={statusData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {statusData.map(s => (
              <div key={s.name} className="flex items-center justify-between">
                <span style={{ fontSize: 12, color: '#64748B' }}>{s.name}</span>
                <span className="font-semibold" style={{ fontSize: 12, color: '#1E293B' }}>
                  {s.count} <span style={{ color: '#94A3B8', fontWeight: 400 }}>({total ? Math.round((s.count / total) * 100) : 0}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Tables */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <h2 className="font-semibold" style={{ fontSize: 15, color: '#1E293B' }}>Recently Added Assets</h2>
            <button onClick={() => router.push('/admin/inventory')} className="flex items-center gap-1 hover:opacity-80" style={{ fontSize: 13, color: '#3B82F6' }}>
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Asset Name', 'Category', 'Status', 'Date Added'].map(h => (
                  <th key={h} className="text-left px-6 py-2.5" style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAssets.map((asset, i) => (
                <tr key={asset.id} className="cursor-pointer transition-colors hover:bg-blue-50/40"
                  style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderTop: '1px solid #F1F5F9' }}
                  onClick={() => router.push(`/admin/inventory/${asset.id}`)}>
                  <td className="px-6 py-3">
                    <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{asset.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{asset.brand}</div>
                  </td>
                  <td className="px-6 py-3" style={{ fontSize: 13, color: '#64748B' }}>{asset.categoryName}</td>
                  <td className="px-6 py-3"><StatusBadge status={asset.status} /></td>
                  <td className="px-6 py-3" style={{ fontSize: 13, color: '#64748B' }}>{asset.registeredDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <h2 className="font-semibold" style={{ fontSize: 15, color: '#1E293B' }}>Recently Assigned Assets</h2>
            <button onClick={() => router.push('/admin/assignments')} className="flex items-center gap-1 hover:opacity-80" style={{ fontSize: 13, color: '#3B82F6' }}>
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Asset Name', 'Assigned To', 'Date'].map(h => (
                  <th key={h} className="text-left px-6 py-2.5" style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentAssigned.map((asset, i) => {
                const user = mockUsers.find(u => u.id === asset.assignedToId);
                return (
                  <tr key={asset.id} className="cursor-pointer transition-colors hover:bg-blue-50/40"
                    style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderTop: '1px solid #F1F5F9' }}
                    onClick={() => router.push(`/admin/inventory/${asset.id}`)}>
                    <td className="px-6 py-3">
                      <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{asset.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>{asset.id}</div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar user={user} size={26} />
                        <span style={{ fontSize: 13, color: '#334155' }}>{asset.assignedTo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3" style={{ fontSize: 13, color: '#64748B' }}>{asset.assignedDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
