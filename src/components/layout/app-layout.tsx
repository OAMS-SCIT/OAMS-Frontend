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
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="flex flex-col shrink-0 w-60 bg-linear-to-b from-sidebar-from to-sidebar-to text-sidebar-foreground">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center justify-center rounded-control w-9 h-9 bg-linear-to-br from-[#3B82F6] to-[#1D4ED8] shadow-[0_2px_8px_rgba(29,78,216,0.4)]">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-[-0.02em]">OAMS</span>
            <div className="text-[10px] text-white/45 tracking-[0.05em] uppercase mt-px">
              {role === 'admin' ? 'Admin Portal' : 'Employee Portal'}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center gap-3 rounded-control px-3.5 py-2.5 text-2sm transition-colors relative ${
                  active
                    ? 'bg-white/10 text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm'
                    : 'text-white/55 font-normal hover:text-white/90 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border">
          <button
            onClick={() => router.push(profilePath)}
            className="w-full flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/5"
          >
            <Avatar user={user} size={34} />
            <div className="flex-1 text-left min-w-0">
              <div className="text-white font-medium truncate text-2sm">{fullName}</div>
              <div className="text-2xs text-white/45">{user?.role ?? ''}</div>
            </div>
          </button>
          <button
            onClick={() => (onLogout ? onLogout() : router.push('/login'))}
            className="w-full flex items-center gap-3 px-5 py-3 transition-colors text-2sm text-white/45 hover:bg-white/5 hover:text-white/70"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="flex items-center gap-4 px-8 shrink-0 h-16 bg-card border-b border-border">
          <div className="flex-1 min-w-0">
            <BreadcrumbDisplay pathname={pathname} role={role} />
          </div>

          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
            <input
              type="text"
              placeholder="Search assets, users, serial numbers..."
              className="w-full rounded-control border border-input bg-muted pl-9 pr-3 py-2 text-2sm placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring focus:bg-input-background"
            />
          </div>

          <ThemeToggle />

          <button className="relative p-2 rounded-control hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 rounded-full w-2 h-2 bg-danger" />
          </button>

          <button className="flex items-center gap-2 rounded-control px-2 py-1 hover:bg-muted transition-colors">
            <Avatar user={user} size={32} />
            <span className="font-medium text-2sm text-foreground">{user?.firstName ?? '…'}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
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
  if (!base) return <span className="text-2sm text-muted-foreground">OAMS</span>;
  return (
    <div className="flex items-center gap-2 text-2sm">
      <span className="text-muted-foreground">OAMS</span>
      {base.map((seg, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="text-muted-foreground/50">/</span>
          <span className={i === base.length - 1 ? 'text-foreground font-semibold' : 'text-muted-foreground font-normal'}>
            {seg}
          </span>
        </span>
      ))}
    </div>
  );
}
