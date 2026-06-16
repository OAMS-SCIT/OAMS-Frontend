'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Search, ChevronDown, Lock } from 'lucide-react';
import type { DesignationListItem, UserListItem, UserRole } from '@/types';
import { ApiError, getDesignations, updateUser } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  user: UserListItem;
  onClose: () => void;
  onSave: () => void;
}

interface FormState {
  firstName: string;
  lastName: string;
  contactNumber: string;
  designationId: string;
  role: UserRole;
}

function isValidSriLankanContactNumber(value: string) {
  const compact = value.replace(/\s+/g, '');
  return /^(\+94|0)\d{9}$/.test(compact);
}

function sanitizeContactNumberInput(value: string) {
  return value.replace(/[^\d+\s]/g, '');
}

export function EditUserDrawer({ user, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>({
    firstName: user.firstName,
    lastName: user.lastName,
    contactNumber: user.contactNumber ?? '',
    designationId: user.designation?.id ?? '',
    role: user.role,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [designations, setDesignations] = useState<DesignationListItem[]>([]);
  const [designationsLoading, setDesignationsLoading] = useState(true);
  const [designationsError, setDesignationsError] = useState<string | null>(null);

  const [designationSearch, setDesignationSearch] = useState('');
  const [designationOpen, setDesignationOpen] = useState(false);
  const designationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDesignations()
      .then(data => setDesignations(data))
      .catch(err => setDesignationsError(err instanceof Error ? err.message : 'Failed to load designations.'))
      .finally(() => setDesignationsLoading(false));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (designationRef.current && !designationRef.current.contains(e.target as Node)) {
        setDesignationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDesignation =
    designations.find(d => d.id === form.designationId) ??
    (form.designationId && user.designation?.id === form.designationId
      ? { id: user.designation.id, name: user.designation.name }
      : null);

  const filteredDesignations = designations.filter(d =>
    !designationSearch || d.name.toLowerCase().includes(designationSearch.toLowerCase())
  );

  const selectDesignation = (d: DesignationListItem) => {
    setForm(f => ({ ...f, designationId: d.id }));
    setErrors(e => ({ ...e, designationId: '' }));
    setDesignationSearch('');
    setDesignationOpen(false);
  };

  const clearDesignation = () => {
    setForm(f => ({ ...f, designationId: '' }));
    setDesignationSearch('');
  };

  const set = (k: keyof FormState, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (form.contactNumber.trim() && !isValidSriLankanContactNumber(form.contactNumber.trim())) {
      e.contactNumber = 'Contact number must be a valid Sri Lankan number (e.g. +94 77 000 0000)';
    }
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSubmitting(true);
    try {
      await updateUser(user.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        contactNumber: form.contactNumber.trim(),
        designationId: form.designationId || undefined,
        role: form.role,
      });
      toast.success(`${form.firstName} ${form.lastName} updated successfully.`);
      onSave();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setErrors(prev => ({ ...prev, designationId: 'Selected designation no longer exists' }));
        } else {
          setErrors(prev => ({ ...prev, _form: err.message }));
        }
      } else {
        setErrors(prev => ({ ...prev, _form: 'Something went wrong. Please try again.' }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,36,96,0.45)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col" style={{ width: 480, background: '#fff', boxShadow: '-8px 0 32px rgba(0,0,0,0.14)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div>
            <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>Edit User</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{user.email}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {errors._form && (
            <div className="rounded-lg p-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 13, color: '#DC2626' }}>
              {errors._form}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" required error={errors.firstName}>
              <input type="text" value={form.firstName} onChange={e => set('firstName', e.target.value)} className="fi" placeholder="First name" />
            </FormField>
            <FormField label="Last Name" required error={errors.lastName}>
              <input type="text" value={form.lastName} onChange={e => set('lastName', e.target.value)} className="fi" placeholder="Last name" />
            </FormField>
          </div>

          {/* Email — read-only */}
          <FormField label="Email Address">
            <div className="fi flex items-center justify-between" style={{ background: '#F8FAFC', color: '#94A3B8', cursor: 'not-allowed' }}>
              <span>{user.email}</span>
              <Lock className="w-4 h-4" style={{ color: '#CBD5E1' }} />
            </div>
            <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Email cannot be changed here.</p>
          </FormField>

          <FormField label="Contact Number" error={errors.contactNumber}>
            <input
              type="text"
              inputMode="tel"
              maxLength={12}
              value={form.contactNumber}
              onChange={e => set('contactNumber', sanitizeContactNumberInput(e.target.value))}
              className="fi"
              placeholder="+94 77 000 0000"
            />
          </FormField>

          {/* Searchable Designation Dropdown */}
          <FormField label="Designation" required error={errors.designationId}>
            {designationsLoading ? (
              <div className="fi" style={{ color: '#94A3B8' }}>Loading designations…</div>
            ) : designationsError ? (
              <div className="fi" style={{ color: '#EF4444', fontSize: 12 }}>{designationsError}</div>
            ) : (
              <div ref={designationRef} className="relative">
                {selectedDesignation ? (
                  <div className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                    style={{ borderColor: errors.designationId ? '#EF4444' : '#3B82F6', background: '#EFF6FF' }}>
                    <span className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{selectedDesignation.name}</span>
                    <button onClick={clearDesignation} className="text-blue-400 hover:text-blue-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
                    <input
                      type="text"
                      value={designationSearch}
                      onChange={e => { setDesignationSearch(e.target.value); setDesignationOpen(true); }}
                      onFocus={() => setDesignationOpen(true)}
                      placeholder="Search designation..."
                      className="w-full rounded-lg border pl-9 pr-8 py-2.5 focus:outline-none"
                      style={{ borderColor: errors.designationId ? '#EF4444' : '#CBD5E1', fontSize: 13, color: '#1E293B' }}
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#94A3B8' }} />
                  </div>
                )}
                {designationOpen && !selectedDesignation && (
                  <div className="absolute w-full z-10 rounded-xl shadow-lg mt-1 overflow-hidden"
                    style={{ background: '#fff', border: '1px solid #E2E8F0', maxHeight: 200, overflowY: 'auto' }}>
                    {filteredDesignations.length === 0 ? (
                      <div className="px-4 py-3" style={{ fontSize: 13, color: '#94A3B8' }}>No designations found</div>
                    ) : (
                      filteredDesignations.map(d => (
                        <button key={d.id}
                          className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors"
                          style={{ fontSize: 13, color: '#1E293B' }}
                          onMouseDown={e => { e.preventDefault(); selectDesignation(d); }}>
                          {d.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </FormField>

          {/* Role */}
          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
              Role <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div className="flex gap-2">
              {(['Admin', 'Employee'] as UserRole[]).map(r => (
                <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                  className="flex-1 rounded-lg py-2.5 border font-medium transition-all"
                  style={{
                    fontSize: 13,
                    borderColor: form.role === r ? '#1E3A8A' : '#E2E8F0',
                    background: form.role === r ? '#EFF6FF' : '#fff',
                    color: form.role === r ? '#1E3A8A' : '#64748B',
                  }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <button onClick={onClose} className="rounded-lg border px-5 py-2.5 font-medium hover:bg-gray-50 transition-colors"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={submitting}
            className="rounded-lg px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60"
            style={{ fontSize: 14, background: '#1E3A8A' }}>
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <style>{`.fi { width: 100%; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #1E293B; background: #fff; outline: none; } .fi:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }`}</style>
    </>
  );
}

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
        {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{error}</p>}
    </div>
  );
}
