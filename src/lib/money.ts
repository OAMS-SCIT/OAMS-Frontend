/** The organisation currency until the settings load (OAMS-307). */
export const DEFAULT_CURRENCY = 'LKR';

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'code',
        // Amounts are stored with 2 decimals, so always show 2, even for
        // currencies that normally have none (e.g. JPY).
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      // An unknown code would throw; fall back rather than break the page.
      f = formatterFor(DEFAULT_CURRENCY);
    }
    formatters.set(currency, f);
  }
  return f;
}

/**
 * Formats an amount in the organisation currency, e.g. `LKR 1,250.00`.
 * Intl separates the code and the number with a no-break space, so the pair
 * never wraps across lines. Prefer `useCurrency().format` in components.
 */
export function formatMoney(amount: number | string, currency: string = DEFAULT_CURRENCY): string {
  return formatterFor(currency).format(Number(amount));
}
