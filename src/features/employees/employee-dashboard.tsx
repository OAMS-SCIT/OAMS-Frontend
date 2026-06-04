'use client';

import { useRouter } from 'next/navigation';
import { Monitor, Laptop, Headphones, Smartphone, Mail, Phone, AlertCircle, Calendar } from 'lucide-react';
import { Asset } from '@/types';
import { ConditionBadge } from '@/components/ui/StatusBadge';

interface Props {
  assets: Asset[];
  employeeName: string;
  employeeId: string;
}

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  Laptop: Laptop,
  Monitor: Monitor,
  Headset: Headphones,
  Phone: Smartphone,
};

function AssetCard({ asset }: { asset: Asset }) {
  const router = useRouter();
  const Icon = DEVICE_ICONS[asset.deviceType] || Monitor;

  return (
    <div className="rounded-2xl flex flex-col" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
      {/* Top with icon */}
      <div className="flex items-center justify-center py-8" style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
        <div className="rounded-2xl p-4" style={{ background: '#EFF6FF' }}>
          <Icon className="w-10 h-10" style={{ color: '#1E3A8A' }} />
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold" style={{ fontSize: 15, color: '#1E293B', lineHeight: 1.3 }}>{asset.name}</h3>
        </div>
        <span className="inline-flex items-center rounded-full px-2 py-0.5 mb-3"
          style={{ fontSize: 11, background: '#EFF6FF', color: '#2563EB', fontWeight: 500, alignSelf: 'flex-start' }}>
          {asset.categoryName}
        </span>

        <div className="space-y-2 flex-1">
          <InfoItem label="Serial" value={asset.serialNumber} mono />
          <InfoItem label="Assigned Since" value={asset.assignedDate || '—'} />
          <InfoItem label="Expected Return"
            value={asset.assignedDate
              ? new Date(new Date(asset.assignedDate).setFullYear(new Date(asset.assignedDate).getFullYear() + 1)).toISOString().split('T')[0]
              : 'No return date set'}
          />
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Condition</span>
            <ConditionBadge condition={asset.condition} />
          </div>
        </div>

        <button onClick={() => router.push(`/employee/assets/${asset.id}`)}
          className="mt-4 w-full rounded-lg py-2 font-medium border hover:bg-blue-50 transition-colors"
          style={{ fontSize: 13, color: '#3B82F6', borderColor: '#BFDBFE' }}>
          View Details
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</span>
      <span style={{ fontSize: 12, color: '#475569', fontFamily: mono ? 'monospace' : undefined, maxWidth: 160, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

export function EmployeeDashboard({ assets, employeeName, employeeId }: Props) {
  const myAssets = assets.filter(a => a.assignedToId === employeeId);

  return (
    <div>
      {/* Welcome banner */}
      <div className="rounded-2xl p-6 mb-6 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)', color: '#fff' }}>
        <div>
          <div className="font-bold mb-1" style={{ fontSize: 22 }}>Hello, {employeeName.split(' ')[0]}! 👋</div>
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className="text-right">
          <div style={{ fontSize: 36, fontWeight: 800 }}>{myAssets.length}</div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Assets assigned to you</div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Assets grid */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold mb-4" style={{ fontSize: 18, color: '#1E293B' }}>My Current Assets</h2>
          {myAssets.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="rounded-2xl p-5 mb-4" style={{ background: '#F1F5F9' }}>
                <Monitor className="w-10 h-10" style={{ color: '#CBD5E1' }} />
              </div>
              <div className="font-semibold mb-2" style={{ fontSize: 16, color: '#1E293B' }}>No assets currently assigned</div>
              <div style={{ fontSize: 13, color: '#94A3B8', maxWidth: 280 }}>
                No assets are currently assigned to you. Contact your administrator if this is incorrect.
              </div>
            </div>
          ) : (
            <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
              {myAssets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="shrink-0 space-y-4" style={{ width: 260 }}>
          {/* IT Support */}
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="font-semibold mb-4" style={{ fontSize: 14, color: '#1E293B' }}>IT Support Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2" style={{ background: '#EFF6FF' }}>
                  <Mail className="w-4 h-4" style={{ color: '#3B82F6' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Email</div>
                  <div style={{ fontSize: 13, color: '#1E293B' }}>it@company.com</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-lg p-2" style={{ background: '#EFF6FF' }}>
                  <Phone className="w-4 h-4" style={{ color: '#3B82F6' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>Phone</div>
                  <div style={{ fontSize: 13, color: '#1E293B' }}>+1 (555) 999-0000</div>
                </div>
              </div>
            </div>
          </div>

          {/* Asset Policy */}
          <div className="rounded-2xl p-5" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#D97706' }} />
              <h3 className="font-semibold" style={{ fontSize: 14, color: '#92400E' }}>Asset Policy Reminder</h3>
            </div>
            <p style={{ fontSize: 12, color: '#B45309', lineHeight: 1.5 }}>
              Remember to return assets by the due date. Report any damage or loss to IT immediately. Handle all devices with care.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
