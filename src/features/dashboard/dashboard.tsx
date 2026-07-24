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

// CSS vars so chart colors flip with the theme
const CATEGORY_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  color: 'var(--popover-foreground)',
  fontSize: 13,
  boxShadow: 'var(--shadow-pop-src)',
};

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
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">Loading dashboard…</p>
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
            className="rounded-control px-4 py-2 font-medium text-2sm bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
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
    { label: 'Total Assets', value: totalAssets, icon: Database, accent: 'text-info', bg: 'bg-info-surface', bar: 'bg-info' },
    { label: 'Assigned Assets', value: assigned, icon: UserCheck, accent: 'text-info', bg: 'bg-info-surface', bar: 'bg-info' },
    { label: 'Available Assets', value: available, icon: CheckCircle, accent: 'text-success', bg: 'bg-success-surface', bar: 'bg-success' },
    { label: 'Under Repair', value: underRepair, icon: Wrench, accent: 'text-warning', bg: 'bg-warning-surface', bar: 'bg-warning' },
    { label: 'Retired Assets', value: retired, icon: Archive, accent: 'text-neutral', bg: 'bg-neutral-surface', bar: 'bg-neutral' },
  ];

  // Dashboard shows only the top categories by asset count; full list lives on Categories.
  const CATEGORY_BREAKDOWN_LIMIT = 6;
  const categoryData = data.categoryBreakdown
    .slice(0, CATEGORY_BREAKDOWN_LIMIT)
    .map((cat) => ({
      name: cat.categoryName,
      count: cat.assetCount,
      percentage: total ? Math.round((cat.assetCount / total) * 100) : 0,
    }));
  const hiddenCategoryCount = Math.max(0, data.categoryBreakdown.length - CATEGORY_BREAKDOWN_LIMIT);

  const statusData = [
    { name: 'Available', count: available, fill: 'var(--success)' },
    { name: 'Assigned', count: assigned, fill: 'var(--info)' },
    { name: 'Under Repair', count: underRepair, fill: 'var(--warning)' },
    { name: 'Retired', count: retired, fill: 'var(--neutral)' },
  ];

  const welcomeName = user?.firstName ?? 'Admin';

  return (
    <div className="motion-safe:animate-fade-rise">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, {welcomeName}. Here&apos;s your asset overview.
          </p>
        </div>
        <div className="text-2sm text-muted-foreground bg-muted rounded-control px-3 py-1.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-5 mb-6">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl p-5 bg-card border border-border shadow-card transition-shadow hover:shadow-hover">
              <div className="flex items-center justify-between mb-3">
                <div className={`rounded-xl p-2.5 ${card.bg}`}>
                  <Icon className={`w-5 h-5 ${card.accent}`} />
                </div>
              </div>
              <div className="font-bold text-3xl leading-[1.1] text-foreground nums">{card.value}</div>
              <div className="text-2sm text-muted-foreground mt-1">{card.label}</div>
              <div className={`mt-3 h-[3px] rounded-full ${card.bg}`}>
                <div
                  className={`h-full rounded-full ${card.bar}`}
                  style={{ width: `${total ? Math.min(100, (card.value / total) * 100) : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-[3fr_2fr] gap-5 mb-6">
        <div className="rounded-2xl p-6 bg-card border border-border shadow-card flex flex-col h-[280px] overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="font-semibold text-base tracking-[-0.01em] text-foreground">Asset Category Breakdown</h2>
            <button onClick={() => router.push('/admin/categories')} className="flex items-center gap-1 text-2sm text-primary transition-opacity hover:opacity-80">
              View All Categories <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {categoryData.length === 0 ? (
            <p className="text-2sm text-muted-foreground/80">No assets registered yet.</p>
          ) : (
            <div className="flex items-start gap-6 flex-1 min-h-0 overflow-hidden">
              <div className="w-[160px] h-[160px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="count" cx="50%" cy="50%" innerRadius={46} outerRadius={72} paddingAngle={3} stroke="var(--card)">
                      {categoryData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v ?? 0, 'Assets']} contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="space-y-2 overflow-hidden">
                  {categoryData.map((cat, i) => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="rounded-full shrink-0 w-2.5 h-2.5" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        <span className="text-2sm text-foreground/80 truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="font-semibold text-2sm text-foreground nums">{cat.count}</span>
                        <span className="text-xs text-muted-foreground/80 min-w-8 nums">{cat.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                {hiddenCategoryCount > 0 && (
                  <button
                    onClick={() => router.push('/admin/categories')}
                    className="mt-1.5 text-left text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
                  >
                    +{hiddenCategoryCount} more {hiddenCategoryCount === 1 ? 'category' : 'categories'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-6 bg-card border border-border shadow-card flex flex-col h-[280px]">
          <h2 className="font-semibold mb-4 shrink-0 text-base tracking-[-0.01em] text-foreground">Asset Status Overview</h2>
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ left: 0, right: 20, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="shrink-0 space-y-1.5">
              {statusData.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{s.name}</span>
                  <span className="font-semibold text-xs text-foreground nums">
                    {s.count} <span className="text-muted-foreground/80 font-normal">({total ? Math.round((s.count / total) * 100) : 0}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Tables */}
      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <h2 className="font-semibold text-[15px] tracking-[-0.01em] text-foreground">Recently Added Assets</h2>
            <button onClick={() => router.push('/admin/inventory')} className="flex items-center gap-1 text-2sm text-primary transition-opacity hover:opacity-80">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {data.recentAssets.length === 0 ? (
            <EmptyState icon="assets" title="No assets yet" subtitle="Register your first asset to see it here." />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-muted/60">
                  {['Asset Name', 'Category', 'Status', 'Date Added'].map(h => (
                    <th key={h} className="text-left px-6 py-2.5 micro-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentAssets.map((asset, i) => (
                  <tr key={asset.id}
                    className={`cursor-pointer transition-colors border-t border-border/60 hover:bg-primary/[0.04] ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
                    onClick={() => router.push(`/admin/inventory/${asset.id}`)}>
                    <td className="px-6 py-3">
                      <div className="font-medium text-2sm text-foreground">{asset.assetName}</div>
                    </td>
                    <td className="px-6 py-3 text-2sm text-muted-foreground">{asset.category.name}</td>
                    <td className="px-6 py-3"><StatusBadge status={asset.status} /></td>
                    <td className="px-6 py-3 text-2sm text-muted-foreground nums">{formatDate(asset.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
            <h2 className="font-semibold text-[15px] tracking-[-0.01em] text-foreground">Recently Assigned Assets</h2>
            <button onClick={() => router.push('/admin/assignments')} className="flex items-center gap-1 text-2sm text-primary transition-opacity hover:opacity-80">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {data.recentAssignments.length === 0 ? (
            <EmptyState icon="assignments" title="No assignments yet" subtitle="Assign an asset to an employee to see it here." />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-muted/60">
                  {['Asset Name', 'Assigned To', 'Date'].map(h => (
                    <th key={h} className="text-left px-6 py-2.5 micro-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.recentAssignments.map((assignment, i) => {
                  const assigneeName = `${assignment.assignedTo.firstName} ${assignment.assignedTo.lastName}`;
                  return (
                    <tr key={assignment.id}
                      className={`cursor-pointer transition-colors border-t border-border/60 hover:bg-primary/[0.04] ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
                      onClick={() => router.push(`/admin/inventory/${assignment.asset.id}`)}>
                      <td className="px-6 py-3">
                        <div className="font-medium text-2sm text-foreground">{assignment.asset.assetName}</div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar user={assignment.assignedTo} size={26} />
                          <span className="text-2sm text-foreground/80">{assigneeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-2sm text-muted-foreground nums">{formatDate(assignment.assignmentDate)}</td>
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
