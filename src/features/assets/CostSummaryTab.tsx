'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, ChevronDown, Download } from 'lucide-react';
import type { AssetCostSummary, CostBreakdownItem } from '@/types';
import { getAssetCostSummary } from '@/lib/api';
import { ApiError } from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ data }: { data: AssetCostSummary }) {
  const cards = [
    { label: 'Purchase Cost',  value: data.purchaseCost,     color: 'text-info-foreground',      bg: 'bg-info-surface' },
    { label: 'Upgrade Cost',   value: data.upgradeCost,      color: 'text-warning-foreground',   bg: 'bg-warning-surface' },
    { label: 'Repair Cost',    value: data.repairCost ?? 0,  color: 'text-secondary-foreground', bg: 'bg-secondary' },
    { label: 'Total Cost',     value: data.totalCost,        color: 'text-foreground',           bg: 'bg-muted' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 pb-0">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-xl p-4 ${c.bg} border border-border/60`}>
          <div className="micro-label mb-1">{c.label}</div>
          <div className={`text-xl font-bold tracking-tight ${c.color}`}>{fmt(c.value)}</div>
        </div>
      ))}
    </div>
  );
}

// ── Breakdown Table ───────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Purchase', 'Upgrade', 'Repair'] as const;

function BreakdownTable({ rows }: { rows: CostBreakdownItem[] }) {
  const [filter, setFilter] = useState<string>('All');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const displayed = filter === 'All' ? rows : rows.filter((r) => r.category === filter);

  // Always show all known categories so the empty-state is reachable even when a
  // category has no rows yet (e.g. no upgrades yet → "Upgrade" still appears and
  // clicking it shows "No cost entries for the selected category.").
  const availableCategories = [...CATEGORIES];

  return (
    <div className="p-6 pt-5">
      {/* Filter bar */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Cost Breakdown</h3>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1.5 rounded-control border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-muted"
          >
            {filter === 'All' ? 'All Categories' : filter}
            <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 mt-1 min-w-[140px] rounded-control border border-border bg-card shadow-card z-10">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setFilter(cat); setDropdownOpen(false); }}
                  className={`block w-full text-left px-3 py-2 text-xs transition-colors hover:bg-muted ${
                    filter === cat ? 'text-primary font-semibold' : 'text-foreground/70'
                  }`}
                >
                  {cat === 'All' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="py-10 text-center text-2sm text-muted-foreground">
          No cost entries for the selected category.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-control border border-border">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                {['Cost Category', 'Date', 'Description', 'Vendor', 'Cost', 'Reference / Invoice'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 micro-label whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-border/60 last:border-b-0 ${
                    i % 2 === 0 ? 'bg-card' : 'bg-muted/30'
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-medium text-2xs ${
                        row.category === 'Purchase'
                          ? 'bg-info-surface text-info-foreground'
                          : row.category === 'Repair'
                            ? 'bg-secondary text-secondary-foreground'
                            : 'bg-warning-surface text-warning-foreground'
                      }`}
                    >
                      {row.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-2sm text-muted-foreground nums whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="px-4 py-3 text-2sm text-foreground/80 max-w-[220px] whitespace-normal">
                    {row.description}
                  </td>
                  <td className="px-4 py-3 text-2sm text-muted-foreground whitespace-nowrap">
                    {row.vendor ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-2sm font-semibold text-foreground nums whitespace-nowrap">
                    {fmt(row.cost)}
                  </td>
                  <td className="px-4 py-3">
                    {row.reference ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={row.reference}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View"
                          className="flex items-center gap-1 text-2sm text-primary hover:underline"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>View</span>
                        </a>
                        <a
                          href={row.reference}
                          download
                          title="Download"
                          className="flex items-center text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-2sm text-muted-foreground/80">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface CostSummaryTabProps {
  assetId: string;
  /** Version counter — increment to force a re-fetch. */
  version?: number;
}

export function CostSummaryTab({ assetId, version = 0 }: CostSummaryTabProps) {
  const [data, setData] = useState<AssetCostSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Dedupe the fetch per (assetId, version) so React StrictMode's dev
  // double-invoke doesn't fire the request twice; also ignores stale responses.
  const requestedKey = useRef<string>('');

  useEffect(() => {
    const key = `${assetId}:${version}`;
    if (requestedKey.current === key) return;
    requestedKey.current = key;

    setLoading(true);
    setError(null);
    getAssetCostSummary(assetId)
      .then((d) => { if (requestedKey.current === key) setData(d); })
      .catch((err) => {
        if (requestedKey.current === key) setError(err instanceof ApiError ? err.message : 'Failed to load cost summary.');
      })
      .finally(() => { if (requestedKey.current === key) setLoading(false); });
  }, [assetId, version]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-2sm text-muted-foreground">
        Loading cost summary…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-2sm text-danger">{error ?? 'Cost data unavailable.'}</p>
      </div>
    );
  }

  return (
    <div>
      <SummaryCards data={data} />
      <BreakdownTable rows={data.breakdown} />
    </div>
  );
}
