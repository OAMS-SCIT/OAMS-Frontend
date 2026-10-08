'use client';

import { useState } from 'react';
import { FileChartColumn } from 'lucide-react';
import { Select, SelectOption } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';

type ReportType = 'asset-expenses';

// Available reports. Add new report types here as they are built.
const REPORT_TYPES: (SelectOption & { value: ReportType; description: string })[] = [
  {
    value: 'asset-expenses',
    label: 'Asset Expenses Report',
    description: 'Cost breakdowns for assets across purchase, upgrades, repairs and accessories.',
  },
];

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const selected = REPORT_TYPES.find((r) => r.value === reportType);

  return (
    <div className="motion-safe:animate-fade-rise">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">Reports</h1>
        <p className="text-2sm text-muted-foreground mt-1">Generate reports on office assets.</p>
      </div>

      {/* Report selection */}
      <div className="rounded-lg mb-4 p-4 bg-card border border-border shadow-card">
        <div className="micro-label mb-1.5">Report Type</div>
        <Select
          value={reportType}
          onValueChange={(v) => setReportType(v as ReportType | '')}
          ariaLabel="Report Type"
          placeholder="Select a report type"
          options={REPORT_TYPES.map(({ value, label }) => ({ value, label }))}
          className="w-full sm:w-80"
        />
      </div>

      {/* Report body */}
      <div className="rounded-lg bg-card border border-border shadow-card">
        {selected ? (
          <div className="flex items-start gap-3 p-5">
            <div className="rounded-control p-2.5 bg-info-surface text-info">
              <FileChartColumn className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-foreground">{selected.label}</div>
              <p className="text-2sm text-muted-foreground mt-0.5">{selected.description}</p>
            </div>
          </div>
        ) : (
          <EmptyState
            icon="reports"
            title="No report selected"
            subtitle="Select a report type to get started."
          />
        )}
      </div>
    </div>
  );
}
