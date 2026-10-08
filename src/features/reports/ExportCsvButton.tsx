'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { saveBlob } from '@/lib/download';

interface ExportCsvButtonProps {
  /** Fetches the CSV for the currently previewed report. */
  fetchCsv: () => Promise<Blob>;
  fileName: string;
}

/**
 * "Export CSV" for a generated report preview (OAMS-292). Shows a spinner while
 * the file is prepared, then a toast once it has downloaded.
 */
export function ExportCsvButton({ fetchCsv, fileName }: ExportCsvButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      saveBlob(await fetchCsv(), fileName);
      toast.success('Report downloaded', { description: fileName });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to export the report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      className="flex shrink-0 items-center gap-1.5 rounded-control border border-border px-3 py-2 text-2sm font-medium text-foreground/80 transition-colors hover:bg-muted disabled:opacity-60 disabled:pointer-events-none"
    >
      {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {exporting ? 'Exporting…' : 'Export CSV'}
    </button>
  );
}
