'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSettings } from '@/lib/api';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { useAuth } from '@/providers/auth-provider';

interface CurrencyContextValue {
  /** ISO 4217 code every amount is shown in (organisation setting). */
  currency: string;
  /** Formats an amount in the organisation currency, e.g. `LKR 1,250.00`. */
  format: (amount: number | string) => string;
  /** Applies a just-saved currency app-wide, without a reload. */
  setCurrency: (currency: string) => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/**
 * Loads the organisation currency from GET /settings once the user is signed
 * in (OAMS-307). Until then, or if the request fails, amounts use the default
 * (LKR), so the UI never falls back to a hard-coded "$".
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let active = true;
    getSettings()
      .then((s) => {
        if (active && s?.currency) setCurrencyState(s.currency);
      })
      .catch(() => {
        // Keep the default; money still renders.
      });
    return () => {
      active = false;
    };
  }, [status]);

  const setCurrency = useCallback((code: string) => setCurrencyState(code), []);

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, format: (amount) => formatMoney(amount, currency), setCurrency }),
    [currency, setCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}
