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
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,36,96,0.45)' }}>
      <div className="rounded-2xl shadow-2xl flex flex-col" style={{ width: 420, background: '#fff' }}>
        {/* Body */}
        <div className="px-6 pt-6 pb-5 flex gap-4">
          <div className="shrink-0 flex items-center justify-center rounded-full" style={{ width: 40, height: 40, background: '#FEF2F2' }}>
            <AlertTriangle className="w-5 h-5" style={{ color: '#EF4444' }} />
          </div>
          <div>
            <h2 className="font-bold mb-1" style={{ fontSize: 16, color: '#1E293B' }}>{title}</h2>
            <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{description}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: '0 0 16px 16px' }}>
          <button onClick={onCancel}
            className="rounded-lg border px-5 py-2.5 font-medium hover:bg-gray-50 transition-colors"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="rounded-lg px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
            style={{ fontSize: 14, background: '#EF4444' }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
