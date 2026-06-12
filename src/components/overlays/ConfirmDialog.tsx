'use client';

import { AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, description, confirmLabel = 'Yes', onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim backdrop-blur-[2px] motion-safe:animate-overlay-in">
      <div className="rounded-2xl flex flex-col w-[420px] bg-card text-card-foreground shadow-pop motion-safe:animate-pop-in">
        {/* Body */}
        <div className="px-6 pt-6 pb-5 flex gap-4">
          <div className="shrink-0 flex items-center justify-center rounded-full w-10 h-10 bg-danger-surface">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <h2 className="font-bold mb-1 text-base tracking-[-0.01em] text-foreground">{title}</h2>
            <p className="text-2sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-b-2xl">
          <button onClick={onCancel}
            className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="rounded-control px-5 py-2.5 text-sm font-semibold bg-danger text-white transition-all hover:opacity-90 active:scale-[0.98]">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
