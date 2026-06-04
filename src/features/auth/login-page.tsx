'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor, Shield, UserCheck, Activity, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { AppRole } from '@/types';

interface Props {
  onLogin: (role: AppRole) => void;
}

export function LoginPage({ onLogin }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (role: AppRole) => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    onLogin(role);
    router.push(role === 'admin' ? '/admin/dashboard' : '/employee/dashboard');
  };

  return (
    <div className="flex h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left Panel - Navy */}
      <div className="flex flex-col" style={{ width: '55%', background: 'linear-gradient(160deg, #0F2460 0%, #1E3A8A 60%, #2563EB 100%)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-10">
          <div className="flex items-center justify-center rounded-xl" style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.15)' }}>
            <Monitor className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-white" style={{ fontSize: 22, letterSpacing: '-0.5px' }}>OAMS</span>
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-center px-12">
          {/* Illustration */}
          <div className="relative mb-10" style={{ width: 280, height: 200 }}>
            {/* Simplified isometric illustration using CSS */}
            <div className="absolute" style={{ left: 40, top: 20, width: 100, height: 70, background: 'rgba(255,255,255,0.08)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ margin: 12, height: 8, background: 'rgba(255,255,255,0.3)', borderRadius: 4, width: '70%' }} />
              <div style={{ margin: '8px 12px', height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 4, width: '50%' }} />
              <div style={{ margin: '6px 12px', height: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 4, width: '60%' }} />
            </div>
            <div className="absolute" style={{ right: 20, top: 50, width: 80, height: 55, background: 'rgba(59,130,246,0.25)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.4)' }}>
              <div style={{ margin: 10, height: 6, background: 'rgba(255,255,255,0.3)', borderRadius: 3, width: '60%' }} />
              <div style={{ margin: '6px 10px', height: 5, background: 'rgba(255,255,255,0.15)', borderRadius: 3, width: '40%' }} />
            </div>
            <div className="absolute" style={{ left: 20, bottom: 20, width: 60, height: 60, background: 'rgba(16,185,129,0.2)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Monitor className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.5)' }} />
            </div>
            <div className="absolute" style={{ right: 40, bottom: 10, width: 50, height: 50, background: 'rgba(139,92,246,0.2)', borderRadius: 10, border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserCheck className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
            {/* Connecting lines */}
            <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.2 }}>
              <line x1="90" y1="55" x2="175" y2="77" stroke="white" strokeWidth="1" strokeDasharray="4 3" />
              <line x1="50" y1="55" x2="45" y2="130" stroke="white" strokeWidth="1" strokeDasharray="4 3" />
            </svg>
          </div>

          <h2 className="font-bold text-white text-center mb-3" style={{ fontSize: 26 }}>
            Manage every asset.<br />Track every assignment.
          </h2>
          <p className="text-center" style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 320 }}>
            One unified platform for your entire office asset lifecycle.
          </p>

          {/* Trust badges */}
          <div className="flex gap-4 mt-10">
            {[
              { icon: Shield, label: 'Secure Login' },
              { icon: UserCheck, label: 'Role-Based Access' },
              { icon: Activity, label: 'Audit Logged' },
            ].map(badge => (
              <div key={badge.label} className="flex flex-col items-center gap-2 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <badge.icon className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.65)' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - White */}
      <div className="flex-1 flex flex-col items-center justify-center px-12" style={{ background: '#fff' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 className="font-bold mb-1" style={{ fontSize: 26, color: '#1E293B' }}>Welcome Back</h1>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 28 }}>Sign in to OAMS Admin</p>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg border pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2"
                  style={{ borderColor: '#CBD5E1', fontSize: 14 }}
                  placeholder="admin@company.com" />
              </div>
            </div>
            <div>
              <label className="block mb-1.5" style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg border pl-9 pr-10 py-2.5 focus:outline-none focus:ring-2"
                  style={{ borderColor: '#CBD5E1', fontSize: 14 }}
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <button style={{ fontSize: 12, color: '#3B82F6' }} className="hover:underline">Forgot Password?</button>
              </div>
            </div>

            {error && <p style={{ fontSize: 13, color: '#EF4444' }}>{error}</p>}

            <button onClick={() => handleLogin('admin')}
              className="w-full rounded-lg py-3 font-bold text-white hover:opacity-90 transition-colors"
              style={{ fontSize: 15, background: '#1E3A8A' }}>
              Login as Admin
            </button>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
              <span style={{ fontSize: 12, color: '#94A3B8' }}>or</span>
              <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
            </div>

            {/* Preview Employee */}
            <button onClick={() => handleLogin('employee')}
              className="w-full flex items-center justify-center gap-2 rounded-lg border py-2.5 font-medium hover:bg-gray-50 transition-colors"
              style={{ fontSize: 14, color: '#475569', borderColor: '#E2E8F0' }}>
              Preview Employee View <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-center mt-8" style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
            Only authorized administrators and registered employees may access this system.
          </p>

          <p className="text-center mt-3 rounded-lg py-2" style={{ fontSize: 11, color: '#3B82F6', background: '#EFF6FF' }}>
            Preview Mode — Demo credentials accepted
          </p>
        </div>
      </div>
    </div>
  );
}
