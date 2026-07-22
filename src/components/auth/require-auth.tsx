'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { FIRST_LOGIN_PATH, landingPathFor } from '@/lib/routes';
import type { UserRole } from '@/types';

interface Props {
  children: ReactNode;
  /**
   * Restrict the subtree to a single role. Omit to allow any signed-in user
   * (e.g. the forced first-login screen, which both roles pass through).
   */
  role?: UserRole;
}

/**
 * Client-side route guard. Renders children only for a signed-in user of the
 * required role; everyone else is redirected to where they belong. This is an
 * optimistic UX gate — the authoritative check is the backend JWT guard
 * (OAMS-44), which must reject cross-role API calls on its own.
 */
export function RequireAuth({ children, role }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuth();

  // A user who still holds their emailed temporary password is confined to the
  // change-password screen until they replace it.
  const mustChangePassword = Boolean(user?.isFirstLogin) && pathname !== FIRST_LOGIN_PATH;
  const wrongRole = Boolean(user && role && user.role !== role);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
      return;
    }
    if (status === 'authenticated' && user && (mustChangePassword || wrongRole)) {
      router.replace(landingPathFor(user));
    }
  }, [status, user, mustChangePassword, wrongRole, router]);

  // Hold the spinner through the redirect so a mismatched portal never paints.
  if (status !== 'authenticated' || !user || mustChangePassword || wrongRole) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
