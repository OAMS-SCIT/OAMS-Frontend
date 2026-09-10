'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { AssetWarranties, WarrantyItem } from '@/types';
import { getAssetWarranties, ApiError } from '@/lib/api';
import { WarrantyDocumentsDialog } from '@/components/overlays/WarrantyDocumentsDialog';

/** Shared styling for the inline row action, matching the Upgrade Log table. */
const actionClass =
  'flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-primary transition-colors hover:bg-secondary';

interface WarrantiesTabProps {
  assetId: string;
  /** Version counter — increment to force a re-fetch. */
  version?: number;
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 font-medium text-2xs ${
        active
          ? 'bg-success-surface text-success-foreground'
          : 'bg-danger-surface text-danger-foreground'
      }`}
    >
      {active ? 'Active' : 'Expired'}
    </span>
  );
}

export function WarrantiesTab({ assetId, version = 0 }: WarrantiesTabProps) {
  const [data, setData] = useState<AssetWarranties | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** The row whose documents are listed in the dialog (>1 document only). */
  const [docsRow, setDocsRow] = useState<WarrantyItem | null>(null);
  // Dedupe the fetch per (assetId, version) so React StrictMode's dev
  // double-invoke doesn't fire the request twice; also ignores stale responses.
  const requestedKey = useRef<string>('');

  useEffect(() => {
    const key = `${assetId}:${version}`;
    if (requestedKey.current === key) return;
    requestedKey.current = key;

    setLoading(true);
    setError(null);
    getAssetWarranties(assetId)
      .then((d) => { if (requestedKey.current === key) setData(d); })
      .catch((err) => {
        if (requestedKey.current === key) setError(err instanceof ApiError ? err.message : 'Failed to load warranties.');
      })
      .finally(() => { if (requestedKey.current === key) setLoading(false); });
  }, [assetId, version]);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-2sm text-muted-foreground">Loading warranties…</div>;
  }
  if (error || !data) {
    return <div className="flex items-center justify-center py-12"><p className="text-2sm text-danger">{error ?? 'Warranty data unavailable.'}</p></div>;
  }

  const rows: WarrantyItem[] = data.warranties;

  return (
    <div className="p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Warranties</h3>
      {rows.length === 0 ? (
        <div className="py-10 text-center text-2sm text-muted-foreground">
          No warranties recorded for this asset.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-control border border-border">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                {['Source', 'Item', 'Type', 'Vendor', 'Start', 'Expiry', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 micro-label whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className={`border-b border-border/60 last:border-b-0 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 font-medium text-2xs ${row.source === 'Purchase' ? 'bg-info-surface text-info-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                      {row.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-2sm text-foreground/80 max-w-[220px] whitespace-normal">{row.itemName}</td>
                  <td className="px-4 py-3 text-2sm text-muted-foreground whitespace-nowrap">{row.itemType ?? '—'}</td>
                  <td className="px-4 py-3 text-2sm text-muted-foreground whitespace-nowrap">{row.vendor ?? '—'}</td>
                  <td className="px-4 py-3 text-2sm text-muted-foreground nums whitespace-nowrap">{row.startDate ?? '—'}</td>
                  <td className="px-4 py-3 text-2sm text-muted-foreground nums whitespace-nowrap">{row.expiryDate ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge active={row.active} /></td>
                  <td className="px-4 py-3">
                    {row.documents.length === 0 ? (
                      <span className="text-2sm text-muted-foreground">—</span>
                    ) : row.documents.length === 1 ? (
                      // A single document opens straight away — no dialog. A real
                      // anchor so the browser opens a genuine new tab.
                      <a
                        href={row.documents[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={actionClass}
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </a>
                    ) : (
                      <button onClick={() => setDocsRow(row)} className={actionClass}>
                        <ExternalLink className="w-3 h-3" /> View ({row.documents.length})
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {docsRow && (
        <WarrantyDocumentsDialog
          title={docsRow.itemName}
          documents={docsRow.documents}
          onClose={() => setDocsRow(null)}
        />
      )}
    </div>
  );
}
