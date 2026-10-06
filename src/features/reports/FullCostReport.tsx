'use client';

import { useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { AssetPicker, PickableAsset } from '@/components/ui/AssetPicker';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError, getFullCostReport } from '@/lib/api';
import type { CostCategory, FullCostReport as FullCostReportData } from '@/types';

const COST_CATEGORIES: CostCategory[] = ['Purchase', 'Upgrade', 'Repair', 'Accessories'];

const CATEGORY_BADGE: Record<CostCategory, string> = {
  Purchase: 'bg-info-surface text-info-foreground',
  Upgrade: 'bg-warning-surface text-warning-foreground',
  Repair: 'bg-secondary text-secondary-foreground',
  Accessories: 'bg-purple-surface text-purple-foreground',
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

/** The filters a preview was generated with — the export (OAMS-299) reuses these. */
interface AppliedFilters {
  assetId: string;
  costCategory: CostCategory | '';
  dateFrom: string;
  dateTo: string;
}

/** Asset Expenses → Full Cost Details: every expense line for one asset (OAMS-290). */
export function FullCostReport() {
  const [asset, setAsset] = useState<PickableAsset[]>([]);
  const [costCategory, setCostCategory] = useState<CostCategory | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FullCostReportData | null>(null);
  const [applied, setApplied] = useState<AppliedFilters | null>(null);

  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const hasFilters = asset.length > 0 || costCategory !== '' || dateFrom !== '' || dateTo !== '';
  const current: AppliedFilters | null = asset.length
    ? { assetId: asset[0].id, costCategory, dateFrom, dateTo }
    : null;
  const filtersChanged =
    report !== null &&
    applied !== null &&
    current !== null &&
    !dateRangeInvalid &&
    JSON.stringify(current) !== JSON.stringify(applied);

  const clearFilters = () => {
    setAsset([]);
    setCostCategory('');
    setDateFrom('');
    setDateTo('');
  };

  const generate = async () => {
    if (!current || dateRangeInvalid) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getFullCostReport({
        assetId: current.assetId,
        costCategories: current.costCategory ? [current.costCategory] : undefined,
        dateFrom: current.dateFrom || undefined,
        dateTo: current.dateTo || undefined,
      });
      setReport(data);
      setApplied(current);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate the report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Filters */}
      <div className="rounded-lg mb-4 p-4 bg-card border border-border shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="micro-label mb-1.5">Asset</div>
            <AssetPicker
              mode="single"
              selected={asset}
              onChange={setAsset}
              placeholder="Search by asset ID, name or serial number…"
            />
          </div>
          <div>
            <div className="micro-label mb-1.5">Cost Category</div>
            <Select
              value={costCategory}
              onValueChange={(v) => setCostCategory(v as CostCategory | '')}
              ariaLabel="Cost Category"
              placeholder="All Categories"
              options={[
                { value: '', label: 'All Categories' },
                ...COST_CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
              className="w-full"
            />
          </div>
          <div>
            <div className="micro-label mb-1.5">Date Range (optional)</div>
            <div className="flex items-center gap-2">
              <DatePicker value={dateFrom} onChange={setDateFrom} ariaLabel="Date from" placeholder="From" />
              <span className="text-2sm text-muted-foreground/70">–</span>
              <DatePicker value={dateTo} onChange={setDateTo} ariaLabel="Date to" placeholder="To" />
            </div>
            {dateRangeInvalid && (
              <p className="text-2xs text-danger mt-1.5">“From” date must be on or before the “To” date.</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-border/60">
          {filtersChanged && (
            <span className="mr-auto text-2xs text-muted-foreground">
              Filters changed — click Generate to update the preview.
            </span>
          )}
          <ClearFiltersButton onClear={clearFilters} disabled={!hasFilters || loading} />
          <button
            type="button"
            onClick={generate}
            disabled={!current || dateRangeInvalid || loading}
            className="flex items-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Generate
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg bg-card border border-border shadow-card">
        {error ? (
          <div className="m-4 rounded-control px-4 py-3 text-2sm bg-danger-surface text-danger">{error}</div>
        ) : !report ? (
          <EmptyState
            icon="reports"
            title="No report generated yet"
            subtitle="Select an asset, choose any filters, and click Generate to preview its expenses."
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="px-5 pt-4 pb-3">
              <div className="font-semibold text-foreground">Full Cost Details</div>
              <div className="text-2sm text-muted-foreground mt-0.5">
                <span className="font-mono">{report.asset.displayId ?? '—'}</span> · {report.asset.name}
                {report.asset.serialNumber && <> · S/N {report.asset.serialNumber}</>}
                {report.asset.categoryName && <> · {report.asset.categoryName}</>}
              </div>
            </div>

            {report.items.length === 0 ? (
              <EmptyState
                icon="reports"
                title="No data found"
                subtitle="No expense records match the selected filters."
              />
            ) : (
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border">
                      {['Cost Category', 'Date', 'Description', 'Vendor', 'Cost'].map((h) => (
                        <th
                          key={h}
                          className={`px-4 py-2.5 micro-label whitespace-nowrap ${h === 'Cost' ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.items.map((row, i) => (
                      <tr
                        key={`${row.category}-${row.date}-${i}`}
                        className={`border-b border-border/60 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
                      >
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 font-medium text-2xs ${CATEGORY_BADGE[row.category]}`}>
                            {row.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-2sm text-muted-foreground nums whitespace-nowrap">{row.date}</td>
                        <td className="px-4 py-3 text-2sm text-foreground/80 whitespace-normal">{row.description}</td>
                        <td className="px-4 py-3 text-2sm text-muted-foreground whitespace-nowrap">{row.vendor ?? '—'}</td>
                        <td className="px-4 py-3 text-2sm font-semibold text-foreground nums whitespace-nowrap text-right">
                          {fmt(row.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/60">
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-foreground">
                        Total Cost Incurred
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-foreground nums whitespace-nowrap text-right">
                        {fmt(report.totalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
