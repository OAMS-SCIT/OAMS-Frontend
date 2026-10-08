'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

interface SortableHeaderProps {
  label: string;
  /** Whether the table is currently sorted by this column. */
  active: boolean;
  direction?: SortDirection;
  onClick: () => void;
  align?: 'left' | 'right';
}

/**
 * Clickable table column header for client-side sorting. Shows a neutral
 * up/down icon until active, then an arrow for the current direction, and
 * reports the state to assistive tech through `aria-sort`.
 */
export function SortableHeader({ label, active, direction, onClick, align = 'left' }: SortableHeaderProps) {
  const Icon = !active ? ArrowUpDown : direction === 'desc' ? ArrowDown : ArrowUp;
  return (
    <th
      aria-sort={active ? (direction === 'desc' ? 'descending' : 'ascending') : 'none'}
      className={`px-4 py-2.5 micro-label whitespace-nowrap ${align === 'right' ? 'text-right' : 'text-left'}`}
    >
      <button
        type="button"
        onClick={onClick}
        title={`Sort by ${label}`}
        className={`inline-flex items-center gap-1 uppercase tracking-[inherit] transition-colors hover:text-foreground ${
          align === 'right' ? 'flex-row-reverse' : ''
        } ${active ? 'text-foreground' : ''}`}
      >
        {label}
        <Icon className={`w-3 h-3 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground/50'}`} />
      </button>
    </th>
  );
}
