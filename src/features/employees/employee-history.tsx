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
    <div>
      <div className="mb-6">
        <h1 className="font-bold" style={{ fontSize: 24, color: '#1E293B' }}>My Asset History</h1>
        <p style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>A complete record of all assets previously assigned to you.</p>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {rows.length === 0 ? (
          <EmptyState icon="history" title="No history yet" subtitle="Your asset assignment history will appear here." />
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                {['Asset Name', 'Category', 'Serial Number', 'Date Assigned', 'Date Returned', 'Condition (Assign)', 'Condition (Return)', 'Notes'].map(h => (
                  <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ rec, asset }, i) => (
                <tr key={rec.id}
                  style={{
                    background: rec.isActive ? '#fff' : i % 2 === 0 ? '#fff' : '#F8FAFC',
                    borderBottom: '1px solid #F1F5F9',
                    borderLeft: rec.isActive ? '3px solid #3B82F6' : '3px solid transparent',
                  }}>
                  <td className="px-5 py-3.5">
                    <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{asset?.name || '—'}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{asset?.id}</div>
                  </td>
                  <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{asset?.categoryName || '—'}</td>
                  <td className="px-5 py-3.5" style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{asset?.serialNumber || '—'}</td>
                  <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{rec.assignedDate}</td>
                  <td className="px-5 py-3.5">
                    {rec.isActive ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 11, background: '#EFF6FF', color: '#2563EB' }}>
                        Currently Assigned
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#64748B' }}>{rec.actualReturn || '—'}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5"><ConditionBadge condition={rec.conditionAtAssignment} /></td>
                  <td className="px-5 py-3.5">
                    {rec.conditionAtReturn ? <ConditionBadge condition={rec.conditionAtReturn} /> : <span style={{ color: '#CBD5E1' }}>—</span>}
                  </td>
                  <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{rec.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
