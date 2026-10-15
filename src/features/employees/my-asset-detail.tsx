'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Monitor, RefreshCw, ZoomIn } from 'lucide-react';
import { ApiError, getMyAsset } from '@/lib/api';
import { warrantyStyle } from '@/lib/warranty';
import type { MyAssetDetail as MyAssetDetailType } from '@/types';
import { StatusBadge, ConditionBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { InfoRow } from '@/components/ui/InfoRow';
import { ImageLightbox } from '@/components/overlays/ImageLightbox';
import { AssetDeclarationDrawer } from '@/components/overlays/AssetDeclarationDrawer';

/**
 * The employee's read-only view of one of their assets. Backed by
 * GET /api/me/assets/:assetId, which only answers for the caller's own
 * currently assigned assets (anything else is a 404). There are no edit or
 * admin actions here by design.
 */
export function MyAssetDetail() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  // The My Assets list passes its own query string as ?from= so "Back" restores
  // the same search and filters. It is only ever used as a query string on the
  // fixed /employee/assets path, so it can't send the user anywhere else.
  const backHref = (() => {
    const qs = new URLSearchParams(searchParams.get('from') ?? '').toString();
    return qs ? `/employee/assets?${qs}` : '/employee/assets';
  })();

  const [detail, setDetail] = useState<MyAssetDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [declarationOpen, setDeclarationOpen] = useState(false);

  // Version counter + deferred setState, matching the other employee loaders.
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) {
          setLoading(true);
          setError(null);
        }
        return getMyAsset(params.id);
      })
      .then((result) => {
        if (cancelled) return;
        setDetail(result);
        setActiveImageIndex(0);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetail(null);
        setError({
          message: err instanceof ApiError ? err.message : 'Failed to load this asset.',
          notFound: err instanceof ApiError && err.status === 404,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, version]);

  const backLink = (
    <Link
      href={backHref}
      className="inline-flex items-center gap-1.5 mb-5 text-2sm text-muted-foreground transition-colors hover:text-primary"
    >
      <ArrowLeft className="w-4 h-4" /> Back to My Assets
    </Link>
  );

  // Rendered in every state below, so the reload that follows a confirmation
  // doesn't unmount the drawer before its close animation finishes.
  const declarationDrawer = declarationOpen && params.id ? (
    <AssetDeclarationDrawer
      assetId={params.id}
      assignmentType={detail?.assignmentType}
      onClose={() => setDeclarationOpen(false)}
      onConfirmed={reload}
    />
  ) : null;

  if (loading) {
    return (
      <div>
        {backLink}
        <div className="rounded-2xl flex items-center justify-center py-16 text-2sm text-muted-foreground bg-card border border-border shadow-card">
          Loading asset…
        </div>
        {declarationDrawer}
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div>
        {backLink}
        <div className="rounded-2xl bg-card border border-border shadow-card">
          {error?.notFound ? (
            <EmptyState
              icon="myassets"
              title="Asset not found"
              subtitle="This asset isn't currently assigned to you, or it no longer exists."
            />
          ) : (
            <EmptyState
              icon="myassets"
              title="Couldn't load this asset"
              subtitle={error?.message ?? 'Failed to load this asset.'}
              action={
                <button
                  onClick={reload}
                  className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              }
            />
          )}
        </div>
        {declarationDrawer}
      </div>
    );
  }

  const { asset } = detail;
  const images = asset.images;
  const activeIdx = Math.min(activeImageIndex, Math.max(0, images.length - 1));

  return (
    <div className="motion-safe:animate-fade-rise">
      {backLink}

      {/* Hero */}
      <div className="rounded-2xl p-6 mb-6 bg-card border border-border shadow-card">
        <div className="flex flex-col gap-6 sm:flex-row">
          {/* Image gallery (display-only) */}
          <div className="shrink-0 w-full sm:w-60">
            {images.length > 0 ? (
              <>
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block rounded-xl overflow-hidden w-full h-[190px] p-0 border border-border bg-muted cursor-zoom-in"
                  title="Click to enlarge"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[activeIdx].url} alt={asset.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(15,23,42,0.28)]">
                    <span className="flex items-center justify-center rounded-full w-10 h-10 bg-white/90">
                      <ZoomIn className="w-5 h-5 text-[#1E293B]" />
                    </span>
                  </div>
                </button>
                {images.length > 1 && (
                  <div
                    className="grid gap-2 mt-2"
                    style={{ gridTemplateColumns: `repeat(${images.length}, 1fr)` }}
                  >
                    {images.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setActiveImageIndex(i)}
                        className={`rounded-control overflow-hidden transition-all w-full h-[46px] p-0 ${
                          i === activeIdx ? 'border-2 border-primary opacity-100' : 'border border-border opacity-85 hover:opacity-100'
                        }`}
                        title={`Image ${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl flex flex-col items-center justify-center w-full h-[190px] border border-dashed border-input bg-muted/50">
                <Monitor className="w-10 h-10 text-muted-foreground/40" />
                <span className="text-xs text-muted-foreground/80 mt-2">No images</span>
              </div>
            )}
          </div>

          {/* Headline */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-bold mb-1 text-[22px] tracking-[-0.02em] text-foreground">{asset.name}</h1>
                <div className="text-2sm text-muted-foreground/80 font-mono">{asset.displayId}</div>
                {asset.description && (
                  <div className="text-2sm text-muted-foreground mt-1">{asset.description}</div>
                )}
              </div>
              <StatusBadge status={asset.status} size="lg" />
            </div>

            <div className="flex flex-wrap gap-6 mt-4">
              <HeroFact label="Category" value={asset.category?.name ?? '—'} />
              <HeroFact label="Location" value={asset.location ?? '—'} />
              <div>
                <div className="text-2xs text-muted-foreground/80 mb-0.5">CONDITION</div>
                <ConditionBadge condition={asset.condition} />
              </div>
              <HeroFact label="Assigned Since" value={detail.assignmentDate} />
            </div>

            <ConfirmationBanner detail={detail} onReview={() => setDeclarationOpen(true)} />
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl p-5 bg-card border border-border shadow-card">
          <h3 className="font-semibold mb-3 text-sm tracking-[-0.01em] text-foreground">Asset Information</h3>
          <InfoRow label="Asset Name" value={asset.name} />
          <InfoRow label="Asset ID" value={asset.displayId} mono />
          <InfoRow label="Category" value={asset.category?.name} />
          <InfoRow label="Location" value={asset.location} />
          <InfoRow label="Condition" value={<ConditionBadge condition={asset.condition} />} />
          <InfoRow label="Assigned Since" value={detail.assignmentDate} />
          <InfoRow label="Expected Return" value={detail.expectedReturnDate ?? 'No return date set'} />
          <InfoRow
            label="Warranty Expiry"
            value={
              asset.warrantyExpiryDate ? (
                <span className={warrantyStyle(asset.warrantyExpiryDate)}>{asset.warrantyExpiryDate}</span>
              ) : undefined
            }
          />
        </div>

        <div className="rounded-2xl p-5 bg-card border border-border shadow-card">
          <h3 className="font-semibold mb-3 text-sm tracking-[-0.01em] text-foreground">Core Specifications</h3>
          <InfoRow label="Brand" value={asset.brand} />
          <InfoRow label="Model" value={asset.model} />
          <InfoRow label="Serial Number" value={asset.serialNumber} mono />
          {asset.customAttributes.length > 0 && (
            <>
              <div className="mt-3 mb-2 micro-label font-semibold tracking-[0.04em]">Category Attributes</div>
              {asset.customAttributes.map((attr) => (
                <InfoRow key={attr.label} label={attr.label} value={attr.value || undefined} />
              ))}
            </>
          )}
        </div>
      </div>

      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={images}
          index={activeIdx}
          onIndexChange={setActiveImageIndex}
          onClose={() => setLightboxOpen(false)}
          title={asset.name}
        />
      )}
      {declarationDrawer}
    </div>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xs text-muted-foreground/80 mb-0.5">{label.toUpperCase()}</div>
      <div className="text-2sm text-foreground/80">{value}</div>
    </div>
  );
}

/**
 * The handover confirmation state for this asset: a call to action while the
 * receipt (OAMS-251) or the handback after repair (OAMS-252) is Pending, then
 * the recorded outcome.
 */
function ConfirmationBanner({ detail, onReview }: { detail: MyAssetDetailType; onReview: () => void }) {
  const handback = detail.assignmentType === 'Handback';
  const when = detail.confirmedAt
    ? new Date(detail.confirmedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  if (detail.confirmationStatus === 'Pending') {
    return (
      <div className="flex flex-wrap items-center gap-3 mt-5 rounded-control px-3 py-2.5 text-2sm bg-warning-surface text-warning-foreground border border-warning/30">
        <Clock className="w-4 h-4 shrink-0" />
        <span className="flex-1 min-w-[200px]">
          {handback
            ? 'This asset is back from repair. Please review its condition and confirm.'
            : 'Please review this asset and confirm you have received it.'}
        </span>
        <button
          onClick={onReview}
          className="rounded-control px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
        >
          {handback ? 'Review & Confirm' : 'Review & Accept'}
        </button>
      </div>
    );
  }

  if (detail.confirmationStatus === 'Rejected') {
    return (
      <div className="flex items-start gap-2 mt-5 rounded-control px-3 py-2.5 text-2sm bg-danger-surface text-danger-foreground border border-danger/30">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Issue reported{when ? ` on ${when}` : ''}: {detail.confirmationNote ?? 'No details given.'}
          <span className="block text-xs opacity-80 mt-0.5">Your administrator will follow up.</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-5 rounded-control px-3 py-2 text-2sm bg-success-surface text-success-foreground border border-success/30">
      <CheckCircle2 className="w-4 h-4 shrink-0" />
      {handback ? 'Handback confirmed' : 'Receipt confirmed'}{when ? ` on ${when}` : ''}.
    </div>
  );
}
