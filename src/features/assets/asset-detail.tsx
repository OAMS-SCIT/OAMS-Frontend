'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronRight, Pencil, UserPlus, Plus, Trash2, RotateCcw, Monitor, ZoomIn, RefreshCw } from 'lucide-react';
import type { AssetDetail as AssetDetailType, AssetHistoryEntry, AssetUpgrade, Assignment, AssignmentHistoryItem } from '@/types';
import { ApiError, getAsset, getUpgrades, deleteUpgrade, getActiveAssignment, returnAssignment, getAssetAssignments, getAssetHistory } from '@/lib/api';
import { AssetHistoryTimeline } from './AssetHistoryTimeline';
import { StatusBadge, ConditionBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog';
import { RegisterAssetDrawer } from '@/components/overlays/RegisterAssetDrawer';
import { AssignAssetDrawer } from '@/components/overlays/AssignAssetDrawer';
import { ReturnAssetDrawer } from '@/components/overlays/ReturnAssetDrawer';
import { AddUpgradeDrawer } from '@/components/overlays/AddUpgradeDrawer';
import { ChangeStatusDrawer } from '@/components/overlays/ChangeStatusDrawer';
import { ImageLightbox } from '@/components/overlays/ImageLightbox';

function InfoRow({ label, value, mono, style }: {
  label: string; value: React.ReactNode; mono?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-border/60">
      <span className="micro-label font-semibold tracking-[0.04em]">{label}</span>
      <span className={`text-2sm text-foreground ${mono ? 'font-mono' : ''}`} style={style}>{value ?? '—'}</span>
    </div>
  );
}

export function AssetDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [asset, setAsset] = useState<AssetDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'history' | 'asset_log' | 'upgrades'>('history');

  // Which image is shown large in the hero (index into the sorted images).
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Assignment history state
  const [history, setHistory] = useState<AssignmentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Asset event history (History Log tab)
  const [assetLog, setAssetLog] = useState<AssetHistoryEntry[]>([]);
  const [assetLogLoading, setAssetLogLoading] = useState(false);
  const [assetLogError, setAssetLogError] = useState<string | null>(null);

  // Upgrade log state
  const [upgrades, setUpgrades] = useState<AssetUpgrade[]>([]);
  const [upgradesLoading, setUpgradesLoading] = useState(false);
  const [upgradesTotal, setUpgradesTotal] = useState(0);

  // Drawer / dialog state
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showChangeStatus, setShowChangeStatus] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [returnSaving, setReturnSaving] = useState(false);
  const [showAddUpgrade, setShowAddUpgrade] = useState(false);
  const [editingUpgrade, setEditingUpgrade] = useState<AssetUpgrade | undefined>(undefined);
  const [deletingUpgrade, setDeletingUpgrade] = useState<AssetUpgrade | null>(null);

  // Version counters — incrementing triggers a re-fetch without calling setState
  // inside an effect body (which React / the linter discourages).
  const [assetVersion,    setAssetVersion]    = useState(0);
  const [historyVersion,  setHistoryVersion]  = useState(0);
  const [assetLogVersion, setAssetLogVersion] = useState(0);
  const [upgradesVersion, setUpgradesVersion] = useState(0);

  // Stable refresh helpers for event handlers — only call the version setter,
  // never setState directly, so they're safe to call from anywhere.
  const refreshAsset    = useCallback(() => setAssetVersion(v => v + 1), []);
  const refreshHistory  = useCallback(() => setHistoryVersion(v => v + 1), []);
  const refreshAssetLog = useCallback(() => setAssetLogVersion(v => v + 1), []);

  // ── Effects ──────────────────────────────────────────────────────────────────
  // All setState calls are inside Promise callbacks — never synchronously in the
  // effect body — to satisfy the no-direct-set-state-in-use-effect lint rule.
  // Promise.resolve() at the top of each chain defers the initial loading setter
  // to a microtask so it is also inside an async callback.

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) { setLoading(true); setError(null); }
        return getAsset(params.id);
      })
      .then(async (data) => {
        if (cancelled) return;
        setAsset(data);
        if (data.status === 'Assigned') {
          try {
            const a = await getActiveAssignment(data.id);
            if (!cancelled) setActiveAssignment(a);
          } catch {
            if (!cancelled) setActiveAssignment(null);
          }
        } else {
          setActiveAssignment(null);
        }
      })
      .catch((err) => { if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load asset.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id, assetVersion]);

  useEffect(() => {
    if (activeTab !== 'history' || !params.id) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => { if (!cancelled) setHistoryLoading(true); return getAssetAssignments(params.id); })
      .then((data) => { if (!cancelled) setHistory(data); })
      .catch(() => { /* non-fatal */ })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, params.id, historyVersion]);

  useEffect(() => {
    if (activeTab !== 'asset_log' || !params.id) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) { setAssetLogLoading(true); setAssetLogError(null); }
        return getAssetHistory(params.id);
      })
      .then((result) => { if (!cancelled) setAssetLog(result.data); })
      .catch((err) => { if (!cancelled) setAssetLogError(err instanceof ApiError ? err.message : 'Failed to load history log.'); })
      .finally(() => { if (!cancelled) setAssetLogLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, params.id, assetLogVersion]);

  useEffect(() => {
    if (activeTab !== 'upgrades' || !params.id) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => { if (!cancelled) setUpgradesLoading(true); return getUpgrades(params.id); })
      .then((result) => { if (!cancelled) { setUpgrades(result.data); setUpgradesTotal(result.total); } })
      .catch(() => { /* non-fatal */ })
      .finally(() => { if (!cancelled) setUpgradesLoading(false); });
    return () => { cancelled = true; };
  }, [activeTab, params.id, upgradesVersion]);

  const handleConfirmReturn = async (
    returnDate: string,
    condition: AssetDetailType['condition'],
    notes?: string,
  ) => {
    if (!activeAssignment) return;
    setReturnSaving(true);
    try {
      await returnAssignment(activeAssignment.id, {
        returnDate,
        conditionAtReturn: condition,
        returnNotes: notes,
      });
      toast.success(`"${asset?.name}" returned. Now Available.`);
      setShowReturn(false);
      refreshAsset();
      refreshHistory();
      refreshAssetLog();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to process return.');
    } finally {
      setReturnSaving(false);
    }
  };

  const handleUpgradeSaved = (saved: AssetUpgrade) => {
    setUpgrades((prev) => {
      const exists = prev.find((u) => u.id === saved.id);
      if (exists) return prev.map((u) => u.id === saved.id ? saved : u);
      return [saved, ...prev];
    });
    setUpgradesTotal((t) => t + (upgrades.find((u) => u.id === saved.id) ? 0 : 1));
    // Update count on asset hero
    if (asset) {
      setAsset({ ...asset, upgradeLogCount: asset.upgradeLogCount + (upgrades.find((u) => u.id === saved.id) ? 0 : 1) });
    }
  };

  const handleDeleteUpgrade = async () => {
    if (!deletingUpgrade) return;
    try {
      await deleteUpgrade(deletingUpgrade.id);
      toast.success('Upgrade entry deleted.');
      setUpgrades((prev) => prev.filter((u) => u.id !== deletingUpgrade.id));
      setUpgradesTotal((t) => Math.max(0, t - 1));
      if (asset) setAsset({ ...asset, upgradeLogCount: Math.max(0, asset.upgradeLogCount - 1) });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete upgrade entry.');
    } finally {
      setDeletingUpgrade(null);
    }
  };

  // ── Warranty ──────────────────────────────────────────────────────────────
  const warrantyDays = asset?.warrantyExpiryDate
    ? Math.floor((new Date(asset.warrantyExpiryDate).getTime() - Date.now()) / 86400000)
    : null;
  const warrantyClass = warrantyDays !== null
    ? (warrantyDays <= 30 ? 'text-danger' : warrantyDays <= 90 ? 'text-warning-foreground' : 'text-foreground')
    : '';

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-2sm text-muted-foreground">
        Loading asset…
      </div>
    );
  }
  if (error || !asset) {
    return (
      <div className="text-center py-20">
        <p className="text-base text-muted-foreground">{error ?? 'Asset not found.'}</p>
        <button onClick={() => router.push('/admin/inventory')} className="mt-4 text-primary hover:underline">
          Back to Inventory
        </button>
      </div>
    );
  }

  // Images for the hero, ordered by sortOrder (lowest = primary). The active
  // index is clamped so it stays valid after images are removed in the drawer.
  const heroImages = [...(asset.images ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeIdx = Math.min(activeImageIndex, Math.max(0, heroImages.length - 1));

  return (
    <div className="motion-safe:animate-fade-rise">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5 text-2sm">
        <button onClick={() => router.push('/admin/inventory')}
          className="text-muted-foreground hover:text-primary transition-colors">
          Asset Inventory
        </button>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        <span className="font-semibold text-foreground">{asset.name}</span>
      </div>

      {/* Hero Card */}
      <div className="rounded-2xl p-6 mb-6 bg-card border border-border shadow-card">
        <div className="flex gap-6">
          {/* Image area (display-only; management lives in the Edit drawer) */}
          <div className="shrink-0 w-60">
            {heroImages.length > 0 ? (
              <>
                {/* Primary image — click to open the full-size lightbox */}
                <button
                  onClick={() => setLightboxOpen(true)}
                  className="group relative block rounded-xl overflow-hidden w-full h-[190px] p-0 border border-border bg-muted cursor-zoom-in"
                  title="Click to enlarge"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroImages[activeIdx].url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Hover affordance */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[rgba(15,23,42,0.28)]">
                    <span className="flex items-center justify-center rounded-full w-10 h-10 bg-white/90">
                      <ZoomIn className="w-5 h-5 text-[#1E293B]" />
                    </span>
                  </div>
                </button>

                {/* Thumbnail strip — fills the column width so it stays balanced
                    for any count (max 5): 3 wider thumbs or 5 narrower ones. */}
                {heroImages.length > 1 && (
                  <div
                    className="grid gap-2 mt-2"
                    style={{ gridTemplateColumns: `repeat(${heroImages.length}, 1fr)` }}
                  >
                    {heroImages.map((img, i) => (
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

          {/* Details + actions */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="font-bold mb-1 text-[22px] tracking-[-0.02em] text-foreground">{asset.name}</h1>
                <div className="text-2sm text-muted-foreground/80 font-mono">{asset.displayId}</div>
                {asset.description && (
                  <div className="text-2sm text-muted-foreground mt-1">{asset.description}</div>
                )}
              </div>
              <StatusBadge status={asset.status} size="lg" />
            </div>

            <div className="flex gap-6 mt-4">
              <div>
                <div className="text-2xs text-muted-foreground/80 mb-0.5">CATEGORY</div>
                <div className="text-2sm text-foreground/80">{asset.category.name}</div>
              </div>
              <div>
                <div className="text-2xs text-muted-foreground/80 mb-0.5">LOCATION</div>
                <div className="text-2sm text-foreground/80">{asset.location ?? '—'}</div>
              </div>
              <div>
                <div className="text-2xs text-muted-foreground/80 mb-0.5">CONDITION</div>
                <ConditionBadge condition={asset.condition} />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-5">
              {asset.status === 'Available' && (
                <button onClick={() => setShowAssign(true)}
                  className="flex items-center gap-2 rounded-control px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground shadow-[0_2px_12px_rgba(29,78,216,0.25)] transition-all hover:opacity-90 active:scale-[0.98]">
                  <UserPlus className="w-4 h-4" /> Assign Asset
                </button>
              )}
              {asset.status === 'Assigned' && (
                <button onClick={() => activeAssignment ? setShowReturn(true) : toast.error('No active assignment found for this asset.')}
                  className="flex items-center gap-2 rounded-control px-4 py-2.5 text-sm font-medium bg-warning text-white shadow-[0_2px_12px_rgba(245,158,11,0.3)] transition-all hover:opacity-90 active:scale-[0.98]">
                  <RotateCcw className="w-4 h-4" /> Process Return
                </button>
              )}
              <button onClick={() => setShowChangeStatus(true)}
                className="flex items-center gap-2 rounded-control border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
                <RefreshCw className="w-4 h-4" /> Change Status
              </button>
              <button onClick={() => setShowEdit(true)}
                className="flex items-center gap-2 rounded-control border border-border px-4 py-2.5 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted">
                <Pencil className="w-4 h-4" /> Edit Asset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {/* Core Specs */}
        <div className="rounded-2xl p-5 bg-card border border-border shadow-card">
          <h3 className="font-semibold mb-3 text-sm tracking-[-0.01em] text-foreground">Core Specifications</h3>
          <InfoRow label="Brand" value={asset.brand} />
          <InfoRow label="Model" value={asset.model} />
          <InfoRow label="Serial Number" value={asset.serialNumber} mono />
          <InfoRow label="Category" value={asset.category.name} />
          {asset.customAttributes.length > 0 && (
            <>
              <div className="mt-3 mb-2 micro-label font-semibold tracking-[0.04em]">
                Category Attributes
              </div>
              {asset.customAttributes.map((attr) => (
                <InfoRow key={attr.attributeId} label={attr.label} value={attr.value} />
              ))}
            </>
          )}
        </div>

        {/* Financial & Warranty */}
        <div className="rounded-2xl p-5 bg-card border border-border shadow-card">
          <h3 className="font-semibold mb-3 text-sm tracking-[-0.01em] text-foreground">Financial & Warranty</h3>
          <InfoRow label="Purchase Date" value={asset.purchaseDate} />
          <InfoRow label="Purchase Price" value={asset.purchasePrice ? `$${Number(asset.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : undefined} />
          <InfoRow label="Vendor / Supplier" value={asset.vendorName} />
          <InfoRow label="Purchase Order Ref." value={asset.purchaseOrderRef} />
          <InfoRow label="Warranty Start" value={asset.warrantyStartDate} />
          <InfoRow label="Warranty Expiry" value={
            asset.warrantyExpiryDate ? (
              <span className={warrantyClass}>
                {asset.warrantyExpiryDate}
                {warrantyDays !== null && warrantyDays < 0 && <span className="ml-2 text-xs">(Expired)</span>}
                {warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 90 && <span className="ml-2 text-xs">({warrantyDays} days left)</span>}
              </span>
            ) : undefined
          } />
          <InfoRow label="Warranty Provider" value={asset.warrantyProvider} />
        </div>

        {/* Physical Details */}
        <div className="rounded-2xl p-5 bg-card border border-border shadow-card">
          <h3 className="font-semibold mb-3 text-sm tracking-[-0.01em] text-foreground">Physical & Audit</h3>
          <InfoRow label="Condition" value={<ConditionBadge condition={asset.condition} />} />
          <InfoRow label="Location" value={asset.location} />
          <InfoRow label="Registered By" value={asset.createdBy ? `${asset.createdBy.firstName} ${asset.createdBy.lastName}` : undefined} />
          <InfoRow label="Registered Date" value={asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : undefined} />
          <InfoRow label="Last Modified" value={asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : undefined} />
          <InfoRow label="Upgrade Entries" value={String(asset.upgradeLogCount)} />
        </div>
      </div>

      {/* Tabbed Panel */}
      <div className="rounded-2xl overflow-hidden bg-card border border-border shadow-card">
        {/* Tab Bar */}
        <div className="flex items-center border-b border-border px-6">
          {[
            { key: 'history', label: 'Assignment History' },
            { key: 'asset_log', label: 'History Log' },
            { key: 'upgrades', label: `Upgrade Log${upgradesTotal > 0 ? ` (${upgradesTotal})` : ''}` },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as 'history' | 'asset_log' | 'upgrades')}
              className={`relative mr-6 py-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}>
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {activeTab === 'upgrades' && (
            <button
              onClick={() => { setEditingUpgrade(undefined); setShowAddUpgrade(true); }}
              className="flex items-center gap-1.5 rounded-control border border-border px-3 py-2 my-3 text-2sm font-medium text-foreground/70 transition-colors hover:bg-muted">
              <Plus className="w-3.5 h-3.5" /> Add Upgrade Entry
            </button>
          )}
        </div>

        {/* Assignment History Tab */}
        {activeTab === 'history' && (
          historyLoading ? (
            <div className="flex items-center justify-center py-12 text-2sm text-muted-foreground">
              Loading assignment history…
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              icon="history"
              title="No assignment history"
              subtitle="This asset has not been assigned yet. Assignment records will appear here once it is assigned."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px]">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    {['Assignee', 'Assigned Date', 'Expected Return', 'Actual Return', 'Condition (Assign)', 'Condition (Return)', 'Notes', 'Assigned By'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 micro-label whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, i) => {
                    const isActive = row.returnedAt === null;
                    return (
                      <tr key={row.id}
                        className={`border-b border-border/60 border-l-[3px] ${
                          isActive ? 'border-l-primary' : 'border-l-transparent'
                        } ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar user={row.assignee} size={30} />
                            <div>
                              <div className="text-2sm text-foreground font-semibold">
                                {row.assignee.firstName} {row.assignee.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground/80">
                                {row.assignee.designation?.name ?? '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-2sm text-muted-foreground whitespace-nowrap nums">{row.assignmentDate}</td>
                        <td className="px-5 py-3.5 text-2sm text-muted-foreground whitespace-nowrap nums">{row.expectedReturnDate ?? '—'}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {row.returnDate ? (
                            <span className="text-2sm text-muted-foreground nums">{row.returnDate}</span>
                          ) : (
                            <span className="inline-flex items-center font-medium rounded-full text-2xs px-2.5 py-[3px] bg-info-surface text-info-foreground">
                              Currently Assigned
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {row.conditionAtAssignment
                            ? <ConditionBadge condition={row.conditionAtAssignment} />
                            : <span className="text-2sm text-muted-foreground/80">—</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          {row.conditionAtReturn
                            ? <ConditionBadge condition={row.conditionAtReturn} />
                            : <span className="text-2sm text-muted-foreground/80">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-2sm text-muted-foreground max-w-[220px] whitespace-normal">
                          {row.notes ?? '—'}
                        </td>
                        <td className="px-5 py-3.5 text-2sm text-muted-foreground whitespace-nowrap">
                          {row.assignedBy ? `${row.assignedBy.firstName} ${row.assignedBy.lastName}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* History Log Tab */}
        {activeTab === 'asset_log' && (
          <AssetHistoryTimeline
            entries={assetLog}
            isLoading={assetLogLoading}
            error={assetLogError}
          />
        )}

        {/* Upgrade Log Tab */}
        {activeTab === 'upgrades' && (
          upgradesLoading ? (
            <div className="flex items-center justify-center py-12 text-2sm text-muted-foreground">
              Loading upgrade log…
            </div>
          ) : upgrades.length === 0 ? (
            <EmptyState
              icon="assets"
              title="No upgrades recorded"
              subtitle="No upgrade entries have been added for this asset yet."
              action={
                <button
                  onClick={() => { setEditingUpgrade(undefined); setShowAddUpgrade(true); }}
                  className="flex items-center gap-2 rounded-control px-4 py-2 text-2sm font-semibold bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]">
                  <Plus className="w-4 h-4" /> Add Upgrade Entry
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    {['Date', 'Type', 'Before', 'After', 'Cost', 'Vendor', 'Logged By', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 micro-label whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upgrades.map((u, i) => (
                    <tr key={u.id}
                      className={`border-b border-border/60 ${i % 2 === 0 ? 'bg-card' : 'bg-muted/30'}`}>
                      <td className="px-5 py-3.5 text-2sm text-muted-foreground nums">{u.upgradeDate}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 font-medium text-2xs ${
                          u.upgradeType === 'Part Replaced'
                            ? 'bg-warning-surface text-warning-foreground'
                            : 'bg-success-surface text-success-foreground'
                        }`}>
                          {u.upgradeType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-2sm text-muted-foreground">{u.specBefore ?? '—'}</td>
                      <td className="px-5 py-3.5 text-2sm text-success-foreground font-medium">{u.specAfter}</td>
                      <td className="px-5 py-3.5 text-2sm text-foreground nums">${Number(u.cost).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-2sm text-muted-foreground">{u.vendorName}</td>
                      <td className="px-5 py-3.5 text-2sm text-muted-foreground">
                        {u.loggedBy ? `${u.loggedBy.firstName} ${u.loggedBy.lastName}` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditingUpgrade(u); setShowAddUpgrade(true); }}
                            className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-primary transition-colors hover:bg-secondary">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingUpgrade(u)}
                            className="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-danger transition-colors hover:bg-danger-surface">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Image lightbox */}
      {lightboxOpen && heroImages.length > 0 && (
        <ImageLightbox
          images={heroImages.map((img) => ({ id: img.id, url: img.url }))}
          index={activeIdx}
          onIndexChange={setActiveImageIndex}
          onClose={() => setLightboxOpen(false)}
          title={asset.name}
        />
      )}

      {/* Drawers & Dialogs */}
      {showEdit && (
        <RegisterAssetDrawer
          assetId={asset.id}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setAsset(updated); setShowEdit(false); refreshAssetLog(); }}
        />
      )}
      {showAssign && (
        <AssignAssetDrawer
          asset={asset}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); refreshAsset(); refreshHistory(); refreshAssetLog(); }}
        />
      )}
      {showReturn && activeAssignment && (
        <ReturnAssetDrawer
          assetName={asset.name}
          assignedTo={`${activeAssignment.assignee.firstName} ${activeAssignment.assignee.lastName}`}
          since={activeAssignment.assignmentDate}
          onClose={() => setShowReturn(false)}
          onConfirm={handleConfirmReturn}
          saving={returnSaving}
        />
      )}
      {showChangeStatus && (
        <ChangeStatusDrawer
          asset={asset}
          onClose={() => setShowChangeStatus(false)}
          onSaved={(updated) => { setAsset(updated); setShowChangeStatus(false); refreshAssetLog(); }}
        />
      )}
      {showAddUpgrade && (
        <AddUpgradeDrawer
          assetId={asset.id}
          assetName={asset.name}
          assetDisplayId={asset.displayId}
          existing={editingUpgrade}
          onClose={() => { setShowAddUpgrade(false); setEditingUpgrade(undefined); }}
          onSaved={handleUpgradeSaved}
        />
      )}
      {deletingUpgrade && (
        <ConfirmDialog
          title="Delete Upgrade Entry"
          description={`Are you sure you want to delete the upgrade entry "${deletingUpgrade.upgradeType} — ${deletingUpgrade.specAfter}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteUpgrade}
          onCancel={() => setDeletingUpgrade(null)}
        />
      )}
    </div>
  );
}
