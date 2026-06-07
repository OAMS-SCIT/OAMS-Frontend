'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PersonalProfile } from '@/features/profile/personal-profile';
import { useAuth } from '@/providers/auth-provider';
import {
  API_BASE_URL,
  ApiError,
  getMyProfile,
  resetMyPassword,
  updateMyProfile,
  uploadProfilePicture,
} from '@/lib/api';
import type {
  ProfileUser,
  ResetPasswordPayload,
  UpdateProfilePayload,
} from '@/types';

export default function AdminProfilePage() {
  const { logout, refresh } = useAuth();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMyProfile()
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch(() => {
        if (active) toast.error('Could not load your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (data: UpdateProfilePayload) => {
    try {
      const updated = await updateMyProfile(data);
      setProfile(updated);
      await refresh();
      toast.success('Profile updated.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to update profile.');
      throw e;
    }
  };

  const handleResetPassword = async (data: ResetPasswordPayload) => {
    try {
      await resetMyPassword(data);
      toast.success('Password updated.');
    } catch (e) {
      // Surface e.g. "Current password is incorrect"; rethrow so the form
      // keeps the entered values.
      toast.error(e instanceof ApiError ? e.message : 'Failed to update password.');
      throw e;
    }
  };

  const handleUploadPicture = async (file: File) => {
    try {
      const updated = await uploadProfilePicture(file);
      setProfile(updated);
      await refresh();
      toast.success('Profile picture updated.');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to upload picture.');
      throw e;
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: '#64748B' }}>Loading profile…</div>;
  }

  if (!profile) {
    return <div style={{ padding: 24, color: '#64748B' }}>Profile unavailable.</div>;
  }

  return (
    <PersonalProfile
      key={profile.id}
      user={profile}
      imageBaseUrl={API_BASE_URL}
      onSave={handleSave}
      onResetPassword={handleResetPassword}
      onUploadPicture={handleUploadPicture}
      onLogout={() => {
        void logout();
      }}
    />
  );
}
