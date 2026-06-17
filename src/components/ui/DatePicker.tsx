'use client';

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format, parseISO, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, addMonths, subMonths, isSameDay, isSameMonth, isToday,
} from 'date-fns';
import { twMerge } from 'tailwind-merge';

interface DatePickerProps {
  /** ISO date string 'yyyy-MM-dd' or '' (same contract as a native date input). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Extra classes for the trigger (e.g. w-full). */
  className?: string;
  disabled?: boolean;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseValue(value: string): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

/**
 * Themed date picker: a token-styled trigger + a Radix Popover calendar that
 * matches the app (popover surface, primary-colored selection, pop-in anim).
 * Drop-in for a native <input type="date"> — value is 'yyyy-MM-dd' or ''.
 */
export function DatePicker({
  value, onChange, placeholder = 'mm/dd/yyyy', ariaLabel, className, disabled,
}: DatePickerProps) {
  const selected = parseValue(value);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(selected ?? new Date());

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (o) setViewMonth(selected ?? new Date());
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(viewMonth)),
    end: endOfWeek(endOfMonth(viewMonth)),
  });

  const pick = (d: Date) => {
    onChange(format(d, 'yyyy-MM-dd'));
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? placeholder}
          className={twMerge(
            'inline-flex items-center justify-between gap-2 rounded-control border border-input bg-input-background px-3 py-2 text-2sm transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-60 disabled:cursor-not-allowed',
            selected ? 'text-foreground' : 'text-muted-foreground/70',
            className,
          )}
        >
          <span>{selected ? format(selected, 'MM/dd/yyyy') : placeholder}</span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground/70" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[9999] w-[272px] rounded-xl border border-border bg-popover text-popover-foreground p-3 shadow-pop motion-safe:animate-pop-in"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth((m) => subMonths(m, 1))}
              aria-label="Previous month"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-2sm font-semibold text-foreground">{format(viewMonth, 'MMMM yyyy')}</div>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-center text-2xs font-medium text-muted-foreground/70">{w}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d) => {
              const isSel = selected != null && isSameDay(d, selected);
              const inMonth = isSameMonth(d, viewMonth);
              const today = isToday(d);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => pick(d)}
                  className={twMerge(
                    'inline-flex h-8 w-8 items-center justify-center rounded-md text-2sm transition-colors hover:bg-muted',
                    inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                    today && !isSel ? 'ring-1 ring-inset ring-primary/50' : '',
                    isSel ? 'bg-primary text-primary-foreground hover:bg-primary' : '',
                  )}
                >
                  {format(d, 'd')}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="text-2xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => pick(new Date())}
              className="text-2xs font-medium text-primary hover:underline"
            >
              Today
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
