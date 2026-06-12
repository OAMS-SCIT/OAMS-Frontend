'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-control border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.96] ${className}`}
    >
      {/* Both icons render on the server; CSS picks one — avoids any hydration branch on theme */}
      <Sun size={16} className="dark:hidden" />
      <Moon size={16} className="hidden dark:block" />
    </button>
  );
}
