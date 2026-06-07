'use client';

import { ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Tag, Users, ClipboardList, UserCog, LogOut,
  Bell, Search, ChevronDown, Monitor, History,
} from 'lucide-react';
import { AppRole } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { Avatar } from '@/components/ui/Avatar';

interface LayoutProps {
  children: ReactNode;
  role: AppRole;
  onLogout?: () => void;
}

const adminNavItems = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/inventory', label: 'Asset Inventory', icon: Package },
  { path: '/admin/categories', label: 'Asset Categories', icon: Tag },
  { path: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
  { path: '/admin/users', label: 'User Management', icon: Users },
  { path: '/admin/designations', label: 'Designation Mgmt', icon: UserCog },
];

const employeeNavItems = [
  { path: '/employee/dashboard', label: 'My Assets', icon: Monitor },
  { path: '/employee/history', label: 'My History', icon: History },
];

export function AppLayout({ children, role, onLogout }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = role === 'admin' ? adminNavItems : employeeNavItems;
  const profilePath = role === 'admin' ? '/admin/profile' : '/employee/profile';

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  const fullName = user ? `${user.firstName} ${user.lastName}` : '…';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>
      {/* Sidebar */}
      <div className="flex flex-col shrink-0" style={{ width: 240, background: '#0F2460', color: '#fff' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: '#3B82F6' }}>
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white" style={{ fontSize: 16, letterSpacing: '-0.3px' }}>OAMS</span>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 1 }}>
              {role === 'admin' ? 'Admin Portal' : 'Employee Portal'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="w-full flex items-center gap-3 transition-colors relative"
                style={{
                  padding: '10px 20px',
                  color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                  background: active ? 'rgba(59,130,246,0.18)' : 'transparent',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                  borderLeft: active ? '3px solid #3B82F6' : '3px solid transparent',
                }}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <button
            onClick={() => router.push(profilePath)}
            className="w-full flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/5"
          >
            <Avatar user={user} size={34} />
            <div className="flex-1 text-left min-w-0">
              <div className="text-white font-medium truncate" style={{ fontSize: 13 }}>{fullName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{user?.role ?? ''}</div>
            </div>
          </button>
          <button
            onClick={() => (onLogout ? onLogout() : router.push('/login'))}
            className="w-full flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/5"
            style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="flex items-center gap-4 px-8 shrink-0" style={{ height: 64, background: '#fff', borderBottom: '1px solid #E2E8F0' }}>
          <div className="flex-1 min-w-0">
            <BreadcrumbDisplay pathname={pathname} role={role} />
          </div>

          <div className="relative" style={{ width: 320 }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Search assets, users, serial numbers..."
              className="w-full rounded-lg border pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: '#CBD5E1', background: '#F8FAFC', fontSize: 13 }}
            />
          </div>

          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="w-5 h-5" style={{ color: '#64748B' }} />
            <span className="absolute top-1 right-1 rounded-full" style={{ width: 8, height: 8, background: '#EF4444' }} />
          </button>

          <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors">
            <Avatar user={user} size={32} />
            <span className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{user?.firstName ?? '…'}</span>
            <ChevronDown className="w-4 h-4" style={{ color: '#64748B' }} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ padding: 32 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function BreadcrumbDisplay({ pathname, role }: { pathname: string; role: AppRole }) {
  const segments: Record<string, string[]> = {
    '/admin/dashboard': ['Dashboard'],
    '/admin/inventory': ['Asset Inventory'],
    '/admin/categories': ['Asset Categories'],
    '/admin/assignments': ['Active Assignments'],
    '/admin/users': ['User Management'],
    '/admin/designations': ['Designation Management'],
    '/admin/profile': ['Personal Profile'],
    '/employee/dashboard': ['My Assets'],
    '/employee/history': ['My Asset History'],
    '/employee/profile': ['My Profile'],
  };
  const base = pathname.startsWith('/admin/inventory/') ? ['Asset Inventory', 'Asset Detail'] : segments[pathname];
  if (!base) return <span style={{ fontSize: 13, color: '#64748B' }}>OAMS</span>;
  return (
    <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
      <span style={{ color: '#64748B' }}>OAMS</span>
      {base.map((seg, i) => (
        <span key={i} className="flex items-center gap-2">
          <span style={{ color: '#CBD5E1' }}>/</span>
          <span style={{ color: i === base.length - 1 ? '#1E293B' : '#64748B', fontWeight: i === base.length - 1 ? 600 : 400 }}>
            {seg}
          </span>
        </span>
      ))}
    </div>
  );
}
