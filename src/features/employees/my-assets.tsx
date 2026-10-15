'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, ImageIcon, RefreshCw } from 'lucide-react';
import { ApiError, getMyAssets } from '@/lib/api';
import type { MyAssetListItem } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';

const PER_PAGE = 10;

/**
 * The employee's My Assets list: every asset currently assigned to the
 * signed-in user, most recent assigned date first. Backed by GET /api/me/assets,
 * which scopes to the JWT user, so this screen can only ever show the caller's
 * own assets.
 */
export function MyAssets() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MyAssetListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Version counter + deferred setState, matching the loaders in asset-detail:
  // setting state synchronously inside an effect body cascades renders.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoading(true);
          setError(null);
        }
        return getMyAssets({ page, limit: PER_PAGE });
      })
      .then((result) => {
        if (cancelled) return;
        setRows(result.data);
        setTotal(result.total);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load your assets.');
        setRows([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, version]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="motion-safe:animate-fade-rise">
      <div className="mb-6">
        <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">My Assets</h1>
        <p className="mt-1 text-2sm text-muted-foreground">Every asset currently assigned to you.</p>
      </div>

      <div className="rounded-lg overflow-hidden bg-card border border-border shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-2sm text-muted-foreground">
            Loading your assets…
          </div>
        ) : error ? (
          <EmptyState
            icon="myassets"
            title="Couldn't load your assets"
            subtitle={error}
            action={
              <button
                onClick={reload}
                className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="myassets"
            title="No assets currently assigned"
            subtitle="No assets are currently assigned to you. Contact your administrator if this is incorrect."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="bg-muted/60 border-b-2 border-border">
                    {[
                      'Image',
                      'Asset ID',
                      'Asset Name',
                      'Brand / Model',
                      'Category',
                      'Serial Number',
                      'Status',
                      'Warranty Expiry',
                      'Assigned Date',
                      'Actions',
                    ].map((label) => (
                      <th key={label} className="text-left px-4 py-3 micro-label">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.assignmentId}
                      className={`border-b border-border/60 transition-colors hover:bg-primary/[0.04] ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}
                    >
                      <td className="px-4 py-3">
                        <AssetThumb url={row.asset.imageUrl} name={row.asset.name} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground/80 font-mono whitespace-nowrap">
                        {row.asset.displayId}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-2sm text-foreground">{row.asset.name}</div>
                        <PendingConfirmationPill row={row} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-2sm text-foreground/80">{row.asset.brand ?? '—'}</div>
                        <div className="text-2xs text-muted-foreground/80">{row.asset.model}</div>
                      </td>
                      <td className="px-4 py-3.5 text-2sm text-muted-foreground">
                        {row.asset.category?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                        {row.asset.serialNumber ?? '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={row.asset.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs nums text-muted-foreground whitespace-nowrap">
                        {row.asset.warrantyExpiryDate ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs nums text-muted-foreground whitespace-nowrap">
                        {row.assignmentDate}
                      </td>
                      <td className="px-4 py-3.5">
                        {/* Opens the employee asset detail view, which OAMS-250 delivers. */}
                        <button
                          disabled
                          title="Asset details are coming soon"
                          className="flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium whitespace-nowrap border border-primary/30 text-primary transition-colors hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-border/60">
              <span className="text-2sm text-muted-foreground nums">
                Showing {Math.min((page - 1) * PER_PAGE + 1, total)}–{Math.min(page * PER_PAGE, total)} of {total} assets
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-2sm text-muted-foreground nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-control px-3 py-1.5 border border-border text-2sm text-foreground/70 transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AssetThumb({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-control bg-muted" title="No image">
        <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="w-10 h-10 rounded-control object-cover border border-border" />
  );
}

/** Flags a handover the employee still has to confirm (OAMS-251 / OAMS-252). */
function PendingConfirmationPill({ row }: { row: MyAssetListItem }) {
  if (row.confirmationStatus !== 'Pending') return null;
  return (
    <span className="inline-flex items-center mt-1 rounded-md px-2 py-[2px] text-2xs font-medium bg-warning-surface text-warning-foreground">
      {row.assignmentType === 'Handback' ? 'Handback Confirmation Pending' : 'Receipt Confirmation Pending'}
    </span>
  );
}
