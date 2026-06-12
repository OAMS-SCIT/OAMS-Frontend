'use client';

import { Monitor, Shield, UserCheck, Activity } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

/** Shared split layout for login, forgot-password, and reset-password screens. */
export function AuthShell({ children }: Props) {
  return (
    <div className="flex h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left Panel - Navy */}
      <div
        className="flex flex-col"
        style={{
          width: '55%',
          background: 'linear-gradient(160deg, #0F2460 0%, #1E3A8A 60%, #2563EB 100%)',
        }}
      >
        <div className="flex items-center gap-3 p-10">
          <div
            className="flex items-center justify-center rounded-xl"
            style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)' }}
          >
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-white" style={{ fontSize: 22, letterSpacing: '-0.5px' }}>
            OAMS
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-12">
          <div className="relative mb-10" style={{ width: 280, height: 200 }}>
            <div
              className="absolute"
              style={{
                left: 40,
                top: 20,
                width: 100,
                height: 70,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div
                style={{
                  margin: 12,
                  height: 8,
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: 4,
                  width: '70%',
                }}
              />
              <div
                style={{
                  margin: '8px 12px',
                  height: 6,
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 4,
                  width: '50%',
                }}
              />
              <div
                style={{
                  margin: '6px 12px',
                  height: 6,
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 4,
                  width: '60%',
                }}
              />
            </div>
            <div
              className="absolute"
              style={{
                right: 20,
                top: 50,
                width: 80,
                height: 55,
                background: 'rgba(59,130,246,0.25)',
                borderRadius: 10,
                border: '1px solid rgba(59,130,246,0.4)',
              }}
            >
              <div
                style={{
                  margin: 10,
                  height: 6,
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: 3,
                  width: '60%',
                }}
              />
              <div
                style={{
                  margin: '6px 10px',
                  height: 5,
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: 3,
                  width: '40%',
                }}
              />
            </div>
            <div
              className="absolute"
              style={{
                left: 20,
                bottom: 20,
                width: 60,
                height: 60,
                background: 'rgba(16,185,129,0.2)',
                borderRadius: 10,
                border: '1px solid rgba(16,185,129,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Monitor className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.5)' }} />
            </div>
            <div
              className="absolute"
              style={{
                right: 40,
                bottom: 10,
                width: 50,
                height: 50,
                background: 'rgba(139,92,246,0.2)',
                borderRadius: 10,
                border: '1px solid rgba(139,92,246,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserCheck className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.2 }}>
              <line x1="90" y1="55" x2="175" y2="77" stroke="white" strokeWidth="1" strokeDasharray="4 3" />
              <line x1="50" y1="55" x2="45" y2="130" stroke="white" strokeWidth="1" strokeDasharray="4 3" />
            </svg>
          </div>

          <h2 className="font-bold text-white text-center mb-3" style={{ fontSize: 26 }}>
            Manage every asset.
            <br />
            Track every assignment.
          </h2>
          <p className="text-center" style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 320 }}>
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
                className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <badge.icon className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.65)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - White */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-12"
        style={{ background: '#fff' }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>{children}</div>
      </div>
    </div>
  );
}
