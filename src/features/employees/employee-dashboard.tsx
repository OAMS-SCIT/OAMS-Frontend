'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Headphones,
  Laptop,
  Mail,
  Monitor,
  Phone,
  RefreshCw,
  Smartphone,
} from 'lucide-react';
import { ApiError, getMyAssignments } from '@/lib/api';
import type { EmployeeAssignmentItem } from '@/types';
import { useAuth } from '@/providers/auth-provider';
import { ConditionBadge } from '@/components/ui/StatusBadge';

/**
 * The employee portal landing page: the assets currently issued to the signed-in
 * user. Backed by GET /api/assignments/me, which scopes to the JWT user, so this
 * screen can only ever show the caller's own assets.
 */
export function EmployeeDashboard() {
  const { user } = useAuth();

  const [rows, setRows] = useState<EmployeeAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Version counter + deferred setState, matching the loaders in asset-detail:
  // setting state synchronously inside an effect body cascades renders.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoading(true);
          setError(null);
        }
        // isReturned=false → currently-assigned only.
        return getMyAssignments(false);
      })
      .then((result) => {
        if (!cancelled) setRows(result.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load your assets.');
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <div className="motion-safe:animate-fade-rise">
      {/* Welcome banner */}
      <div className="rounded-2xl p-6 mb-6 flex items-center justify-between text-white bg-[linear-gradient(135deg,#0C1B4D_0%,#1D4ED8_100%)] shadow-card">
        <div>
          <div className="font-bold mb-1 text-[22px] tracking-[-0.02em]">
            Hello, {user?.firstName ?? 'there'}! 👋
          </div>
          <div className="text-sm opacity-85">{today}</div>
        </div>
        <div className="text-right">
          <div className="text-4xl font-extrabold nums">{loading ? '—' : rows.length}</div>
          <div className="text-2sm opacity-75">
            {rows.length === 1 ? 'Asset assigned to you' : 'Assets assigned to you'}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Assets */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold mb-4 text-lg tracking-[-0.01em] text-foreground">
            My Current Assets
          </h2>

          {loading ? (
            <div className="rounded-2xl flex items-center justify-center py-16 text-2sm text-muted-foreground bg-card border border-border shadow-card">
              Loading your assets…
            </div>
          ) : error ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center bg-card border border-border shadow-card">
              <div className="rounded-2xl p-5 mb-4 bg-muted">
                <Monitor className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <div className="font-semibold mb-2 text-base text-foreground">
                Couldn&apos;t load your assets
              </div>
              <div className="text-2sm text-muted-foreground/80 max-w-[320px] mb-4">{error}</div>
              <button
                onClick={reload}
                className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl flex flex-col items-center justify-center py-16 text-center bg-card border border-border shadow-card">
              <div className="rounded-2xl p-5 mb-4 bg-muted">
                <Monitor className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <div className="font-semibold mb-2 text-base text-foreground">
                No assets currently assigned
              </div>
              <div className="text-2sm text-muted-foreground/80 max-w-[280px]">
                No assets are currently assigned to you. Contact your administrator if this is
                incorrect.
              </div>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
              {rows.map((row) => (
                <AssetCard key={row.id} row={row} />
              ))}
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="shrink-0 space-y-4 lg:w-[260px]">
          {/* TODO: hardcoded placeholders — move to a configurable settings source. */}
          <div className="rounded-2xl p-5 bg-card border border-border shadow-card">
            <h3 className="font-semibold mb-4 text-sm tracking-[-0.01em] text-foreground">
              IT Support Contact
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-control p-2 bg-secondary">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xs text-muted-foreground/80">Email</div>
                  <div className="text-2sm text-foreground truncate">it@company.com</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-control p-2 bg-secondary">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="text-2xs text-muted-foreground/80">Phone</div>
                  <div className="text-2sm text-foreground truncate">+1 (555) 999-0000</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-warning-surface border border-warning/30">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
              <h3 className="font-semibold text-sm text-warning-foreground">
                Asset Policy Reminder
              </h3>
            </div>
            <p className="text-xs leading-normal text-warning-foreground/90">
              Remember to return assets by the due date. Report any damage or loss to IT
              immediately. Handle all devices with care.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Asset card ───────────────────────────────────────────────────────────────

/**
 * Category name → device glyph. Matched loosely because category names are
 * admin-authored free text ("Laptops", "Laptop / Notebook", …). Returns the
 * element rather than a component reference so nothing is constructed during
 * a parent's render.
 */
function DeviceIcon({ category }: { category?: string | null }) {
  const name = (category ?? '').toLowerCase();
  const cls = 'w-10 h-10 text-primary';
  if (/laptop|notebook|macbook/.test(name)) return <Laptop className={cls} />;
  if (/phone|mobile|tablet/.test(name)) return <Smartphone className={cls} />;
  if (/head|audio|speaker/.test(name)) return <Headphones className={cls} />;
  return <Monitor className={cls} />;
}

function AssetCard({ row }: { row: EmployeeAssignmentItem }) {
  return (
    <div className="rounded-2xl flex flex-col overflow-hidden bg-card border border-border shadow-card transition-shadow hover:shadow-hover">
      <div className="flex items-center justify-center py-8 bg-muted/50 border-b border-border">
        <div className="rounded-2xl p-4 bg-secondary">
          <DeviceIcon category={row.asset.category?.name} />
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <h3
          className="font-bold text-[15px] leading-[1.3] tracking-[-0.01em] text-foreground"
          title={row.asset.name}
        >
          {row.asset.name}
        </h3>
        {row.asset.category && (
          <span className="inline-flex items-center self-start rounded-full px-2 py-0.5 mt-1 mb-3 text-2xs font-medium bg-info-surface text-info-foreground">
            {row.asset.category.name}
          </span>
        )}

        <div className="space-y-2 flex-1">
          <InfoItem label="Serial" value={row.asset.serialNumber} mono />
          <InfoItem label="Assigned Since" value={row.assignmentDate} />
          <InfoItem
            label="Expected Return"
            value={row.expectedReturnDate ?? 'No return date set'}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs font-medium uppercase tracking-[0.03em] text-muted-foreground/80">
              Condition
            </span>
            {row.conditionAtAssignment ? (
              <ConditionBadge condition={row.conditionAtAssignment} />
            ) : (
              <span className="text-xs text-muted-foreground/70">—</span>
            )}
          </div>
        </div>

        {/* Opens the employee asset detail view, which OAMS-250 delivers. */}
        <button
          disabled
          title="Asset details are coming soon"
          className="mt-4 w-full rounded-control py-2 text-2sm font-medium border border-primary/30 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          View Details
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-2xs font-medium uppercase tracking-[0.03em] text-muted-foreground/80 shrink-0">
        {label}
      </span>
      <span
        className={`text-xs text-foreground/70 truncate text-right ${mono ? 'font-mono' : ''}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
