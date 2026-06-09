'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';
import type { AssetDetail, UserListItem } from '@/types';

// Only the asset fields this panel needs to display.
type AssetLike = Pick<AssetDetail, 'id' | 'name' | 'displayId' | 'serialNumber'>;

interface Props {
  asset: AssetLike;
  onClose: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

export function AssignAssetDrawer({ asset, onClose }: Props) {
  // Employee list is loaded in OAMS-105; the searchable dropdown UI is built here.
  const [employees] = useState<UserListItem[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [assignmentDate, setAssignmentDate] = useState(today());
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Close the dropdown on an outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = employees.find((e) => e.id === selectedEmployeeId) ?? null;
  const filtered = employees.filter((e) =>
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  const selectEmployee = (e: UserListItem) => {
    setSelectedEmployeeId(e.id);
    setErrors((prev) => ({ ...prev, employee: '' }));
    setSearch('');
    setDropdownOpen(false);
  };

  const clearEmployee = () => {
    setSelectedEmployeeId('');
    setSearch('');
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!selectedEmployeeId) e.employee = 'Please select an assignee';
    if (!assignmentDate) e.assignmentDate = 'Assignment date is required';
    if (expectedReturn && expectedReturn < assignmentDate) {
      e.expectedReturn = 'Expected return cannot be before the assignment date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    // The assignment is created in OAMS-105.
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,36,96,0.45)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col" style={{ width: 520, background: '#fff', boxShadow: '-8px 0 32px rgba(0,0,0,0.14)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>Assign Asset</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Asset being assigned */}
          <div className="rounded-xl p-4" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
              Asset Being Assigned
            </div>
            <div className="font-semibold" style={{ fontSize: 16, color: '#1E293B' }}>{asset.name}</div>
            <div style={{ fontSize: 12, color: '#64748B', fontFamily: 'monospace', marginTop: 2 }}>
              {asset.displayId} · {asset.serialNumber}
            </div>
          </div>

          {/* Assignee selector */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
              Select Assignee <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div ref={dropdownRef} className="relative">
              {selected ? (
                <div className="flex items-center justify-between rounded-lg border px-3 py-2.5" style={{ borderColor: '#3B82F6', background: '#EFF6FF' }}>
                  <div>
                    <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{selected.firstName} {selected.lastName}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{selected.designation?.name ?? '—'}</div>
                  </div>
                  <button onClick={clearEmployee} className="text-blue-400 hover:text-blue-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder="Search assignee by name…"
                    className="w-full rounded-lg border pl-9 pr-8 py-2.5 focus:outline-none"
                    style={{ borderColor: errors.employee ? '#EF4444' : '#CBD5E1', fontSize: 13, color: '#1E293B' }}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
                </div>
              )}

              {dropdownOpen && !selected && (
                <div className="absolute w-full z-10 rounded-xl shadow-lg mt-1 overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', maxHeight: 220, overflowY: 'auto' }}>
                  {filtered.length === 0 ? (
                    <div className="px-4 py-3" style={{ fontSize: 13, color: '#94A3B8' }}>No assignees found</div>
                  ) : (
                    filtered.map((e) => (
                      <button key={e.id}
                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
                        onMouseDown={(ev) => { ev.preventDefault(); selectEmployee(e); }}>
                        <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{e.firstName} {e.lastName}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{e.designation?.name ?? '—'}</div>
                      </button>
                    ))
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
              <input type="date" value={assignmentDate} onChange={(e) => setAssignmentDate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none"
                style={{ borderColor: errors.assignmentDate ? '#EF4444' : '#CBD5E1', fontSize: 13, color: '#1E293B' }} />
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                Expected Return <span style={{ color: '#94A3B8' }}>(Optional)</span>
              </label>
              <input type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 focus:outline-none"
                style={{ borderColor: errors.expectedReturn ? '#EF4444' : '#CBD5E1', fontSize: 13, color: '#1E293B' }} />
              {errors.expectedReturn && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{errors.expectedReturn}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
              Assignment Notes <span style={{ color: '#94A3B8' }}>(Optional)</span>
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Add any handover notes, accessories included, etc."
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
          <button onClick={handleConfirm}
            className="rounded-lg px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60"
            style={{ fontSize: 14, background: '#1E3A8A' }}>
            Confirm Assignment
          </button>
        </div>
      </div>
    </>
  );
}
