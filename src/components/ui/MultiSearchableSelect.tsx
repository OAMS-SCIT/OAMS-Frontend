'use client';

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import type { SelectOption } from './Select';

interface MultiSearchableSelectProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  options: SelectOption[];
  /** Shown on the trigger when nothing is selected. */
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

/**
 * Multi-select sibling of `SearchableSelect` (same Radix Popover + cmdk build).
 * Items toggle on select and the list stays open, so several can be ticked in
 * one go. The trigger shows the placeholder, the single chosen label, or
 * "N selected".
 */
export function MultiSearchableSelect({
  values,
  onValuesChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyMessage = 'No matching results',
  ariaLabel,
  className,
  disabled,
}: MultiSearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = new Set(values);
  const triggerLabel =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? '1 selected')
        : `${values.length} selected`;

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) setSearch('');
  };

  const toggle = (v: string) =>
    onValuesChange(selected.has(v) ? values.filter((x) => x !== v) : [...values, v]);

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          className={twMerge(
            'inline-flex items-center justify-between gap-2 rounded-control border border-input bg-input-background px-3 py-2 text-2sm text-foreground cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-60 disabled:cursor-not-allowed',
            values.length === 0 ? 'text-muted-foreground/70' : '',
            className,
          )}
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[9999] w-[var(--radix-popover-trigger-width)] min-w-[220px] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-pop motion-safe:animate-pop-in"
        >
          <Command
            className="flex flex-col"
            filter={(itemValue, searchTerm) => {
              const label = options.find((o) => o.value === itemValue)?.label ?? itemValue;
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
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  onSelect={() => toggle(opt.value)}
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-2sm text-foreground outline-none transition-colors data-[selected=true]:bg-muted data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50"
                >
                  <span
                    className={twMerge(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input',
                      selected.has(opt.value) ? 'border-primary bg-primary text-primary-foreground' : '',
                    )}
                  >
                    {selected.has(opt.value) && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{opt.label}</span>
                </Command.Item>
              ))}
            </Command.List>
            {values.length > 0 && (
              <button
                type="button"
                onClick={() => onValuesChange([])}
                className="border-t border-border px-3 py-2 text-left text-2sm font-medium text-primary transition-colors hover:bg-muted"
              >
                Clear selection ({values.length})
              </button>
            )}
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
