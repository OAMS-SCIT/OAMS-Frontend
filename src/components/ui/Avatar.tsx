'use client';

interface AvatarUser {
  firstName: string;
  lastName: string;
  avatarInitials?: string;
  avatarColor?: string;
}

interface AvatarProps {
  user?: AvatarUser | null;
  name?: string;
  size?: number;
}

export function Avatar({ user, name, size = 32 }: AvatarProps) {
  const displayName = user ? `${user.firstName} ${user.lastName}` : name || '?';
  const initials = displayName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['#1E3A8A', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#0F2460'];
  const color = user?.avatarColor || colors[displayName.charCodeAt(0) % colors.length];

  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: Math.round(size * 0.38) }}
    >
      {user?.avatarInitials || initials}
    </div>
  );
}
