'use client';

import { useEffect } from 'react';
import { ExternalLink, FileText, ImageIcon, Paperclip } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import type { AssetWarrantyDocumentItem } from '@/types';

interface Props {
  /** Usually the warranty's item name, so the list is attributable. */
  title?: string;
  documents: AssetWarrantyDocumentItem[];
  onClose: () => void;
}

const isPdf = (fileName: string) => fileName.toLowerCase().endsWith('.pdf');

/**
 * Lists every warranty document attached to one warranty record. Shown from the
 * Warranties tab when a record has more than one document — a single document
 * is opened directly, without this dialog.
 *
 * Each entry is a real anchor, so documents open in a genuine new tab (no popup
 * blocker, middle-click works). The dialog deliberately stays open after a
 * click so several documents can be opened in turn, and can always be
 * dismissed without opening anything.
 */
export function WarrantyDocumentsDialog({ title, documents, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <OverlayPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-[2px] motion-safe:animate-overlay-in"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Warranty documents"
          className="rounded-2xl flex flex-col w-[480px] max-w-[calc(100vw-2rem)] bg-card text-card-foreground shadow-pop motion-safe:animate-pop-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex gap-4">
            <div className="shrink-0 flex items-center justify-center rounded-full w-10 h-10 bg-secondary">
              <Paperclip className="w-5 h-5 text-secondary-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold mb-1 text-base tracking-[-0.01em] text-foreground">
                Warranty Documents
              </h2>
              <p className="text-2sm text-muted-foreground leading-relaxed break-words">
                {documents.length} file{documents.length === 1 ? '' : 's'}
                {title ? ` attached to ${title}` : ' attached to this warranty'}.
              </p>
            </div>
          </div>

          {/* Document list */}
          <div className="px-6 pb-5 space-y-2 max-h-[60vh] overflow-y-auto">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-control border border-border px-3 py-2.5 bg-muted/40 transition-colors hover:bg-muted hover:border-ring"
              >
                {isPdf(doc.fileName) ? (
                  <FileText className="w-4 h-4 text-danger shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                )}
                <span className="text-2sm text-foreground/80 truncate flex-1">
                  {doc.fileName?.trim() || 'Warranty document'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-b-2xl">
            <button
              onClick={onClose}
              className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
