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
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,36,96,0.45)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col" style={{ width: 520, background: '#fff', boxShadow: '-8px 0 32px rgba(0,0,0,0.14)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>Process Asset Return</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Return information summary */}
          <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 11, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Return Information</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div style={{ fontSize: 11, color: '#B45309' }}>Asset</div>
                <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{assetName}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#B45309' }}>Assigned To</div>
                <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{assignedTo || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#B45309' }}>Since</div>
                <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{since || '—'}</div>
              </div>
            </div>
          </div>

          {/* Return date */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
              Return Date <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input type="date" value={returnDate}
              onChange={(e) => { setReturnDate(e.target.value); setErrors((p) => ({ ...p, date: '' })); }}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none"
              style={{ borderColor: errors.date ? '#EF4444' : '#CBD5E1', fontSize: 13, color: '#1E293B' }} />
            {errors.date && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.date}</p>}
          </div>

          {/* Condition at return */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
              Condition at Return <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div className="flex gap-2">
              {CONDITIONS.map((c) => (
                <button key={c} onClick={() => setCondition(c)}
                  className="flex-1 rounded-lg py-2 border transition-all"
                  style={{
                    fontSize: 13, fontWeight: 500,
                    borderColor: condition === c ? '#F59E0B' : '#E2E8F0',
                    background: condition === c ? '#FFFBEB' : '#fff',
                    color: condition === c ? '#D97706' : '#64748B',
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Return notes */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
              Return Notes <span style={{ color: '#94A3B8' }}>(Optional)</span>
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Any notes about the return condition..."
              className="w-full rounded-lg border px-3 py-2 focus:outline-none resize-none"
              style={{ borderColor: '#CBD5E1', fontSize: 13, color: '#1E293B' }} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <button onClick={onClose} className="rounded-lg border px-5 py-2.5 font-medium hover:bg-gray-50 transition-colors"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="rounded-lg px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60"
            style={{ fontSize: 14, background: '#F59E0B' }}>
            {saving ? 'Returning…' : 'Confirm Return'}
          </button>
        </div>
      </div>
    </>
  );
}
