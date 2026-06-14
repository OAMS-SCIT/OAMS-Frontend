'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Search, ChevronDown } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { toast } from 'sonner';
import { ApiError, createAssignment, getUsers } from '@/lib/api';
import type { AssetDetail, UserListItem } from '@/types';

// Only the asset fields this panel needs to display.
type AssetLike = Pick<AssetDetail, 'id' | 'name' | 'displayId' | 'serialNumber'>;

interface Props {
  asset: AssetLike;
  onClose: () => void;
  /** Called after the assignment is created so the parent can refresh the asset. */
  onAssigned: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

export function AssignAssetDrawer({ asset, onClose, onAssigned }: Props) {
  const [employees, setEmployees] = useState<UserListItem[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [assignmentDate, setAssignmentDate] = useState(today());
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Any active user (Admin or Employee) can be an assignee.
  useEffect(() => {
    getUsers({ status: 'Active', limit: 100 })
      .then((result) => setEmployees(result.data))
      .catch((err) =>
        setEmployeesError(err instanceof Error ? err.message : 'Failed to load assignees.'),
      )
      .finally(() => setEmployeesLoading(false));
  }, []);

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

  const handleConfirm = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await createAssignment({
        assetId: asset.id,
        assigneeId: selectedEmployeeId,
        assignmentDate,
        expectedReturnDate: expectedReturn || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(`"${asset.name}" assigned successfully.`);
      onAssigned();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to assign asset.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-40 bg-scrim backdrop-blur-[2px] motion-safe:animate-overlay-in" onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[520px] bg-card text-card-foreground shadow-drawer rounded-l-[16px] motion-safe:animate-drawer-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">Assign Asset</h2>
          <button onClick={onClose} className="rounded-control p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Asset being assigned */}
          <div className="rounded-lg p-4 bg-muted/60 border border-border">
            <div className="micro-label mb-1.5">
              Asset Being Assigned
            </div>
            <div className="font-semibold text-base text-foreground">{asset.name}</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">
              {asset.displayId} · {asset.serialNumber}
            </div>
          </div>

          {/* Assignee selector */}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-foreground/80">
              Select Assignee <span className="text-danger">*</span>
            </label>
            <div ref={dropdownRef} className="relative">
              {employeesLoading ? (
                <div className="rounded-control border border-input px-3 py-2.5 text-2sm text-muted-foreground/80">
                  Loading assignees…
                </div>
              ) : employeesError ? (
                <div className="rounded-control border border-danger px-3 py-2.5 text-xs text-danger">
                  {employeesError}
                </div>
              ) : selected ? (
                <div className="flex items-center justify-between rounded-control border border-primary bg-secondary px-3 py-2.5">
                  <div>
                    <div className="font-medium text-2sm text-foreground">{selected.firstName} {selected.lastName}</div>
                    <div className="text-2xs text-muted-foreground">{selected.designation?.name ?? '—'}</div>
                  </div>
                  <button onClick={clearEmployee} className="text-primary/60 hover:text-primary transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground/70" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    placeholder="Search assignee by name…"
                    className={`w-full rounded-control border bg-input-background text-2sm text-foreground pl-9 pr-8 py-2.5 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 ${
                      errors.employee ? 'border-danger' : 'border-input focus:border-ring'
                    }`}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground/70" />
                </div>
              )}

              {dropdownOpen && !selected && (
                <div className="absolute w-full z-10 rounded-xl mt-1 overflow-hidden overflow-y-auto max-h-[220px] bg-popover border border-border shadow-pop motion-safe:animate-pop-in">
                  {filtered.length === 0 ? (
                    <div className="px-4 py-3 text-2sm text-muted-foreground/80">No assignees found</div>
                  ) : (
                    filtered.map((e) => (
                      <button key={e.id}
                        className="w-full text-left px-4 py-2.5 transition-colors hover:bg-muted"
                        onMouseDown={(ev) => { ev.preventDefault(); selectEmployee(e); }}>
                        <div className="font-medium text-2sm text-foreground">{e.firstName} {e.lastName}</div>
                        <div className="text-2xs text-muted-foreground">{e.designation?.name ?? '—'}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {errors.employee && <p className="text-xs text-danger mt-1">{errors.employee}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-medium text-foreground/80">
                Assignment Date <span className="text-danger">*</span>
              </label>
              <input type="date" value={assignmentDate} onChange={(e) => setAssignmentDate(e.target.value)}
                className={`w-full rounded-control border bg-input-background text-2sm text-foreground px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 ${
                  errors.assignmentDate ? 'border-danger' : 'border-input focus:border-ring'
                }`} />
            </div>
            <div>
              <label className="block mb-1.5 text-xs font-medium text-foreground/80">
                Expected Return <span className="text-muted-foreground/70">(Optional)</span>
              </label>
              <input type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)}
                className={`w-full rounded-control border bg-input-background text-2sm text-foreground px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 ${
                  errors.expectedReturn ? 'border-danger' : 'border-input focus:border-ring'
                }`} />
              {errors.expectedReturn && <p className="text-xs text-danger mt-1">{errors.expectedReturn}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-foreground/80">
              Assignment Notes <span className="text-muted-foreground/70">(Optional)</span>
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Add any handover notes, accessories included, etc."
              className="w-full rounded-control border border-input bg-input-background text-2sm text-foreground px-3 py-2 placeholder:text-muted-foreground/60 resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-bl-[16px]">
          <button onClick={onClose} className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={saving}
            className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
            {saving ? 'Assigning…' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}
