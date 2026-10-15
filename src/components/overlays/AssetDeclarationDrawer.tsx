'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ImageIcon, Wrench, X } from 'lucide-react';
import { OverlayPortal } from './OverlayPortal';
import { useDrawerAnimation } from './useDrawerAnimation';
import { ImageLightbox } from './ImageLightbox';
import { ApiError, confirmMyAssignment, getMyAsset, getMyConditionImages } from '@/lib/api';
import type { AssignmentType, ConditionImageItem, MyAssetDetail, MyHandbackSummary } from '@/types';
import { ConditionBadge } from '@/components/ui/StatusBadge';

interface Props {
  /** The employee's own asset whose current handover is being confirmed. */
  assetId: string;
  /**
   * The handover type, when the caller already knows it, so the right title
   * shows while loading. The loaded asset detail is authoritative.
   */
  assignmentType?: AssignmentType;
  onClose: () => void;
  /** Called after the employee accepted or reported an issue, so the caller can reload. */
  onConfirmed: () => void;
}

/** Wording for a new assignment (OAMS-251) vs a handback after repair (OAMS-252). */
const COPY = {
  receipt: {
    title: 'Asset Declaration',
    subtitle: 'Review the asset, then confirm you have received it.',
    dateLabel: 'Assigned On',
    conditionLabel: 'Condition at Handover',
    photosLabel: 'Condition Photos at Handover',
    noPhotos: 'No photos were taken at handover.',
    declaration:
      'I confirm that I have received the asset described above and that it is in the condition shown. ' +
      'I accept responsibility for its care in line with the company asset policy.',
    confirm: 'Accept',
    confirming: 'Accepting…',
    success: 'Asset receipt confirmed successfully.',
  },
  handback: {
    title: 'Handback Confirmation',
    subtitle: 'Review the condition of your asset after repair, then confirm.',
    dateLabel: 'Handed Back On',
    conditionLabel: 'Condition at Handback',
    photosLabel: 'Condition Photos at Handback',
    noPhotos: 'No photos were taken at handback.',
    declaration:
      'I confirm that this asset has been returned to me after repair and that its condition is as shown above.',
    confirm: 'Confirm',
    confirming: 'Confirming…',
    success: 'Handback condition confirmed successfully.',
  },
} as const;

/**
 * The Asset Declaration. The employee reviews an asset, its condition at
 * handover and the handover photos, then confirms it or reports an issue with
 * a reason. Covers a newly assigned asset (OAMS-251, "Accept") and an asset
 * handed back after repair (OAMS-252, "Confirm", plus the repair summary).
 * Loads its own data so it can be opened from the My Assets list, the asset
 * detail page or the dashboard alike.
 */
export function AssetDeclarationDrawer({ assetId, assignmentType, onClose, onConfirmed }: Props) {
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

  const mode = (detail?.assignmentType ?? assignmentType) === 'Handback' ? 'handback' : 'receipt';
  const copy = COPY[mode];

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
          ? copy.success
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
        aria-label={copy.title}
        className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col w-full max-w-[520px] bg-card text-card-foreground shadow-drawer rounded-l-[16px] ${closing ? 'motion-safe:animate-drawer-out' : 'motion-safe:animate-drawer-in'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-bold text-lg tracking-[-0.02em] text-foreground">{copy.title}</h2>
            <p className="text-2sm text-muted-foreground mt-0.5">{copy.subtitle}</p>
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
                  <SummaryItem label={copy.dateLabel} value={detail.assignmentDate} />
                  <div>
                    <div className="text-2xs text-muted-foreground/80 mb-1">{copy.conditionLabel}</div>
                    {detail.conditionAtAssignment ? (
                      <ConditionBadge condition={detail.conditionAtAssignment} />
                    ) : (
                      <span className="text-2sm text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </div>

              {mode === 'handback' && detail.handback && <RepairSummary repair={detail.handback} />}

              {/* Handover photos */}
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                  <ImageIcon className="w-3.5 h-3.5" /> {copy.photosLabel}
                </div>
                {photos.length === 0 ? (
                  <div className="rounded-lg px-4 py-3 text-2sm text-muted-foreground bg-muted/40 border border-dashed border-border">
                    {copy.noPhotos}
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
                    <p className="text-2sm leading-relaxed text-foreground/90">{copy.declaration}</p>
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
                    {saving ? copy.confirming : copy.confirm}
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

/** What the service center did, shown before the employee confirms a handback (OAMS-252). */
function RepairSummary({ repair }: { repair: MyHandbackSummary }) {
  return (
    <div className="rounded-lg p-4 bg-muted/50 border border-border">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-foreground/80">
        <Wrench className="w-3.5 h-3.5" /> Repair Summary
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <SummaryItem label="Service Vendor" value={repair.vendor ?? '—'} />
        <SummaryItem label="Outcome" value={repair.outcome ?? '—'} />
        <SummaryItem label="Sent On" value={new Date(repair.sentAt).toLocaleDateString()} />
        <SummaryItem label="Returned On" value={repair.returnDate ?? '—'} />
      </div>
      <div className="mt-3">
        <div className="text-2xs text-muted-foreground/80 mb-0.5">Reason for Repair</div>
        <div className="text-2sm text-foreground">{repair.reason}</div>
      </div>
      {repair.workDone.length > 0 && (
        <div className="mt-3">
          <div className="text-2xs text-muted-foreground/80 mb-1">Work Done</div>
          <ul className="space-y-1">
            {repair.workDone.map((item, i) => (
              <li key={`${item.itemName}-${i}`} className="flex items-center justify-between gap-3 text-2sm text-foreground">
                <span className="min-w-0 truncate">{item.itemName}</span>
                <span className="shrink-0 rounded-full px-2 py-[1px] text-2xs font-medium bg-secondary text-secondary-foreground">
                  {item.itemType}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {repair.notes && (
        <div className="mt-3">
          <div className="text-2xs text-muted-foreground/80 mb-0.5">Notes</div>
          <div className="text-2sm text-foreground">{repair.notes}</div>
        </div>
      )}
    </div>
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
