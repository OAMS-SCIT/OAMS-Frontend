'use client';

import { useMemo, useState } from 'react';
import type { SortDirection } from '@/components/ui/SortableHeader';

export type SortValue = string | number | null | undefined;

export interface TableSort<K extends string> {
  key: K;
  direction: SortDirection;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Compares two cell values for sorting. Text is case-insensitive and
 * numeric-aware (AST-0002 before AST-0010), numbers compare numerically, and
 * YYYY-MM-DD dates sort correctly as text. Empty values are handled by the
 * caller (always last). The backend export uses the same rule (sort.util.ts).
 */
export function compareValues(a: Exclude<SortValue, null | undefined>, b: Exclude<SortValue, null | undefined>) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

const isEmpty = (v: SortValue) => v === null || v === undefined || v === '';

/**
 * Client-side, stable column sorting for a fully loaded table. Clicking a column
 * cycles ascending → descending → off (the rows' original order). Empty values
 * always sort last; ties keep the original order.
 */
export function useTableSort<T, K extends string>(rows: T[], accessors: Record<K, (row: T) => SortValue>) {
  const [sort, setSort] = useState<TableSort<K> | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const get = accessors[sort.key];
    const sign = sort.direction === 'asc' ? 1 : -1;
    return rows
      .map((row, index) => ({ row, index, value: get(row) }))
      .sort((x, y) => {
        const xe = isEmpty(x.value);
        const ye = isEmpty(y.value);
        if (xe || ye) return xe === ye ? x.index - y.index : xe ? 1 : -1;
        const diff = compareValues(x.value as string | number, y.value as string | number);
        return diff !== 0 ? sign * diff : x.index - y.index;
      })
      .map((e) => e.row);
    // accessors is a static map supplied by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  const toggle = (key: K) =>
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
    });

  return { sorted, sort, toggle, reset: () => setSort(null) };
}
