'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ImageIcon, X } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { ImageLightbox } from './ImageLightbox';
import { ApiError, confirmMyAssignment, getMyAsset, getMyConditionImages } from '@/lib/api';
import type { ConditionImageItem, MyAssetDetail } from '@/types';
import { ConditionBadge } from '@/components/ui/StatusBadge';

interface Props {
  /** The employee's own asset whose current handover is being confirmed. */
  assetId: string;
  onClose: () => void;
  /** Called after the employee accepted or reported an issue, so the caller can reload. */
  onConfirmed: () => void;
}

const DECLARATION =
  'I confirm that I have received the asset described above and that it is in the condition shown. ' +
  'I accept responsibility for its care in line with the company asset policy.';

/**
 * The Asset Declaration (OAMS-251): the employee reviews a newly assigned
 * asset, its condition at handover and the handover photos, then Accepts it or
 * reports an issue with a reason. Loads its own data so it can be opened from
 * the My Assets list, the asset detail page or the dashboard alike.
 */
export function AssetDeclarationDrawer({ assetId, onClose, onConfirmed }: Props) {
  const { closing, requestClose } = useDrawerAnimation(onClose);

  const [detail, setDetail] = useState<MyAssetDetail | null>(null);
  const [photos, setPhotos] = useState<ConditionImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [reporting, setReporting] = useState(false);
  const [issue, setIssue] = useState('');
  const [issueError, setIssueError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Deferred setState, matching the employee loaders (no synchronous setState
  // inside the effect body).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => getMyAsset(assetId))
      .then(async (result) => {
        const images = await getMyConditionImages(result.assignmentId).catch(() => null);
        if (cancelled) return;
        setDetail(result);
        setPhotos(images?.assigned ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load this asset.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  const submit = async (status: 'Accepted' | 'Rejected') => {
    if (!detail) return;
    if (status === 'Rejected' && !issue.trim()) {
      setIssueError('Please describe the issue.');
      return;
    }
    setSaving(true);
    try {
      await confirmMyAssignment(detail.assignmentId, {
        status,
        note: status === 'Rejected' ? issue.trim() : undefined,
      });
      toast.success(
        status === 'Accepted'
          ? 'Asset receipt confirmed successfully.'
          : 'Issue reported. Your administrator will follow up.',
      );
      onConfirmed();
      requestClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to submit your confirmation.');
    } finally {
      setSaving(false);
    }
  };

  const asset = detail?.asset;
  const alreadyConfirmed = detail !== null && detail.confirmationStatus !== 'Pending';

  return (
    <OverlayPortal>
      <div
        className={`fixed inset-0 z-40 bg-scrim backdrop-blur-[2px] ${closing ? 'motion-safe:animate-overlay-out' : 'motion-safe:animate-overlay-in'}`}
        onClick={requestClose}
      />
      <div
        role="dialog"
        aria-label="Asset Declaration"
        className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col w-full max-w-[520px] bg-card text-card-foreground shadow-drawer rounded-l-[16px] ${closing ? 'motion-safe:animate-drawer-out' : 'motion-safe:animate-drawer-in'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">Asset Declaration</h2>
            <p className="text-2sm text-muted-foreground mt-0.5">Review the asset, then confirm you have received it.</p>
          </div>
          <button
            onClick={requestClose}
            aria-label="Close"
            className="rounded-control p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="py-16 text-center text-2sm text-muted-foreground">Loading asset…</div>
          ) : loadError || !detail || !asset ? (
            <div className="rounded-lg p-4 text-2sm bg-danger-surface text-danger-foreground border border-danger/30">
              {loadError ?? 'Failed to load this asset.'}
            </div>
          ) : (
            <>
              {/* Asset summary */}
              <div className="rounded-lg p-4 bg-muted/50 border border-border">
                <div className="font-semibold text-base text-foreground">{asset.name}</div>
                <div className="text-xs font-mono text-muted-foreground/80 mb-3">{asset.displayId}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <SummaryItem label="Brand / Model" value={[asset.brand, asset.model].filter(Boolean).join(' ') || '—'} />
                  <SummaryItem label="Serial Number" value={asset.serialNumber ?? '—'} mono />
                  <SummaryItem label="Category" value={asset.category?.name ?? '—'} />
                  <SummaryItem label="Assigned On" value={detail.assignmentDate} />
                  <div>
                    <div className="text-2xs text-muted-foreground/80 mb-1">Condition at Handover</div>
                    {detail.conditionAtAssignment ? (
                      <ConditionBadge condition={detail.conditionAtAssignment} />
                    ) : (
                      <span className="text-2sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Handover photos */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                  <ImageIcon className="w-3.5 h-3.5" /> Condition Photos at Handover
                </div>
                {photos.length === 0 ? (
                  <div className="rounded-lg px-4 py-3 text-2sm text-muted-foreground bg-muted/40 border border-dashed border-border">
                    No photos were taken at handover.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {photos.map((img, i) => (
                      <button
                        key={img.id}
                        onClick={() => setLightboxIndex(i)}
                        className="rounded-control overflow-hidden h-20 p-0 border border-border transition-opacity hover:opacity-90 cursor-zoom-in"
                        title={`Photo ${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {alreadyConfirmed ? (
                <div className="flex items-start gap-2 rounded-lg p-4 text-2sm bg-info-surface text-info-foreground border border-info/30">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  You have already responded to this handover. There is nothing left to confirm.
                </div>
              ) : (
                <>
                  {/* Declaration */}
                  <div className="rounded-lg p-4 bg-secondary/60 border border-primary/20">
                    <div className="text-2xs uppercase tracking-[0.04em] text-primary mb-1.5">Declaration</div>
                    <p className="text-2sm leading-relaxed text-foreground/90">{DECLARATION}</p>
                  </div>

                  {/* Report an issue */}
                  {reporting && (
                    <div>
                      <label htmlFor="declaration-issue" className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                        <AlertTriangle className="w-3.5 h-3.5 text-danger" /> Describe the issue <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="declaration-issue"
                        value={issue}
                        onChange={(e) => { setIssue(e.target.value); setIssueError(null); }}
                        rows={4}
                        maxLength={2000}
                        // Opens below the declaration; focusing scrolls it into view.
                        autoFocus
                        placeholder="e.g. The screen has a crack in the bottom-left corner."
                        className={`w-full rounded-control border bg-input-background px-3 py-2 text-2sm placeholder:text-muted-foreground/60 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 ${issueError ? 'border-danger' : 'border-input focus:border-ring'}`}
                      />
                      {issueError && <p className="mt-1 text-xs text-danger">{issueError}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Your administrator will see this and follow up with you.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-muted/60 rounded-bl-[16px]">
          {detail && !alreadyConfirmed && !reporting && (
            <button
              onClick={() => setReporting(true)}
              disabled={saving}
              className="mr-auto text-2sm font-medium text-danger transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              Report an issue
            </button>
          )}
          <div className="ml-auto flex items-center gap-3">
            {reporting ? (
              <>
                <button
                  onClick={() => { setReporting(false); setIssueError(null); }}
                  disabled={saving}
                  className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  onClick={() => void submit('Rejected')}
                  disabled={saving}
                  className="rounded-control px-5 py-2.5 text-sm font-semibold bg-danger text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                >
                  {saving ? 'Submitting…' : 'Submit issue'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={requestClose}
                  className="rounded-control border border-border px-5 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted"
                >
                  {alreadyConfirmed || !detail ? 'Close' : 'Cancel'}
                </button>
                {detail && !alreadyConfirmed && (
                  <button
                    onClick={() => void submit('Accepted')}
                    disabled={saving}
                    className="rounded-control px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                  >
                    {saving ? 'Accepting…' : 'Accept'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {lightboxIndex !== null && photos.length > 0 && (
        <ImageLightbox
          images={photos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          title="Condition at handover"
        />
      )}
    </OverlayPortal>
  );
}

function SummaryItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-2xs text-muted-foreground/80 mb-0.5">{label}</div>
      <div className={`text-2sm text-foreground truncate ${mono ? 'font-mono' : ''}`} title={value}>{value}</div>
    </div>
  );
}
