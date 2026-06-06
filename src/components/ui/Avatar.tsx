'use client';

import { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';

interface AvatarUser {
  firstName: string;
  lastName: string;
  avatarInitials?: string;
  avatarColor?: string;
  profilePicture?: string | null;
}

interface AvatarProps {
  user?: AvatarUser | null;
  name?: string;
  size?: number;
}

const AVATAR_COLORS = ['#1E3A8A', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#0F2460'];

/** Deterministic fallback colour from a display name — shared so every avatar
 *  (sidebar, topbar, users list, profile page) renders the same colour. */
export function avatarColor(name: string): string {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

export function avatarInitials(name: string): string {
  return name.split(' ').map(w => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?';
}

export function Avatar({ user, name, size = 32 }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const displayName = user ? `${user.firstName} ${user.lastName}` : name || '?';
  const initials = user?.avatarInitials || avatarInitials(displayName);
  const color = user?.avatarColor || avatarColor(displayName);

  const picture = user?.profilePicture;
  if (picture && !imgError) {
    const src = picture.startsWith('http') ? picture : `${API_BASE_URL}${picture}`;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={displayName}
        onError={() => setImgError(true)}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </div>
  );
}
