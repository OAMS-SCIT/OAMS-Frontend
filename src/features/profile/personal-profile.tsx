'use client';

import { useState } from 'react';
import { Camera, Lock, Mail, LogOut } from 'lucide-react';
import { User } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Props {
  user: User;
  onLogout: () => void;
}

export function PersonalProfile({ user, onLogout }: Props) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [contactNumber, setContactNumber] = useState(user.contactNumber);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div>
      <h1 className="font-bold mb-6" style={{ fontSize: 24, color: '#1E293B' }}>Personal Profile</h1>

      <div className="mx-auto" style={{ maxWidth: 680 }}>
        {/* Profile Card */}
        <div className="rounded-2xl p-8" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div
                className="flex items-center justify-center rounded-full text-white font-bold"
                style={{ width: 96, height: 96, background: user.avatarColor || '#1E3A8A', fontSize: 32 }}>
                {user.avatarInitials}
              </div>
              <button className="absolute bottom-0 right-0 flex items-center justify-center rounded-full shadow-md"
                style={{ width: 30, height: 30, background: '#fff', border: '2px solid #E2E8F0' }}>
                <Camera className="w-4 h-4" style={{ color: '#64748B' }} />
              </button>
            </div>
            <div className="mt-3 text-center">
              <div className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>{user.firstName} {user.lastName}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{user.designationTitle}</div>
              <div className="mt-2"><StatusBadge status={user.role} /></div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="First Name">
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="pf-input" />
              </FormField>
              <FormField label="Last Name">
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="pf-input" />
              </FormField>
            </div>
            <FormField label="Email Address">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
                <input type="email" value={user.email} readOnly className="pf-input pl-9" style={{ background: '#F8FAFC', color: '#94A3B8', cursor: 'not-allowed' }} />
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Email cannot be changed. Contact your administrator.</p>
            </FormField>
            <FormField label="Contact Number">
              <input type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="pf-input" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Designation">
                <input type="text" value={user.designationTitle} readOnly className="pf-input" style={{ background: '#F8FAFC', color: '#94A3B8', cursor: 'not-allowed' }} />
              </FormField>
              <FormField label="Role">
                <div className="rounded-lg border px-3 py-2 flex items-center" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                  <StatusBadge status={user.role} />
                </div>
              </FormField>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div />
              <button onClick={handleSave} className="rounded-lg px-6 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
                style={{ fontSize: 14, background: '#1E3A8A' }}>
                {saved ? '✓ Changes Saved' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="my-8" style={{ borderTop: '1px solid #E2E8F0' }} />

          {/* Reset Password */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Lock className="w-4 h-4" style={{ color: '#64748B' }} />
              <h3 className="font-semibold" style={{ fontSize: 16, color: '#1E293B' }}>Reset Password</h3>
            </div>
            <div className="space-y-4">
              <FormField label="Current Password">
                <input type="password" className="pf-input" placeholder="Enter current password" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="New Password">
                  <input type="password" className="pf-input" placeholder="New password" />
                </FormField>
                <FormField label="Confirm New Password">
                  <input type="password" className="pf-input" placeholder="Confirm new password" />
                </FormField>
              </div>
              <div className="flex justify-end">
                <button className="rounded-lg border px-6 py-2.5 font-semibold hover:bg-gray-50 transition-colors"
                  style={{ fontSize: 14, borderColor: '#1E3A8A', color: '#1E3A8A' }}>
                  Update Password
                </button>
              </div>
            </div>
          </div>

          <div className="my-8" style={{ borderTop: '1px solid #E2E8F0' }} />

          {/* Logout */}
          <button onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 font-semibold border hover:bg-red-50 transition-colors"
            style={{ fontSize: 14, color: '#EF4444', borderColor: '#FCA5A5' }}>
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <style>{`.pf-input { width: 100%; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 12px; font-size: 13px; color: #1E293B; background: #fff; outline: none; } .pf-input:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }`}</style>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{label}</label>
      {children}
    </div>
  );
}
