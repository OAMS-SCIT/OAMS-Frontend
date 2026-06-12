'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { AssetCondition } from '@/types';

interface Props {
  /** RETURN INFORMATION summary. */
  assetName: string;
  assignedTo: string;
  since: string;
  onClose: () => void;
  /**
   * Called when the admin confirms the return. The caller performs the actual
   * persistence (real API on the asset-detail page, mock update on the
   * Assignment page) so this panel stays presentational and reusable.
   */
  onConfirm: (
    returnDate: string,
    condition: AssetCondition,
    notes?: string,
  ) => void | Promise<void>;
  /** Disables the footer button while the caller's confirm is in flight. */
  saving?: boolean;
}

const CONDITIONS: AssetCondition[] = ['New', 'Good', 'Fair', 'Poor'];

const today = () => new Date().toISOString().split('T')[0];

export function ReturnAssetDrawer({
  assetName,
  assignedTo,
  since,
  onClose,
  onConfirm,
  saving = false,
}: Props) {
  const [returnDate, setReturnDate] = useState(today());
  const [condition, setCondition] = useState<AssetCondition>('Good');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleConfirm = () => {
    const e: Record<string, string> = {};
    if (!returnDate) e.date = 'Return date is required';
    if (since && returnDate < since) {
      e.date = 'Return date cannot be before the assignment date';
    }
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    void onConfirm(returnDate, condition, notes.trim() || undefined);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-scrim backdrop-blur-[2px] motion-safe:animate-overlay-in" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[520px] bg-card text-card-foreground shadow-drawer rounded-l-[16px] motion-safe:animate-drawer-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">Process Asset Return</h2>
          <button onClick={onClose} className="rounded-control p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Return information summary */}
          <div className="rounded-lg p-4 bg-warning-surface border border-warning/30">
            <div className="text-2xs uppercase tracking-[0.04em] text-warning-foreground mb-1.5">Return Information</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-2xs text-warning-foreground/80">Asset</div>
                <div className="font-medium text-2sm text-foreground">{assetName}</div>
              </div>
              <div>
                <div className="text-2xs text-warning-foreground/80">Assigned To</div>
                <div className="font-medium text-2sm text-foreground">{assignedTo || '—'}</div>
              </div>
              <div>
                <div className="text-2xs text-warning-foreground/80">Since</div>
                <div className="font-medium text-2sm text-foreground">{since || '—'}</div>
              </div>
            </div>
          </div>

          {/* Return date */}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-foreground/80">
              Return Date <span className="text-danger">*</span>
            </label>
            <input type="date" value={returnDate}
              onChange={(e) => { setReturnDate(e.target.value); setErrors((p) => ({ ...p, date: '' })); }}
              className={`w-full rounded-control border bg-input-background text-2sm text-foreground px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 ${
                errors.date ? 'border-danger' : 'border-input focus:border-ring'
              }`} />
            {errors.date && <p className="text-xs text-danger mt-1">{errors.date}</p>}
          </div>

          {/* Condition at return */}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-foreground/80">
              Condition at Return <span className="text-danger">*</span>
            </label>
            <div className="flex gap-2">
              {CONDITIONS.map((c) => (
                <button key={c} onClick={() => setCondition(c)}
                  className={`flex-1 rounded-control py-2 border text-2sm font-medium transition-all ${
                    condition === c
                      ? 'border-warning bg-warning-surface text-warning-foreground'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Return notes */}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-foreground/80">
              Return Notes <span className="text-muted-foreground/70">(Optional)</span>
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Any notes about the return condition..."
              className="w-full rounded-control border border-input bg-input-background text-2sm text-foreground px-3 py-2 placeholder:text-muted-foreground/60 resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-bl-[16px]">
          <button onClick={onClose} className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="rounded-control px-5 py-2.5 text-sm font-semibold bg-warning text-white shadow-[0_2px_12px_rgba(245,158,11,0.3)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
            {saving ? 'Returning…' : 'Confirm Return'}
          </button>
        </div>
      </div>
    </>
  );
}
