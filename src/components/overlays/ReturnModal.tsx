'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Asset, AssetCondition } from '@/types';

interface Props {
  asset: Asset;
  onClose: () => void;
  onConfirm: (returnDate: string, condition: AssetCondition, notes?: string) => void;
}

const CONDITIONS: AssetCondition[] = ['New', 'Good', 'Fair', 'Poor'];

export function ReturnModal({ asset, onClose, onConfirm }: Props) {
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [condition, setCondition] = useState<AssetCondition>('Good');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleConfirm = () => {
    const e: Record<string, string> = {};
    if (!returnDate) e.date = 'Return date is required';
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onConfirm(returnDate, condition, notes || undefined);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(15,36,96,0.45)' }}>
      <div className="rounded-2xl shadow-2xl flex flex-col" style={{ width: 480, background: '#fff' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>Process Asset Return</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#64748B' }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Info box */}
          <div className="rounded-xl p-4" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <div style={{ fontSize: 11, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Return Information</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div style={{ fontSize: 11, color: '#B45309' }}>Asset</div>
                <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{asset.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#B45309' }}>Assigned To</div>
                <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{asset.assignedTo || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#B45309' }}>Since</div>
                <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{asset.assignedDate || '—'}</div>
              </div>
            </div>
          </div>

          {/* Return date */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
              Return Date <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none"
              style={{ borderColor: errors.date ? '#EF4444' : '#CBD5E1', fontSize: 13 }} />
            {errors.date && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.date}</p>}
          </div>

          {/* Condition */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
              Condition at Return <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div className="flex gap-2">
              {CONDITIONS.map(c => (
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

          {/* Notes */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
              Return Notes <span style={{ color: '#94A3B8' }}>(Optional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Any notes about the return condition..."
              className="w-full rounded-lg border px-3 py-2 focus:outline-none resize-none"
              style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <button onClick={onClose} className="rounded-lg border px-5 py-2.5 font-medium hover:bg-gray-50 transition-colors"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button onClick={handleConfirm} className="rounded-lg px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
            style={{ fontSize: 14, background: '#F59E0B' }}>
            Confirm Return
          </button>
        </div>
      </div>
    </div>
  );
}
