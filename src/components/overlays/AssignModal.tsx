'use client';

import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { Asset, AssignmentRecord } from '@/types';
import { mockUsers } from '@/lib/mock-data';
import { Avatar } from '@/components/ui/Avatar';

interface Props {
  asset: Asset;
  onClose: () => void;
  onConfirm: (employeeId: string, employeeName: string, date: string, expectedReturn?: string, notes?: string) => void;
}

export function AssignModal({ asset, onClose, onConfirm }: Props) {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const employees = mockUsers.filter(u => u.role === 'Employee' && u.status === 'Active');
  const filteredEmployees = employees.filter(e =>
    `${e.firstName} ${e.lastName} ${e.designationTitle}`.toLowerCase().includes(search.toLowerCase())
  );
  const selected = employees.find(e => e.id === selectedEmployee);

  const handleConfirm = () => {
    const e: Record<string, string> = {};
    if (!selectedEmployee) e.employee = 'Please select an employee';
    if (!assignDate) e.date = 'Assignment date is required';
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const name = selected ? `${selected.firstName} ${selected.lastName}` : '';
    onConfirm(selectedEmployee, name, assignDate, expectedReturn || undefined, notes || undefined);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(15,36,96,0.45)' }}>
        <div className="rounded-2xl shadow-2xl flex flex-col" style={{ width: 480, maxHeight: '90vh', background: '#fff' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>Assign Asset</h2>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" style={{ color: '#64748B' }} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Asset info box */}
            <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Asset Being Assigned</div>
              <div className="font-semibold" style={{ fontSize: 15, color: '#1E293B' }}>{asset.name}</div>
              <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>{asset.id} · {asset.serialNumber}</div>
            </div>

            {/* Employee selector */}
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                Select Employee <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div className="relative">
                {selected ? (
                  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: '#3B82F6', background: '#EFF6FF' }}>
                    <Avatar user={selected} size={28} />
                    <div className="flex-1">
                      <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{selected.firstName} {selected.lastName}</div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>{selected.designationTitle}</div>
                    </div>
                    <button onClick={() => { setSelectedEmployee(''); setSearch(''); }} className="text-blue-400 hover:text-blue-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
                    <input
                      type="text"
                      value={search}
                      onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      placeholder="Search employee by name..."
                      className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={{ borderColor: errors.employee ? '#EF4444' : '#CBD5E1', fontSize: 13 }}
                    />
                    {showDropdown && filteredEmployees.length > 0 && (
                      <div className="absolute w-full z-10 rounded-xl shadow-lg mt-1 overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', maxHeight: 200, overflowY: 'auto' }}>
                        {filteredEmployees.map(e => (
                          <button key={e.id} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left"
                            onClick={() => { setSelectedEmployee(e.id); setSearch(''); setShowDropdown(false); setErrors(er => ({ ...er, employee: '' })); }}>
                            <Avatar user={e} size={30} />
                            <div>
                              <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{e.firstName} {e.lastName}</div>
                              <div style={{ fontSize: 11, color: '#64748B' }}>{e.designationTitle}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.employee && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.employee}</p>}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                  Assignment Date <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input type="date" value={assignDate} onChange={e => setAssignDate(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none"
                  style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
              </div>
              <div>
                <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                  Expected Return <span style={{ color: '#94A3B8' }}>(Optional)</span>
                </label>
                <input type="date" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 focus:outline-none"
                  style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Assignment Notes <span style={{ color: '#94A3B8' }}>(Optional)</span></label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Add any handover notes, accessories included, etc."
                className="w-full rounded-lg border px-3 py-2 focus:outline-none resize-none"
                style={{ borderColor: '#CBD5E1', fontSize: 13 }} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            <button onClick={onClose} className="rounded-lg border px-5 py-2.5 font-medium hover:bg-gray-50 transition-colors"
              style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
              Cancel
            </button>
            <button onClick={handleConfirm} className="rounded-lg px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
              style={{ fontSize: 14, background: '#1E3A8A' }}>
              Confirm Assignment
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
