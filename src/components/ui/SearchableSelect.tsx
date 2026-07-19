'use client';

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { SelectOption } from './Select';

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Shown on the trigger when no value is selected. */
  placeholder?: string;
  /** Shown inside the search box. */
  searchPlaceholder?: string;
  /** Shown when no option matches the typed search text. */
  emptyMessage?: string;
  /** Accessible label for the trigger. */
  ariaLabel?: string;
  /** Extra classes for the trigger (e.g. width). */
  className?: string;
  disabled?: boolean;
}

const EMPTY = '__empty__';

/**
 * Drop-in searchable alternative to `Select` for long option lists. Built on
 * Radix Popover (for themed positioning/portal, matching DatePicker) + cmdk
 * (for filtering/keyboard nav), since Radix Select's own content can't host a
 * focusable text input. Filtering is a plain case-insensitive substring match
 * against each option's label so it works regardless of what `value` holds
 * (e.g. an id).
 */
export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matching results',
  ariaLabel,
  className,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((o) => o.value === value);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) setSearch('');
  };

  const select = (v: string) => {
    onValueChange(v);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          className={twMerge(
            'inline-flex items-center justify-between gap-2 rounded-control border border-input bg-input-background px-3 py-2 text-2sm text-foreground cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-60 disabled:cursor-not-allowed',
            !selected ? 'text-muted-foreground/70' : '',
            className,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[9999] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-pop motion-safe:animate-pop-in"
        >
          <Command
            className="flex flex-col"
            filter={(itemValue, searchTerm) => {
              const opt = options.find((o) => (o.value || EMPTY) === itemValue);
              const label = opt?.label ?? itemValue;
              return label.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0;
            }}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <Command.Input
                autoFocus
                value={search}
                onValueChange={setSearch}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-2sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="shrink-0 text-muted-foreground/70 transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Command.List className="max-h-60 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-4 text-center text-2sm text-muted-foreground">
                {emptyMessage}
              </Command.Empty>
              {options.map((opt) => (
                <Command.Item
                  key={opt.value || EMPTY}
                  value={opt.value || EMPTY}
                  disabled={opt.disabled}
                  onSelect={() => select(opt.value)}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 pr-8 text-2sm text-foreground outline-none transition-colors data-[selected=true]:bg-muted data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50"
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && (
                    <Check className="absolute right-2.5 h-3.5 w-3.5 text-primary" />
                  )}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
