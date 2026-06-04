'use client';

import { useState } from 'react';
import { X, Info } from 'lucide-react';
import { User, UserRole } from '@/types';
import { mockDesignations } from '@/lib/mock-data';

interface Props {
  onClose: () => void;
  onSave: (user: User) => void;
}

export function CreateUserDrawer({ onClose, onSave }: Props) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', contactNumber: '',
    designationId: '', role: 'Employee' as UserRole, status: 'Active' as 'Active' | 'Inactive',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName) e.firstName = 'First name is required';
    if (!form.lastName) e.lastName = 'Last name is required';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email is required';
    if (!form.designationId) e.designationId = 'Designation is required';
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    const designation = mockDesignations.find(d => d.id === form.designationId);
    const initials = (form.firstName[0] + form.lastName[0]).toUpperCase();
    const colors = ['#1E3A8A', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];
    const newUser: User = {
      id: `usr${Date.now()}`,
      firstName: form.firstName, lastName: form.lastName,
      email: form.email, contactNumber: form.contactNumber,
      designationId: form.designationId, designationTitle: designation?.title || '',
      role: form.role, status: form.status,
      avatarInitials: initials,
      avatarColor: colors[form.firstName.charCodeAt(0) % colors.length],
    };
    onSave(newUser);
  };

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(15,36,96,0.45)' }} onClick={onClose} />
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col" style={{ width: 480, background: '#fff', boxShadow: '-8px 0 32px rgba(0,0,0,0.14)' }}>
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <h2 className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>Create New User</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" style={{ color: '#64748B' }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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
          <FormField label="Contact Number">
            <input type="text" value={form.contactNumber} onChange={e => set('contactNumber', e.target.value)} className="fi" placeholder="+1 (555) 000-0000" />
          </FormField>
          <FormField label="Designation" required error={errors.designationId}>
            <select value={form.designationId} onChange={e => set('designationId', e.target.value)} className="fi">
              <option value="">Select designation...</option>
              {mockDesignations.filter(d => d.status === 'Active').map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </FormField>

          {/* Role */}
          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Role <span style={{ color: '#EF4444' }}>*</span></label>
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

          {/* Info box */}
          <div className="flex items-start gap-3 rounded-xl p-3" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#2563EB' }} />
            <p style={{ fontSize: 12, color: '#1D4ED8' }}>Only Admin role users will have login access. Employee accounts are for asset tracking only.</p>
          </div>

          {/* Status toggle */}
          <div>
            <label className="block mb-2" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Status</label>
            <button
              onClick={() => setForm(f => ({ ...f, status: f.status === 'Active' ? 'Inactive' : 'Active' }))}
              className="flex items-center gap-2 rounded-full px-4 py-2"
              style={{ background: form.status === 'Active' ? '#ECFDF5' : '#F8FAFC', border: '1px solid', borderColor: form.status === 'Active' ? '#A7F3D0' : '#E2E8F0' }}>
              <div className="rounded-full" style={{ width: 10, height: 10, background: form.status === 'Active' ? '#22C55E' : '#94A3B8' }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: form.status === 'Active' ? '#059669' : '#64748B' }}>{form.status}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 justify-end" style={{ borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
          <button onClick={onClose} className="rounded-lg border px-5 py-2.5 font-medium hover:bg-gray-50 transition-colors"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
          <button onClick={handleSave} className="rounded-lg px-5 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
            style={{ fontSize: 14, background: '#1E3A8A' }}>Create User</button>
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
