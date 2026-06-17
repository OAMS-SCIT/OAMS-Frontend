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
  // Full URLs (e.g. Cloudinary) are used as-is; relative paths (legacy
  // /uploads/... disk storage) are resolved against imageBaseUrl.
  const storedPicture = user.profilePicture
    ? user.profilePicture.startsWith('http')
      ? user.profilePicture
      : `${imageBaseUrl}${user.profilePicture}`
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
    <div className="motion-safe:animate-fade-rise">
      <h1 className="font-bold mb-6 text-2xl tracking-[-0.02em] text-foreground">Personal Profile</h1>

      <div className="mx-auto max-w-[680px]">
        <div className="rounded-2xl p-8 bg-card border border-border shadow-card">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt={`${user.firstName} ${user.lastName}`}
                  onError={() => setImgError(true)}
                  className="rounded-full object-cover w-24 h-24"
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded-full text-white font-bold w-24 h-24 text-[32px]"
                  style={{ background: avatarColor(`${user.firstName} ${user.lastName}`) }}>
                  {avatarInitials(`${user.firstName} ${user.lastName}`)}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Change profile picture"
                className="absolute bottom-0 right-0 flex items-center justify-center rounded-full shadow-md w-[30px] h-[30px] bg-card border-2 border-border transition-colors hover:bg-muted disabled:opacity-60">
                <Camera className="w-4 h-4 text-muted-foreground" />
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
              <div className="font-bold text-lg tracking-[-0.01em] text-foreground">{user.firstName} {user.lastName}</div>
              <div className="text-2sm text-muted-foreground mt-0.5">{designationName}</div>
              <div className="mt-2"><StatusBadge status={user.role} /></div>
              {uploading && <div className="text-2xs text-muted-foreground mt-1.5">Uploading…</div>}
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
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                {/* paddingLeft is set inline because the `.pf-input` padding
                    shorthand (in the <style> below) would otherwise override a
                    `pl-9` utility class and let the text sit under the icon. */}
                <input type="email" value={user.email} readOnly className="pf-input" style={{ paddingLeft: 36 }} />
              </div>
              <p className="text-2xs text-muted-foreground/80 mt-1">Email cannot be changed. Contact your administrator.</p>
            </FormField>
            <FormField label="Contact Number">
              <input type="text" value={contactNumber} onChange={e => setContactNumber(e.target.value)} className="pf-input" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Designation">
                <input type="text" value={designationName} readOnly className="pf-input" />
              </FormField>
              <FormField label="Role">
                <div className="rounded-control border border-border bg-muted px-3 py-2 flex items-center">
                  <StatusBadge status={user.role} />
                </div>
              </FormField>
            </div>
            <div className="flex items-center justify-end pt-2">
              <button onClick={handleSave} disabled={!canSave} className="rounded-control px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="my-8 border-t border-border" />

          {/* Reset Password */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-base tracking-[-0.01em] text-foreground">Reset Password</h3>
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
                <p className="text-xs text-danger">{passwordError}</p>
              )}
              <div className="flex justify-end">
                <button onClick={handleUpdatePassword} disabled={savingPassword} className="rounded-control border border-primary px-6 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed">
                  {savingPassword ? 'Updating…' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>

          <div className="my-8 border-t border-border" />

          {/* Logout */}
          <button onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 rounded-control py-2.5 text-sm font-semibold border border-danger/40 text-danger transition-colors hover:bg-danger-surface">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <style>{`
        .pf-input { width: 100%; border: 1px solid var(--input); border-radius: 0.625rem; padding: 8px 12px; font-size: 13px; color: var(--foreground); background: var(--input-background); outline: none; transition: border-color .15s ease, box-shadow .15s ease; }
        .pf-input:focus { border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 15%, transparent); }
        .pf-input::placeholder { color: color-mix(in srgb, var(--muted-foreground) 60%, transparent); }
        .pf-input[readonly] { background: var(--muted); color: var(--muted-foreground); cursor: not-allowed; }
      `}</style>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium text-foreground/80">{label}</label>
      {children}
    </div>
  );
}
