'use client';

import { useState } from 'react';
import { Select, SelectOption } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullCostReport } from './FullCostReport';

type ReportType = 'asset-expenses';
type AssetExpensesSubReport = 'full-cost' | 'total-expense';

// Available reports. Add new report types here as they are built.
const REPORT_TYPES: (SelectOption & { value: ReportType })[] = [
  { value: 'asset-expenses', label: 'Asset Expenses Report' },
];

const ASSET_EXPENSES_SUB_REPORTS: (SelectOption & { value: AssetExpensesSubReport; description: string })[] = [
  {
    value: 'full-cost',
    label: 'Full Cost Details',
    description: 'Every expense item recorded for one asset, with the total cost incurred.',
  },
  {
    value: 'total-expense',
    label: 'Total Expense Report',
    description: 'Total expenses per asset across one or many assets, with a grand total.',
  },
];

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType | ''>('');
  const [subReport, setSubReport] = useState<AssetExpensesSubReport | ''>('');
  const selectedSub = ASSET_EXPENSES_SUB_REPORTS.find((r) => r.value === subReport);

  const changeReportType = (v: string) => {
    setReportType(v as ReportType | '');
    setSubReport('');
  };

  return (
    <div className="motion-safe:animate-fade-rise">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">Reports</h1>
        <p className="text-2sm text-muted-foreground mt-1">Generate reports on office assets.</p>
      </div>

      {/* Report selection */}
      <div className="rounded-lg mb-4 p-4 bg-card border border-border shadow-card">
        <div className="flex flex-wrap gap-4">
          <div className="w-full sm:w-80">
            <div className="micro-label mb-1.5">Report Type</div>
            <Select
              value={reportType}
              onValueChange={changeReportType}
              ariaLabel="Report Type"
              placeholder="Select a report type"
              options={REPORT_TYPES}
              className="w-full"
            />
          </div>
          {reportType === 'asset-expenses' && (
            <div className="w-full sm:w-80">
              <div className="micro-label mb-1.5">Sub-report</div>
              <Select
                value={subReport}
                onValueChange={(v) => setSubReport(v as AssetExpensesSubReport | '')}
                ariaLabel="Sub-report"
                placeholder="Select a sub-report"
                options={ASSET_EXPENSES_SUB_REPORTS.map(({ value, label }) => ({ value, label }))}
                className="w-full"
              />
            </div>
          )}
        </div>
        {selectedSub && <p className="text-2sm text-muted-foreground mt-3">{selectedSub.description}</p>}
      </div>

      {/* Report body — keyed so switching sub-report starts with fresh filters. */}
      {subReport === 'full-cost' ? (
        <FullCostReport key="full-cost" />
      ) : subReport === 'total-expense' ? (
        <div className="rounded-lg bg-card border border-border shadow-card">
          <EmptyState
            icon="reports"
            title="Total Expense Report"
            subtitle="This report is coming soon."
          />
        </div>
      ) : (
        <div className="rounded-lg bg-card border border-border shadow-card">
          <EmptyState
            icon="reports"
            title={reportType ? 'No sub-report selected' : 'No report selected'}
            subtitle={
              reportType
                ? 'Select Full Cost Details or Total Expense Report to continue.'
                : 'Select a report type to get started.'
            }
          />
        </div>
      )}
    </div>
  );
}
