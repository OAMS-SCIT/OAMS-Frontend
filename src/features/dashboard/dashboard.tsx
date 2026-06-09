'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database, UserCheck, CheckCircle, Wrench, Archive,
  ArrowRight, RefreshCw,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis,
} from 'recharts';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { getDashboardSummary } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { DashboardSummary } from '@/types';

const CATEGORY_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#94A3B8'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await getDashboardSummary();
      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <RefreshCw className="w-8 h-8 animate-spin mb-3" style={{ color: '#94A3B8' }} />
        <p style={{ fontSize: 14, color: '#64748B' }}>Loading dashboard…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon="assets"
        title="Unable to load dashboard"
        subtitle={error ?? 'Something went wrong. Please try again.'}
        action={
          <button
            onClick={load}
            className="rounded-lg px-4 py-2 font-medium hover:opacity-90"
            style={{ background: '#3B82F6', color: '#fff', fontSize: 13 }}
          >
            Retry
          </button>
        }
      />
    );
  }

  const { totalAssets, assigned, available, underRepair, retired } = data;
  const total = totalAssets;

  const kpiCards = [
    { label: 'Total Assets', value: totalAssets, icon: Database, accent: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Assigned Assets', value: assigned, icon: UserCheck, accent: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Available Assets', value: available, icon: CheckCircle, accent: '#10B981', bg: '#ECFDF5' },
    { label: 'Under Repair', value: underRepair, icon: Wrench, accent: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Retired Assets', value: retired, icon: Archive, accent: '#94A3B8', bg: '#F8FAFC' },
  ];

  const categoryData = data.categoryBreakdown.map((cat) => ({
    name: cat.categoryName,
    count: cat.assetCount,
    percentage: total ? Math.round((cat.assetCount / total) * 100) : 0,
  }));

  const statusData = [
    { name: 'Available', count: available, fill: '#10B981' },
    { name: 'Assigned', count: assigned, fill: '#3B82F6' },
    { name: 'Under Repair', count: underRepair, fill: '#F59E0B' },
    { name: 'Retired', count: retired, fill: '#94A3B8' },
  ];

  const welcomeName = user?.firstName ?? 'Admin';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginTop: 2 }}>
            Welcome back, {welcomeName}. Here&apos;s your asset overview.
          </p>
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
          {categoryData.length === 0 ? (
            <p style={{ fontSize: 13, color: '#94A3B8' }}>No assets registered yet.</p>
          ) : (
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
          )}
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
          {data.recentAssets.length === 0 ? (
            <EmptyState icon="assets" title="No assets yet" subtitle="Register your first asset to see it here." />
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Asset Name', 'Category', 'Status', 'Date Added'].map(h => (
                    <th key={h} className="text-left px-6 py-2.5" style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentAssets.map((asset, i) => (
                  <tr key={asset.id} className="cursor-pointer transition-colors hover:bg-blue-50/40"
                    style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderTop: '1px solid #F1F5F9' }}
                    onClick={() => router.push(`/admin/inventory/${asset.id}`)}>
                    <td className="px-6 py-3">
                      <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{asset.assetName}</div>
                    </td>
                    <td className="px-6 py-3" style={{ fontSize: 13, color: '#64748B' }}>{asset.category.name}</td>
                    <td className="px-6 py-3"><StatusBadge status={asset.status} /></td>
                    <td className="px-6 py-3" style={{ fontSize: 13, color: '#64748B' }}>{formatDate(asset.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
            <h2 className="font-semibold" style={{ fontSize: 15, color: '#1E293B' }}>Recently Assigned Assets</h2>
            <button onClick={() => router.push('/admin/assignments')} className="flex items-center gap-1 hover:opacity-80" style={{ fontSize: 13, color: '#3B82F6' }}>
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {data.recentAssignments.length === 0 ? (
            <EmptyState icon="assignments" title="No assignments yet" subtitle="Assign an asset to an employee to see it here." />
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Asset Name', 'Assigned To', 'Date'].map(h => (
                    <th key={h} className="text-left px-6 py-2.5" style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentAssignments.map((assignment, i) => {
                  const assigneeName = `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}`;
                  return (
                    <tr key={assignment.id} className="cursor-pointer transition-colors hover:bg-blue-50/40"
                      style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderTop: '1px solid #F1F5F9' }}
                      onClick={() => router.push(`/admin/inventory/${assignment.asset.id}`)}>
                      <td className="px-6 py-3">
                        <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{assignment.asset.assetName}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar user={assignment.assignedTo} size={26} />
                          <span style={{ fontSize: 13, color: '#334155' }}>{assigneeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3" style={{ fontSize: 13, color: '#64748B' }}>{formatDate(assignment.assignmentDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
