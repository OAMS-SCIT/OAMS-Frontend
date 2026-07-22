'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Info, Search, ChevronDown, CheckCircle, Mail } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { UserRole } from '@/types';
import { ApiError, createUser, getDesignations } from '@/lib/api';
import type { DesignationListItem } from '@/types';

interface Props {
  onClose: () => void;
  onSave: () => void;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  designationId: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
}

function isValidSriLankanContactNumber(value: string) {
  const compact = value.replace(/\s+/g, '');
  return /^(\+94|0)\d{9}$/.test(compact);
}

function sanitizeContactNumberInput(value: string) {
  return value.replace(/[^\d+\s]/g, '');
}

export function CreateUserDrawer({ onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>({
    firstName: '', lastName: '', email: '', contactNumber: '',
    designationId: '', role: 'Employee', status: 'Active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  const [designations, setDesignations] = useState<DesignationListItem[]>([]);
  const [designationsLoading, setDesignationsLoading] = useState(true);
  const [designationsError, setDesignationsError] = useState<string | null>(null);

  // Searchable designation dropdown state
  const [designationSearch, setDesignationSearch] = useState('');
  const [designationOpen, setDesignationOpen] = useState(false);
  const designationRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    getDesignations()
      .then(data => setDesignations(data))
      .catch(err => setDesignationsError(err instanceof Error ? err.message : 'Failed to load designations.'))
      .finally(() => setDesignationsLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (designationRef.current && !designationRef.current.contains(e.target as Node)) {
        setDesignationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDesignation = designations.find(d => d.id === form.designationId) ?? null;

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
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email is required';
    if (form.contactNumber.trim() && !isValidSriLankanContactNumber(form.contactNumber.trim())) {
      e.contactNumber = 'Contact number must be a valid Sri Lankan number (e.g. +94 77 000 0000)';
    }
    if (!form.designationId) e.designationId = 'Designation is required';
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }

    setSubmitting(true);
    try {
      await createUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim() || undefined,
        designationId: form.designationId,
        role: form.role,
        status: form.status,
      });
      setCreated(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setErrors(prev => ({ ...prev, email: 'This email is already in use' }));
        } else if (err.status === 404) {
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

  const { closing, requestClose } = useDrawerAnimation(onClose);
  return (
    <OverlayPortal>
      <div className={`fixed inset-0 z-40 bg-scrim backdrop-blur-[2px] ${closing ? 'motion-safe:animate-overlay-out' : 'motion-safe:animate-overlay-in'}`} onClick={created ? undefined : requestClose} />
      <div className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col w-[480px] bg-card text-card-foreground shadow-drawer rounded-l-[16px] ${closing ? 'motion-safe:animate-drawer-out' : 'motion-safe:animate-drawer-in'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">
            {created ? 'User Created' : 'Create New User'}
          </h2>
          {!created && (
            <button onClick={requestClose} className="rounded-control p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {created ? (
          /* ── Success screen ── */
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5 w-full min-w-0 overflow-hidden">
            <div className="flex items-center justify-center rounded-full w-14 h-14 bg-success-surface">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <div className="w-full min-w-0">
              <p className="font-semibold mb-1 text-base text-foreground" style={{ overflowWrap: 'anywhere' }}>
                <span className="break-all">{form.firstName} {form.lastName}</span> has been created
              </p>
              <p className="text-2sm text-muted-foreground leading-relaxed">
                The account has been set up successfully.
              </p>
            </div>
            <div className="w-full min-w-0 flex items-start gap-3 rounded-lg p-4 bg-info-surface border border-info/30">
              <Mail className="w-4 h-4 mt-0.5 shrink-0 text-info" />
              <p className="text-2sm text-info-foreground leading-relaxed text-left" style={{ overflowWrap: 'anywhere' }}>
                The username and a temporary password have been sent to <strong className="break-all">{form.email}</strong>.
              </p>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {errors._form && (
              <div className="rounded-control p-3 text-2sm bg-danger-surface border border-danger/30 text-danger-foreground">
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

            <FormField label="Email Address" required error={errors.email}>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="fi" placeholder="email@company.com" />
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
                <div className="fi text-muted-foreground/80">Loading designations…</div>
              ) : designationsError ? (
                <div className="fi text-xs text-danger">{designationsError}</div>
              ) : (
                <div ref={designationRef} className="relative">
                  {selectedDesignation ? (
                    /* Selected state */
                    <div className={`flex items-center justify-between rounded-control border bg-secondary px-3 py-2.5 ${
                      errors.designationId ? 'border-danger' : 'border-primary'
                    }`}>
                      <span className="font-medium text-2sm text-foreground">{selectedDesignation.name}</span>
                      <button onClick={clearDesignation} className="text-primary/60 hover:text-primary transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    /* Search input */
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground/70" />
                      <input
                        type="text"
                        value={designationSearch}
                        onChange={e => { setDesignationSearch(e.target.value); setDesignationOpen(true); }}
                        onFocus={() => setDesignationOpen(true)}
                        placeholder="Search designation..."
                        className={`w-full rounded-control border bg-input-background text-2sm text-foreground pl-9 pr-8 py-2.5 placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 ${
                          errors.designationId ? 'border-danger' : 'border-input focus:border-ring'
                        }`}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground/70" />
                    </div>
                  )}

                  {/* Dropdown list */}
                  {designationOpen && !selectedDesignation && (
                    <div className="absolute w-full z-10 rounded-xl mt-1 overflow-hidden overflow-y-auto max-h-[200px] bg-popover border border-border shadow-pop motion-safe:animate-pop-in">
                      {filteredDesignations.length === 0 ? (
                        <div className="px-4 py-3 text-2sm text-muted-foreground/80">No designations found</div>
                      ) : (
                        filteredDesignations.map(d => (
                          <button key={d.id}
                            className="w-full text-left px-4 py-2.5 text-2sm text-foreground transition-colors hover:bg-muted"
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
              <label className="block mb-2 text-xs font-medium text-foreground/80">
                Role <span className="text-danger">*</span>
              </label>
              <div className="flex gap-2">
                {(['Admin', 'Employee'] as UserRole[]).map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={`flex-1 rounded-control py-2.5 border text-2sm font-medium transition-all ${
                      form.role === r
                        ? 'border-primary bg-secondary text-secondary-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg p-3 bg-info-surface border border-info/30">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-info" />
              <p className="text-xs text-info-foreground">Both roles can sign in. Admins get the full management portal; Employees get their own profile only.</p>
            </div>

            {/* Status */}
            <div>
              <label className="block mb-2 text-xs font-medium text-foreground/80">Status</label>
              <button
                onClick={() => setForm(f => ({ ...f, status: f.status === 'Active' ? 'Inactive' : 'Active' }))}
                className={`flex items-center gap-2 rounded-full px-4 py-2 border transition-colors ${
                  form.status === 'Active'
                    ? 'bg-success-surface border-success/30'
                    : 'bg-neutral-surface border-border'
                }`}>
                <div className={`rounded-full w-2.5 h-2.5 ${form.status === 'Active' ? 'bg-success' : 'bg-neutral'}`} />
                <span className={`text-2sm font-medium ${form.status === 'Active' ? 'text-success-foreground' : 'text-muted-foreground'}`}>{form.status}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t border-border bg-muted/60 rounded-bl-[16px]">
          {created ? (
            <button onClick={() => { onSave(); onClose(); }}
              className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]">
              Done
            </button>
          ) : (
            <>
              <button onClick={requestClose} className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">Cancel</button>
              <button onClick={handleSave} disabled={submitting}
                className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
                {submitting ? 'Creating…' : 'Create User'}
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .fi { width: 100%; border: 1px solid var(--input); border-radius: 0.625rem; padding: 8px 12px; font-size: 13px; color: var(--foreground); background: var(--input-background); outline: none; transition: border-color .15s, box-shadow .15s; }
        .fi:focus { border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 15%, transparent); }
        .fi::placeholder { color: color-mix(in srgb, var(--muted-foreground) 60%, transparent); }
      `}</style>
    </OverlayPortal>
  );
}

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium text-foreground/80">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  );
}
