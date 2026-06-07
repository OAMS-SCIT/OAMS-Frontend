'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Lock, Mail, LogOut } from 'lucide-react';
import type {
  ProfileUser,
  ResetPasswordPayload,
  UpdateProfilePayload,
} from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { avatarColor, avatarInitials } from '@/components/ui/Avatar';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB — mirror the backend limit

interface Props {
  user: ProfileUser;
  /** Base URL the stored profilePicture path is resolved against (backend origin). */
  imageBaseUrl?: string;
  onSave: (data: UpdateProfilePayload) => Promise<void>;
  onResetPassword: (data: ResetPasswordPayload) => Promise<void>;
  onUploadPicture: (file: File) => Promise<void>;
  onLogout: () => void;
}

export function PersonalProfile({
  user,
  imageBaseUrl = '',
  onSave,
  onResetPassword,
  onUploadPicture,
  onLogout,
}: Props) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [contactNumber, setContactNumber] = useState(user.contactNumber ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Editable fields initialise from props once. The parent remounts this
  // component via `key={user.id}` when a different user loads, so there's no
  // need to sync prop → state in an effect (read-only fields read props live).

  // Revoke the object URL when the preview changes or the component unmounts.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const designationName = user.designation?.name ?? '—';
  const storedPicture = user.profilePicture
    ? `${imageBaseUrl}${user.profilePicture}`
    : null;
  // Fall back to initials if the stored image fails to load (e.g. deleted file).
  const avatarSrc = imgError ? null : preview ?? storedPicture;

  const nameDirty =
    firstName !== user.firstName ||
    lastName !== user.lastName ||
    (contactNumber || '') !== (user.contactNumber || '');
  const canSave =
    firstName.trim() !== '' && lastName.trim() !== '' && nameDirty && !savingProfile;

  const handleSave = async () => {
    if (!canSave) return;
    setSavingProfile(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contactNumber: contactNumber.trim(),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError('');
    if (!currentPassword) return setPasswordError('Enter your current password.');
    if (newPassword.length < 8)
      return setPasswordError('New password must be at least 8 characters.');
    if (newPassword !== confirmPassword)
      return setPasswordError('New password and confirmation do not match.');

    setSavingPassword(true);
    try {
      await onResetPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      // The parent surfaces the error (e.g. wrong current password) via toast.
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPasswordError('');
      alert('Only JPEG and PNG images are allowed.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert('Image must be 2 MB or smaller.');
      return;
    }
    setImgError(false);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      await onUploadPicture(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="font-bold mb-6" style={{ fontSize: 24, color: '#1E293B' }}>Personal Profile</h1>

      <div className="mx-auto" style={{ maxWidth: 680 }}>
        <div className="rounded-2xl p-8" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={`${user.firstName} ${user.lastName}`}
                  onError={() => setImgError(true)}
                  className="rounded-full object-cover"
                  style={{ width: 96, height: 96 }}
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded-full text-white font-bold"
                  style={{ width: 96, height: 96, background: avatarColor(`${user.firstName} ${user.lastName}`), fontSize: 32 }}>
                  {avatarInitials(`${user.firstName} ${user.lastName}`)}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Change profile picture"
                className="absolute bottom-0 right-0 flex items-center justify-center rounded-full shadow-md disabled:opacity-60"
                style={{ width: 30, height: 30, background: '#fff', border: '2px solid #E2E8F0' }}>
                <Camera className="w-4 h-4" style={{ color: '#64748B' }} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={handlePickFile}
              />
            </div>
            <div className="mt-3 text-center">
              <div className="font-bold" style={{ fontSize: 18, color: '#1E293B' }}>{user.firstName} {user.lastName}</div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>{designationName}</div>
              <div className="mt-2"><StatusBadge status={user.role} /></div>
              {uploading && <div style={{ fontSize: 11, color: '#64748B', marginTop: 6 }}>Uploading…</div>}
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
                {/* paddingLeft is set inline because the `.pf-input` padding
                    shorthand (in the <style> below) would otherwise override a
                    `pl-9` utility class and let the text sit under the icon. */}
                <input type="email" value={user.email} readOnly className="pf-input" style={{ background: '#F8FAFC', color: '#94A3B8', cursor: 'not-allowed', paddingLeft: 36 }} />
              </div>
              <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>Email cannot be changed. Contact your administrator.</p>
            </FormField>
            <FormField label="Contact Number">
              <input type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="pf-input" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Designation">
                <input type="text" value={designationName} readOnly className="pf-input" style={{ background: '#F8FAFC', color: '#94A3B8', cursor: 'not-allowed' }} />
              </FormField>
              <FormField label="Role">
                <div className="rounded-lg border px-3 py-2 flex items-center" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                  <StatusBadge status={user.role} />
                </div>
              </FormField>
            </div>
            <div className="flex items-center justify-end pt-2">
              <button onClick={handleSave} disabled={!canSave} className="rounded-lg px-6 py-2.5 font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontSize: 14, background: '#1E3A8A' }}>
                {savingProfile ? 'Saving…' : 'Save Changes'}
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
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="pf-input" placeholder="Enter current password" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="New Password">
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="pf-input" placeholder="New password" />
                </FormField>
                <FormField label="Confirm New Password">
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pf-input" placeholder="Confirm new password" />
                </FormField>
              </div>
              {passwordError && (
                <p style={{ fontSize: 12, color: '#EF4444' }}>{passwordError}</p>
              )}
              <div className="flex justify-end">
                <button onClick={handleUpdatePassword} disabled={savingPassword} className="rounded-lg border px-6 py-2.5 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontSize: 14, borderColor: '#1E3A8A', color: '#1E3A8A' }}>
                  {savingPassword ? 'Updating…' : 'Update Password'}
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
