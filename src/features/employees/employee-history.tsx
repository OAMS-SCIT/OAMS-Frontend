'use client';

import { Asset } from '@/types';
import { mockAssignmentHistory } from '@/lib/mock-data';
import { ConditionBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

interface Props {
  assets: Asset[];
  employeeId: string;
}

export function EmployeeHistory({ assets, employeeId }: Props) {
  const myHistory = mockAssignmentHistory.filter(h => h.employeeId === employeeId);

  const rows = myHistory.map(rec => {
    const asset = assets.find(a => a.id === rec.assetId);
    return { rec, asset };
  });

  return (
    <div className="motion-safe:animate-fade-rise">
      <div className="mb-6">
        <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">My Asset History</h1>
        <p className="text-sm text-muted-foreground mt-1">A complete record of all assets previously assigned to you.</p>
      </div>

      <div className="rounded-lg overflow-hidden bg-card border border-border shadow-card">
        {rows.length === 0 ? (
          <EmptyState icon="history" title="No history yet" subtitle="Your asset assignment history will appear here." />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted/60 border-b-2 border-border">
                {['Asset Name', 'Category', 'Serial Number', 'Date Assigned', 'Date Returned', 'Condition (Assign)', 'Condition (Return)', 'Notes'].map(h => (
                  <th key={h} className="text-left px-5 py-3 micro-label whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ rec, asset }, i) => (
                <tr key={rec.id}
                  className={`border-b border-border/60 border-l-[3px] ${
                    rec.isActive ? 'bg-card border-l-info' : `border-l-transparent ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`
                  }`}>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-2sm text-foreground">{asset?.name || '—'}</div>
                    <div className="text-2xs text-muted-foreground/80">{asset?.id}</div>
                  </td>
                  <td className="px-5 py-3.5 text-2sm text-muted-foreground">{asset?.categoryName || '—'}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{asset?.serialNumber || '—'}</td>
                  <td className="px-5 py-3.5 text-2sm text-muted-foreground nums">{rec.assignedDate}</td>
                  <td className="px-5 py-3.5">
                    {rec.isActive ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-2xs bg-info-surface text-info-foreground">
                        Currently Assigned
                      </span>
                    ) : (
                      <span className="text-2sm text-muted-foreground nums">{rec.actualReturn || '—'}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5"><ConditionBadge condition={rec.conditionAtAssignment} /></td>
                  <td className="px-5 py-3.5">
                    {rec.conditionAtReturn ? <ConditionBadge condition={rec.conditionAtReturn} /> : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-2sm text-muted-foreground">{rec.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
