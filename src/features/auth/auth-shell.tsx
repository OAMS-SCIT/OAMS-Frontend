'use client';

import { Monitor, Shield, UserCheck, Activity } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface Props {
  children: React.ReactNode;
}

/** Shared split layout for login, forgot-password, and reset-password screens. */
export function AuthShell({ children }: Props) {
  return (
    <div className="flex h-screen">
      {/* Left Panel - Navy (decorative gradient, identical in both themes) */}
      <div className="flex flex-col w-[55%] bg-[linear-gradient(160deg,#0C1B4D_0%,#1E3A8A_60%,#2563EB_100%)]">
        <div className="flex items-center gap-3 p-10">
          <div className="flex items-center justify-center rounded-xl w-11 h-11 bg-white/15 backdrop-blur-sm">
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-white text-[22px] tracking-[-0.02em]">
            OAMS
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-12">
          <div className="relative mb-10 w-[280px] h-[200px]">
            <div className="absolute left-10 top-5 w-[100px] h-[70px] rounded-xl bg-white/[0.08] border border-white/15">
              <div className="mt-3 mx-3 h-2 rounded bg-white/30 w-[70%]" />
              <div className="mt-2 mx-3 h-1.5 rounded bg-white/15 w-1/2" />
              <div className="mt-1.5 mx-3 h-1.5 rounded bg-white/15 w-[60%]" />
            </div>
            <div className="absolute right-5 top-[50px] w-20 h-[55px] rounded-[10px] bg-[rgba(59,130,246,0.25)] border border-[rgba(59,130,246,0.4)]">
              <div className="mt-2.5 mx-2.5 h-1.5 rounded bg-white/30 w-[60%]" />
              <div className="mt-1.5 mx-2.5 h-[5px] rounded bg-white/15 w-2/5" />
            </div>
            <div className="absolute left-5 bottom-5 w-[60px] h-[60px] rounded-[10px] bg-[rgba(16,185,129,0.2)] border border-[rgba(16,185,129,0.4)] flex items-center justify-center">
              <Monitor className="w-7 h-7 text-white/50" />
            </div>
            <div className="absolute right-10 bottom-2.5 w-[50px] h-[50px] rounded-[10px] bg-[rgba(139,92,246,0.2)] border border-[rgba(139,92,246,0.3)] flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-white/40" />
            </div>
            <svg className="absolute inset-0 w-full h-full opacity-20">
              <line x1="90" y1="55" x2="175" y2="77" stroke="white" strokeWidth="1" strokeDasharray="4 3" />
              <line x1="50" y1="55" x2="45" y2="130" stroke="white" strokeWidth="1" strokeDasharray="4 3" />
            </svg>
          </div>

          <h2 className="font-bold text-white text-center mb-3 text-[26px] tracking-[-0.02em]">
            Manage every asset.
            <br />
            Track every assignment.
          </h2>
          <p className="text-center text-[15px] text-white/60 max-w-80">
            One unified platform for your entire office asset lifecycle.
          </p>

          <div className="flex gap-4 mt-10">
            {[
              { icon: Shield, label: 'Secure Login' },
              { icon: UserCheck, label: 'Role-Based Access' },
              { icon: Activity, label: 'Audit Logged' },
            ].map(badge => (
              <div
                key={badge.label}
                className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.07] border border-white/10"
              >
                <badge.icon className="w-5 h-5 text-white/65" />
                <span className="text-2xs font-medium text-white/55">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-12 bg-background">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
