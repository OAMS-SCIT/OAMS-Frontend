'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

/**
 * Client-side route guard. Renders children only for an authenticated admin;
 * unauthenticated visitors are redirected to /login. This is an optimistic UX
 * gate — the authoritative check is the backend JWT guard (OAMS-44).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status !== 'authenticated') {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: '#F8FAFC' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#1E3A8A' }} />
      </div>
    );
  }

  return <>{children}</>;
}
