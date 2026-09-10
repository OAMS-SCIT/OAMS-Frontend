'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ChevronLeft, ChevronRight, Download, ExternalLink, FileText, ImageIcon,
} from 'lucide-react';
import type { AssetWarrantyDocumentItem } from '@/types';
import { fetchWarrantyDocument, ApiError } from '@/lib/api';

interface Props {
  /** Owning asset — documents are fetched scoped to it. */
  assetId: string;
  documents: AssetWarrantyDocumentItem[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** Caption shown top-left, e.g. the warranty's item name. */
  title?: string;
}

const isPdf = (fileName: string) => fileName.toLowerCase().endsWith('.pdf');

/**
 * Documents synthesised for pre-OAMS-281 repairs have no database row — only a
 * bare URL — so they cannot be fetched through the API and are linked directly.
 */
const isLegacy = (doc: AssetWarrantyDocumentItem) => doc.id.startsWith('legacy:');

/**
 * Full-screen document viewer: renders a warranty document inside the app
 * rather than sending the admin off to a new browser tab (OAMS-283). Images
 * render as an img, PDFs in an iframe using the browser's own PDF viewer, which
 * brings zoom, search, print and page navigation with no extra dependency.
 *
 * Documents are fetched with the bearer token and rendered from an object URL,
 * because an img/iframe src cannot carry an Authorization header. Object URLs
 * are cached per document so paging back and forth doesn't refetch, and all of
 * them are revoked when the viewer closes.
 *
 * Forked from ImageLightbox.tsx — same portal, Escape/arrow keys, backdrop
 * close, counter and body-scroll lock.
 */
export function DocumentViewerDialog({
  assetId, documents, index, onIndexChange, onClose, title,
}: Props) {
  const count = documents.length;
  const safeIndex = Math.min(Math.max(index, 0), Math.max(0, count - 1));
  const current: AssetWarrantyDocumentItem | undefined = documents[safeIndex];

  /**
   * docId to object URL, so paging back to a document is instant. Held in state
   * rather than a ref because it is read while rendering.
   */
  const [urls, setUrls] = useState<Record<string, string>>({});
  /** Errors are keyed by document, so paging away clears them implicitly. */
  const [failure, setFailure] = useState<{ docId: string; message: string } | null>(null);

  const goPrev = () => onIndexChange((safeIndex - 1 + count) % count);
  const goNext = () => onIndexChange((safeIndex + 1) % count);

  // A legacy document is just its stored URL; anything else comes from the
  // cache once fetched. Deriving this keeps the effect below free of any
  // synchronous setState.
  const objectUrl = current
    ? isLegacy(current)
      ? current.url
      : urls[current.id] ?? null
    : null;
  const error = failure && current && failure.docId === current.id ? failure.message : null;
  const loading = !objectUrl && !error;

  useEffect(() => {
    // Nothing to do for a legacy doc, a cached one, or one that already failed.
    if (!current || objectUrl || error) return;

    let cancelled = false;
    void (async () => {
      try {
        const blob = await fetchWarrantyDocument(assetId, current.id);
        if (cancelled) return;
        setUrls((prev) => ({ ...prev, [current.id]: URL.createObjectURL(blob) }));
      } catch (err) {
        if (cancelled) return;
        setFailure({
          docId: current.id,
          message:
            err instanceof ApiError ? err.message : 'Could not load this document.',
        });
      }
    })();

    // Guards against a fast page-through applying a stale response.
    return () => { cancelled = true; };
  }, [current, objectUrl, error, assetId]);

  // Mirror the cache into a ref so the unmount cleanup below can revoke the
  // latest set without re-running (writing a ref in an effect is fine; only
  // reading one during render is not).
  const urlsRef = useRef(urls);
  useEffect(() => { urlsRef.current = urls; }, [urls]);

  // Revoke every object URL this viewer created when it closes.
  useEffect(() => {
    return () => {
      for (const url of Object.values(urlsRef.current)) URL.revokeObjectURL(url);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && count > 1) goPrev();
      else if (e.key === 'ArrowRight' && count > 1) goNext();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, count]);

  // Lock body scroll while the viewer is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (typeof document === 'undefined' || count === 0 || !current) return null;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 10000, background: 'rgba(0,0,0,0.85)', animation: 'oamsViewerFade 0.2s ease-out' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Warranty document viewer"
    >
      <style>{`
        @keyframes oamsViewerFade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      {/* Top bar: title + counter, secondary actions, close */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 shrink-0" onClick={stop}>
        <span className="text-sm font-semibold text-white/85 truncate">
          {title ?? 'Warranty document'}
          <span className="font-normal text-white/55 ml-2.5">
            {current.fileName}
            {count > 1 && ` · ${safeIndex + 1} / ${count}`}
          </span>
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {objectUrl && !error && (
            <>
              <a
                href={objectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-control px-3 py-2 text-xs font-medium text-white/85 bg-white/[0.12] transition-colors hover:bg-white/20"
                title="Open in a new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open
              </a>
              <a
                href={objectUrl}
                download={current.fileName}
                className="flex items-center gap-1.5 rounded-control px-3 py-2 text-xs font-medium text-white/85 bg-white/[0.12] transition-colors hover:bg-white/20"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </>
          )}
          <button
            onClick={onClose}
            className="rounded-full flex items-center justify-center w-9 h-9 bg-white/[0.12] transition-colors hover:bg-white/20"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative">
        {count > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 z-10 rounded-full flex items-center justify-center w-11 h-11 bg-white/[0.12] transition-colors hover:bg-white/20"
            title="Previous"
            aria-label="Previous document"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}

        {loading && <p className="text-2sm text-white/70">Loading document…</p>}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 text-center px-6" onClick={stop}>
            <p className="text-2sm text-white/85 max-w-md leading-relaxed">{error}</p>
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-control px-3 py-2 text-xs font-medium text-white/85 bg-white/[0.12] transition-colors hover:bg-white/20"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Try opening the original
            </a>
          </div>
        )}

        {!loading && !error && objectUrl && (
          isPdf(current.fileName) ? (
            <iframe
              src={objectUrl}
              title={current.fileName}
              onClick={stop}
              className="bg-white rounded-lg"
              style={{ width: '90vw', height: '78vh', border: 'none' }}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={objectUrl}
              alt={current.fileName}
              onClick={stop}
              style={{ maxWidth: '90vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 8 }}
            />
          )
        )}

        {count > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 z-10 rounded-full flex items-center justify-center w-11 h-11 bg-white/[0.12] transition-colors hover:bg-white/20"
            title="Next"
            aria-label="Next document"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* File rail — filenames rather than thumbnails, since a PDF has none. */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-4 shrink-0 flex-wrap" onClick={stop}>
          {documents.map((doc, i) => (
            <button
              key={doc.id}
              onClick={() => onIndexChange(i)}
              className={`flex items-center gap-2 rounded-control border px-3 py-2 max-w-[220px] transition-all ${
                i === safeIndex
                  ? 'border-white bg-white/[0.16] opacity-100'
                  : 'border-white/25 bg-white/[0.06] opacity-70 hover:opacity-100'
              }`}
              title={doc.fileName}
            >
              {isPdf(doc.fileName)
                ? <FileText className="w-3.5 h-3.5 text-white/80 shrink-0" />
                : <ImageIcon className="w-3.5 h-3.5 text-white/80 shrink-0" />}
              <span className="text-xs text-white/85 truncate">{doc.fileName}</span>
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
