'use client';

import * as RSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  /** Shown on the trigger when no value is selected. */
  placeholder?: string;
  /** Accessible label for the trigger. */
  ariaLabel?: string;
  /** Extra classes for the trigger (e.g. width). */
  className?: string;
  disabled?: boolean;
}

// Radix Select reserves the empty string and throws on <Item value="">.
// Map our external '' (used by "All" filter options) to a sentinel internally.
const EMPTY = '__empty__';

/**
 * Themed select built on Radix so the open list matches the app's dark/light
 * theme (native <option> popups can't be themed reliably). Drop-in for the
 * common value/onChange/options shape.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  className,
  disabled,
}: SelectProps) {
  const isEmpty = value === '';

  return (
    <RSelect.Root
      value={isEmpty ? EMPTY : value}
      onValueChange={(v) => onValueChange(v === EMPTY ? '' : v)}
      disabled={disabled}
    >
      <RSelect.Trigger
        aria-label={ariaLabel ?? placeholder}
        className={twMerge(
          'inline-flex items-center justify-between gap-2 rounded-control border border-input bg-input-background px-3 py-2 text-2sm text-foreground cursor-pointer transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-60 disabled:cursor-not-allowed',
          isEmpty ? 'text-muted-foreground/70' : '',
          className,
        )}
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/70" />
        </RSelect.Icon>
      </RSelect.Trigger>

      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={6}
          className="z-[9999] min-w-[var(--radix-select-trigger-width)] max-h-[var(--radix-select-content-available-height)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-pop motion-safe:animate-pop-in"
        >
          <RSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RSelect.Item
                key={opt.value || EMPTY}
                value={opt.value || EMPTY}
                disabled={opt.disabled}
                className="relative flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 pr-8 text-2sm text-foreground outline-none transition-colors data-[highlighted]:bg-muted data-[state=checked]:font-medium data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
              >
                <RSelect.ItemText>{opt.label}</RSelect.ItemText>
                <RSelect.ItemIndicator className="absolute right-2.5 inline-flex">
                  <Check className="h-3.5 w-3.5 text-primary" />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
