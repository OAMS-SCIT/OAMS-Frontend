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
    <div className="rounded-2xl flex flex-col overflow-hidden bg-card border border-border shadow-card transition-shadow hover:shadow-hover">
      {/* Top with icon */}
      <div className="flex items-center justify-center py-8 bg-muted/50 border-b border-border">
        <div className="rounded-2xl p-4 bg-secondary">
          <Icon className="w-10 h-10 text-primary" />
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-[15px] leading-[1.3] tracking-[-0.01em] text-foreground">{asset.name}</h3>
        </div>
        <span className="inline-flex items-center self-start rounded-full px-2 py-0.5 mb-3 text-2xs font-medium bg-info-surface text-info-foreground">
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
            <span className="text-2xs font-medium uppercase tracking-[0.03em] text-muted-foreground/80">Condition</span>
            <ConditionBadge condition={asset.condition} />
          </div>
        </div>

        <button onClick={() => router.push(`/employee/assets/${asset.id}`)}
          className="mt-4 w-full rounded-control py-2 text-2sm font-medium border border-primary/30 text-primary transition-colors hover:bg-secondary">
          View Details
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-2xs font-medium uppercase tracking-[0.03em] text-muted-foreground/80">{label}</span>
      <span className={`text-xs text-foreground/70 max-w-40 text-right overflow-hidden text-ellipsis whitespace-nowrap ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export function EmployeeDashboard({ assets, employeeName, employeeId }: Props) {
  const myAssets = assets.filter(a => a.assignedToId === employeeId);

  return (
    <div className="motion-safe:animate-fade-rise">
      {/* Welcome banner */}
      <div className="rounded-2xl p-6 mb-6 flex items-center justify-between text-white bg-[linear-gradient(135deg,#0C1B4D_0%,#1D4ED8_100%)] shadow-card">
        <div>
          <div className="font-bold mb-1 text-[22px] tracking-[-0.02em]">Hello, {employeeName.split(' ')[0]}! 👋</div>
          <div className="text-sm opacity-85">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-extrabold nums">{myAssets.length}</div>
          <div className="text-2sm opacity-75">Assets assigned to you</div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Assets grid */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold mb-4 text-lg tracking-[-0.01em] text-foreground">My Current Assets</h2>
          {myAssets.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center bg-card border border-border">
              <div className="rounded-2xl p-5 mb-4 bg-muted">
                <Monitor className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <div className="font-semibold mb-2 text-base text-foreground">No assets currently assigned</div>
              <div className="text-2sm text-muted-foreground/80 max-w-[280px]">
                No assets are currently assigned to you. Contact your administrator if this is incorrect.
              </div>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
              {myAssets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="shrink-0 space-y-4 w-[260px]">
          {/* IT Support */}
          <div className="rounded-2xl p-5 bg-card border border-border shadow-card">
            <h3 className="font-semibold mb-4 text-sm tracking-[-0.01em] text-foreground">IT Support Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-control p-2 bg-secondary">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-2xs text-muted-foreground/80">Email</div>
                  <div className="text-2sm text-foreground">it@company.com</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-control p-2 bg-secondary">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="text-2xs text-muted-foreground/80">Phone</div>
                  <div className="text-2sm text-foreground">+1 (555) 999-0000</div>
                </div>
              </div>
            </div>
          </div>

          {/* Asset Policy */}
          <div className="rounded-2xl p-5 bg-warning-surface border border-warning/30">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
              <h3 className="font-semibold text-sm text-warning-foreground">Asset Policy Reminder</h3>
            </div>
            <p className="text-xs leading-normal text-warning-foreground/90">
              Remember to return assets by the due date. Report any damage or loss to IT immediately. Handle all devices with care.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
