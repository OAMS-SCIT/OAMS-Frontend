'use client';

import { Monitor } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

/**
 * The employee portal's landing page for this phase: a welcome banner backed by
 * the signed-in user. Asset and history views arrive once the employee-scoped
 * endpoints exist — until then this deliberately shows nothing it cannot prove.
 */
export function EmployeeWelcome() {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="motion-safe:animate-fade-rise">
      <div className="rounded-2xl p-6 mb-6 text-white bg-[linear-gradient(135deg,#0C1B4D_0%,#1D4ED8_100%)] shadow-card">
        <div className="font-bold mb-1 text-[22px] tracking-[-0.02em]">
          Hello, {user?.firstName ?? 'there'}! 👋
        </div>
        <div className="text-sm opacity-85">{today}</div>
      </div>

      <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center bg-card border border-border shadow-card">
        <div className="rounded-2xl p-5 mb-4 bg-muted">
          <Monitor className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <div className="font-semibold mb-2 text-base text-foreground">
          Your asset view is on the way
        </div>
        <div className="text-2sm text-muted-foreground/80 max-w-[320px]">
          You&apos;ll be able to see the assets assigned to you here soon. In the meantime you
          can update your details from My Profile.
        </div>
      </div>
    </div>
  );
}
