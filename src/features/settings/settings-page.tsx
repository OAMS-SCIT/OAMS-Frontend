'use client';

import { useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import type { SelectOption } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog';
import { ApiError, updateSettings } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { useCurrency } from '@/providers/currency-provider';

const SAMPLE_AMOUNT = 1250;

/** Every ISO 4217 currency the browser knows, labelled e.g. "LKR - Sri Lankan Rupee". */
function currencyOptions(): SelectOption[] {
  const names = new Intl.DisplayNames(['en'], { type: 'currency' });
  return Intl.supportedValuesOf('currency').map((code) => {
    const name = names.of(code);
    return { value: code, label: name && name !== code ? `${code} - ${name}` : code };
  });
}

/**
 * Admin Settings (OAMS-308). Today it holds the organisation currency that every
 * money amount is shown in. Changing it relabels existing amounts; it never
 * converts them, so the change is confirmed first.
 */
export function SettingsPage() {
  const { currency, setCurrency } = useCurrency();
  const options = useMemo(() => currencyOptions(), []);
  // The admin's unsaved pick; null means "no edit yet", so the field follows the
  // saved currency (which loads asynchronously) until the admin picks another.
  const [draft, setDraft] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = draft ?? currency;
  const dirty = selected !== currency;

  const save = async () => {
    setConfirming(false);
    setSaving(true);
    try {
      const saved = await updateSettings({ currency: selected });
      setCurrency(saved.currency);
      setDraft(null);
      toast.success(`Currency changed to ${saved.currency}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save the currency');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="motion-safe:animate-fade-rise">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-2xl tracking-[-0.02em] text-foreground">Settings</h1>
        <p className="text-2sm text-muted-foreground mt-1">Organisation-wide settings for OAMS.</p>
      </div>

      <div className="rounded-lg p-5 bg-card border border-border shadow-card max-w-2xl">
        <h2 className="font-semibold text-base text-foreground">Organisation</h2>
        <p className="text-2sm text-muted-foreground mt-1">
          The currency every price and cost is shown in, across the app and the report exports.
        </p>

        <div className="mt-5 w-full sm:w-96">
          <div className="micro-label mb-1.5">Currency</div>
          <SearchableSelect
            value={selected}
            onValueChange={(v) => v && setDraft(v)}
            options={options}
            ariaLabel="Currency"
            placeholder="Select a currency"
            searchPlaceholder="Search by code or name…"
            emptyMessage="No currency found"
            className="w-full"
            disabled={saving}
          />
          <p className="text-2sm text-muted-foreground mt-2">
            Amounts will appear as{' '}
            <span className="font-semibold text-foreground nums">{formatMoney(SAMPLE_AMOUNT, selected)}</span>
          </p>
        </div>

        <p className="text-2sm text-muted-foreground mt-4 rounded-control bg-muted/60 border border-border px-3 py-2">
          Changing the currency does <span className="font-semibold text-foreground">not convert</span> existing
          amounts. They keep their numbers and are shown in the new currency.
        </p>

        <div className="flex justify-end gap-3 mt-5">
          {dirty && (
            <button
              type="button"
              onClick={() => setDraft(null)}
              disabled={saving}
              className="rounded-control border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-50"
            >
              Discard
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!dirty || saving}
            className="flex items-center gap-2 rounded-control px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Change currency to ${selected}?`}
          description={`Existing amounts are not converted. They will keep their numbers and be shown in ${selected} (e.g. ${formatMoney(SAMPLE_AMOUNT, currency)} becomes ${formatMoney(SAMPLE_AMOUNT, selected)}).`}
          confirmLabel="Change Currency"
          onConfirm={save}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
