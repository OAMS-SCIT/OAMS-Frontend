'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Play } from 'lucide-react';
import { AssetPicker, PickableAsset } from '@/components/ui/AssetPicker';
import { Select, SelectOption } from '@/components/ui/Select';
import { MultiSearchableSelect } from '@/components/ui/MultiSearchableSelect';
import { DatePicker } from '@/components/ui/DatePicker';
import { ClearFiltersButton } from '@/components/ui/ClearFiltersButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiError, getCategories, getTotalExpenseReport } from '@/lib/api';
import type { AssetStatus, CostCategory, TotalExpenseReport as TotalExpenseReportData } from '@/types';
import { CATEGORY_BADGE } from './cost-badges';

const STATUSES: AssetStatus[] = ['Available', 'Assigned', 'Under Repair', 'Reserved', 'Lost/Stolen', 'Retired'];
const COST_CATEGORIES: CostCategory[] = ['Purchase', 'Upgrade', 'Repair', 'Accessories'];

const COLUMNS = ['Asset ID', 'Asset Name', 'Category', 'Cost Type', 'Date', 'Description', 'Cost'];

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

/** The filters a preview was generated with — the export (OAMS-299) reuses these. */
interface AppliedFilters {
  categoryIds: string[];
  status: AssetStatus | '';
  assetIds: string[];
  costCategory: CostCategory | '';
  dateFrom: string;
  dateTo: string;
}

/**
 * Asset Expenses → Total Expense Report (OAMS-291): an itemised price audit with
 * one row per expense transaction, ordered by asset then date (OAMS-301).
 */
export function TotalExpenseReport() {
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [status, setStatus] = useState<AssetStatus | ''>('');
  const [assets, setAssets] = useState<PickableAsset[]>([]);
  const [costCategory, setCostCategory] = useState<CostCategory | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TotalExpenseReportData | null>(null);
  const [applied, setApplied] = useState<AppliedFilters | null>(null);
  // Bumped whenever an in-flight response should be ignored (filters cleared).
  const requestId = useRef(0);

  // All categories (active and inactive) — assets in an inactive category still have costs.
  useEffect(() => {
    let cancelled = false;
    getCategories({ limit: 500 })
      .then((res) => {
        if (cancelled) return;
        const options = res.data.map((c) => ({ value: c.id, label: c.name }));
        setCategoryOptions(options.sort((a, b) => a.label.localeCompare(b.label)));
      })
      .catch((err) => {
        if (!cancelled) setCategoriesError(err instanceof ApiError ? err.message : 'Failed to load categories.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dateRangeInvalid = Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const current: AppliedFilters = {
    categoryIds,
    status,
    assetIds: assets.map((a) => a.id),
    costCategory,
    dateFrom,
    dateTo,
  };
  const hasFilters =
    categoryIds.length > 0 || status !== '' || assets.length > 0 || costCategory !== '' || dateFrom !== '' || dateTo !== '';
  const filtersChanged =
    report !== null && applied !== null && !dateRangeInvalid && JSON.stringify(current) !== JSON.stringify(applied);

  const assetCount = new Set(report?.rows.map((r) => r.assetId)).size;

  const clearFilters = () => {
    setCategoryIds([]);
    setStatus('');
    setAssets([]);
    setCostCategory('');
    setDateFrom('');
    setDateTo('');
    requestId.current += 1;
    setLoading(false);
    setReport(null);
    setApplied(null);
    setError(null);
  };

  const generate = async () => {
    if (dateRangeInvalid) return;
    const filters = current;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getTotalExpenseReport({
        categoryIds: filters.categoryIds,
        statuses: filters.status ? [filters.status] : undefined,
        assetIds: filters.assetIds,
        costCategories: filters.costCategory ? [filters.costCategory] : undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      if (id !== requestId.current) return;
      setReport(data);
      setApplied(filters);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof ApiError ? err.message : 'Failed to generate the report.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  return (
    <>
      {/* Filters */}
      <div className="rounded-lg mb-4 p-4 bg-card border border-border shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="micro-label mb-1.5">Asset Category</div>
            <MultiSearchableSelect
              values={categoryIds}
              onValuesChange={setCategoryIds}
              options={categoryOptions}
              ariaLabel="Asset Category"
              placeholder="All Assets"
              searchPlaceholder="Search categories…"
              emptyMessage={categoriesError ?? 'No matching categories'}
              className="w-full"
            />
          </div>
          <div>
            <div className="micro-label mb-1.5">Asset Status</div>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as AssetStatus | '')}
              ariaLabel="Asset Status"
              placeholder="All"
              options={[{ value: '', label: 'All' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
              className="w-full"
            />
          </div>
          <div className="md:col-span-2">
            <div className="micro-label mb-1.5">Specific Assets (optional)</div>
            <AssetPicker
              mode="multiple"
              selected={assets}
              onChange={setAssets}
              placeholder="Search by asset ID, name or serial number to add…"
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
            <div className="micro-label mb-1.5">Date Range</div>
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
              Filters changed - click Generate to update the preview.
            </span>
          )}
          <ClearFiltersButton onClear={clearFilters} disabled={(!hasFilters && !report) || loading} />
          <button
            type="button"
            onClick={generate}
            disabled={dateRangeInvalid || loading}
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
            subtitle="Choose any filters (or none for all assets) and click Generate to preview total expenses."
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="px-5 pt-4 pb-3">
              <div className="font-semibold text-foreground">Total Expense Report</div>
              <div className="text-2sm text-muted-foreground mt-0.5">
                {report.rows.length} {report.rows.length === 1 ? 'transaction' : 'transactions'} · {assetCount}{' '}
                {assetCount === 1 ? 'asset' : 'assets'}
              </div>
            </div>

            {report.rows.length === 0 ? (
              <EmptyState
                icon="reports"
                title="No data found"
                subtitle="No expense records match the selected filters."
              />
            ) : (
              <div className="overflow-x-auto border-t border-border">
                <table className="w-full min-w-[960px]">
                  <thead>
                    <tr className="bg-muted/60 border-b border-border">
                      {COLUMNS.map((h) => (
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
                    {report.rows.map((row, i) => {
                      const isAccessory = row.parentAssetId !== null;
                      return (
                        <tr
                          key={`${row.assetId}-${i}`}
                          className={`border-b border-border/60 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
                        >
                          <td className="px-4 py-3 text-2sm font-mono whitespace-nowrap align-top">
                            <Link href={`/admin/inventory/${row.assetId}`} className="text-primary hover:underline">
                              {row.displayId ?? '—'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-2sm text-foreground/90 align-top">
                            <div>{row.name}</div>
                            {isAccessory && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-2xs text-muted-foreground">
                                <span>
                                  Accessory of{' '}
                                  <Link href={`/admin/inventory/${row.parentAssetId}`} className="font-mono hover:underline">
                                    {row.parentDisplayId ?? 'parent'}
                                  </Link>
                                </span>
                                {row.costIncludedInParent && (
                                  <span className="rounded-full px-2 py-px font-medium bg-info-surface text-info-foreground">
                                    Included in parent price
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-2sm text-muted-foreground whitespace-nowrap align-top">
                            {row.categoryName ?? '—'}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className={`rounded-full px-2.5 py-0.5 font-medium text-2xs ${CATEGORY_BADGE[row.costType]}`}>
                              {row.costType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-2sm text-muted-foreground nums whitespace-nowrap align-top">
                            {row.date}
                          </td>
                          <td className="px-4 py-3 text-2sm text-foreground/80 whitespace-normal align-top">
                            {row.description}
                          </td>
                          <td
                            className={`px-4 py-3 text-2sm font-semibold nums whitespace-nowrap text-right align-top ${
                              row.cost === 0 ? 'text-muted-foreground/60' : 'text-foreground'
                            }`}
                          >
                            {fmt(row.cost)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/60">
                      <td colSpan={COLUMNS.length - 1} className="px-4 py-3 text-sm font-semibold text-foreground">
                        Grand Total
                      </td>
                      <td className="px-4 py-3 text-sm font-bold nums whitespace-nowrap text-right text-foreground">
                        {fmt(report.grandTotal)}
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
