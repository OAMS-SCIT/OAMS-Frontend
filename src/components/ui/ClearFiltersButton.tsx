'use client';

import { FilterX } from 'lucide-react';

interface ClearFiltersButtonProps {
  onClear: () => void;
  disabled?: boolean;
  className?: string;
}

export function ClearFiltersButton({ onClear, disabled = false, className = '' }: ClearFiltersButtonProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-control border border-border px-3 py-2 text-2sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap ${className}`}
    >
      <FilterX className="w-3.5 h-3.5" />
      Clear Filters
    </button>
  );
}
