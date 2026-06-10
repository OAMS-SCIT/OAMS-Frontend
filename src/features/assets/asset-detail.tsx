'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronRight, Pencil, UserPlus, Plus, Trash2, RotateCcw } from 'lucide-react';
import type { AssetDetail as AssetDetailType, AssetUpgrade, Assignment } from '@/types';
import { ApiError, getAsset, getUpgrades, deleteUpgrade, getActiveAssignment, returnAssignment } from '@/lib/api';
import { StatusBadge, ConditionBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/overlays/ConfirmDialog';
import { RegisterAssetDrawer } from '@/components/overlays/RegisterAssetDrawer';
import { AssignAssetDrawer } from '@/components/overlays/AssignAssetDrawer';
import { ReturnAssetDrawer } from '@/components/overlays/ReturnAssetDrawer';
import { AddUpgradeDrawer } from '@/components/overlays/AddUpgradeDrawer';

function InfoRow({ label, value, mono, style }: {
  label: string; value: React.ReactNode; mono?: boolean; style?: React.CSSProperties;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1E293B', fontFamily: mono ? 'monospace' : undefined, ...style }}>{value ?? '—'}</span>
    </div>
  );
}

export function AssetDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [asset, setAsset] = useState<AssetDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'history' | 'upgrades'>('history');

  // Upgrade log state
  const [upgrades, setUpgrades] = useState<AssetUpgrade[]>([]);
  const [upgradesLoading, setUpgradesLoading] = useState(false);
  const [upgradesTotal, setUpgradesTotal] = useState(0);

  // Drawer / dialog state
  const [showEdit, setShowEdit] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [returnSaving, setReturnSaving] = useState(false);
  const [showAddUpgrade, setShowAddUpgrade] = useState(false);
  const [editingUpgrade, setEditingUpgrade] = useState<AssetUpgrade | undefined>(undefined);
  const [deletingUpgrade, setDeletingUpgrade] = useState<AssetUpgrade | null>(null);

  const loadAsset = useCallback(async () => {
    if (!params.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAsset(params.id);
      setAsset(data);
      // Resolve the active assignment so the return panel has the assignment
      // id + assignee/since summary ready when the asset is Assigned.
      if (data.status === 'Assigned') {
        try {
          setActiveAssignment(await getActiveAssignment(data.id));
        } catch {
          setActiveAssignment(null);
        }
      } else {
        setActiveAssignment(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load asset.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

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
      loadAsset();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to process return.');
    } finally {
      setReturnSaving(false);
    }
  };

  const loadUpgrades = useCallback(async () => {
    if (!params.id) return;
    setUpgradesLoading(true);
    try {
      const result = await getUpgrades(params.id);
      setUpgrades(result.data);
      setUpgradesTotal(result.total);
    } catch {
      // non-fatal — table might not exist yet
    } finally {
      setUpgradesLoading(false);
    }
  }, [params.id]);

  useEffect(() => { loadAsset(); }, [loadAsset]);

  useEffect(() => {
    if (activeTab === 'upgrades') loadUpgrades();
  }, [activeTab, loadUpgrades]);

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
  const warrantyStyle = warrantyDays !== null
    ? { color: warrantyDays < 0 ? '#EF4444' : warrantyDays <= 30 ? '#EF4444' : warrantyDays <= 90 ? '#F59E0B' : '#1E293B' }
    : {};

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" style={{ fontSize: 13, color: '#64748B' }}>
        Loading asset…
      </div>
    );
  }
  if (error || !asset) {
    return (
      <div className="text-center py-20">
        <p style={{ fontSize: 16, color: '#64748B' }}>{error ?? 'Asset not found.'}</p>
        <button onClick={() => router.push('/admin/inventory')} className="mt-4 text-blue-600 hover:underline">
          Back to Inventory
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5" style={{ fontSize: 13 }}>
        <button onClick={() => router.push('/admin/inventory')}
          className="hover:text-blue-600 transition-colors" style={{ color: '#64748B' }}>
          Asset Inventory
        </button>
        <ChevronRight className="w-4 h-4" style={{ color: '#CBD5E1' }} />
        <span className="font-semibold" style={{ color: '#1E293B' }}>{asset.name}</span>
      </div>

      {/* Hero Card */}
      <div className="rounded-2xl p-6 mb-6" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold mb-1" style={{ fontSize: 22, color: '#1E293B' }}>{asset.name}</h1>
            <div style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'monospace' }}>{asset.displayId}</div>
            {asset.description && (
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{asset.description}</div>
            )}
          </div>
          <StatusBadge status={asset.status} size="lg" />
        </div>

        <div className="flex gap-6 mt-4">
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>CATEGORY</div>
            <div style={{ fontSize: 13, color: '#475569' }}>{asset.category.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>LOCATION</div>
            <div style={{ fontSize: 13, color: '#475569' }}>{asset.location ?? '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>CONDITION</div>
            <ConditionBadge condition={asset.condition} />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5">
          {asset.status === 'Available' && (
            <button onClick={() => setShowAssign(true)}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white hover:opacity-90 transition-colors"
              style={{ fontSize: 14, background: '#1E3A8A' }}>
              <UserPlus className="w-4 h-4" /> Assign Asset
            </button>
          )}
          {asset.status === 'Assigned' && (
            <button onClick={() => activeAssignment ? setShowReturn(true) : toast.error('No active assignment found for this asset.')}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-white hover:opacity-90 transition-colors"
              style={{ fontSize: 14, background: '#F59E0B' }}>
              <RotateCcw className="w-4 h-4" /> Process Return
            </button>
          )}
          <button onClick={() => setShowEdit(true)}
            className="flex items-center gap-2 rounded-lg border px-4 py-2.5 font-medium hover:bg-gray-50 transition-colors"
            style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
            <Pencil className="w-4 h-4" /> Edit Asset
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {/* Core Specs */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: '#1E293B' }}>Core Specifications</h3>
          <InfoRow label="Brand" value={asset.brand} />
          <InfoRow label="Model" value={asset.model} />
          <InfoRow label="Serial Number" value={asset.serialNumber} mono />
          <InfoRow label="Category" value={asset.category.name} />
          {asset.customAttributes.length > 0 && (
            <>
              <div className="mt-3 mb-2" style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
                Category Attributes
              </div>
              {asset.customAttributes.map((attr) => (
                <InfoRow key={attr.attributeId} label={attr.label} value={attr.value} />
              ))}
            </>
          )}
        </div>

        {/* Financial & Warranty */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: '#1E293B' }}>Financial & Warranty</h3>
          <InfoRow label="Purchase Date" value={asset.purchaseDate} />
          <InfoRow label="Purchase Price" value={asset.purchasePrice ? `$${Number(asset.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : undefined} />
          <InfoRow label="Vendor / Supplier" value={asset.vendorName} />
          <InfoRow label="Purchase Order Ref." value={asset.purchaseOrderRef} />
          <InfoRow label="Warranty Start" value={asset.warrantyStartDate} />
          <InfoRow label="Warranty Expiry" value={
            asset.warrantyExpiryDate ? (
              <span style={warrantyStyle}>
                {asset.warrantyExpiryDate}
                {warrantyDays !== null && warrantyDays < 0 && <span className="ml-2 text-xs">(Expired)</span>}
                {warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 90 && <span className="ml-2 text-xs">({warrantyDays} days left)</span>}
              </span>
            ) : undefined
          } />
          <InfoRow label="Warranty Provider" value={asset.warrantyProvider} />
        </div>

        {/* Physical Details */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: '#1E293B' }}>Physical & Audit</h3>
          <InfoRow label="Condition" value={<ConditionBadge condition={asset.condition} />} />
          <InfoRow label="Location" value={asset.location} />
          <InfoRow label="Registered By" value={asset.createdBy ? `${asset.createdBy.firstName} ${asset.createdBy.lastName}` : undefined} />
          <InfoRow label="Registered Date" value={asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : undefined} />
          <InfoRow label="Last Modified" value={asset.updatedAt ? new Date(asset.updatedAt).toLocaleDateString() : undefined} />
          <InfoRow label="Upgrade Entries" value={String(asset.upgradeLogCount)} />
        </div>
      </div>

      {/* Tabbed Panel */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Tab Bar */}
        <div className="flex items-center border-b" style={{ borderColor: '#E2E8F0', padding: '0 24px' }}>
          {[
            { key: 'history', label: 'Assignment History' },
            { key: 'upgrades', label: `Upgrade Log${upgradesTotal > 0 ? ` (${upgradesTotal})` : ''}` },
          ].map((tab) => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as 'history' | 'upgrades')}
              className="relative mr-6 py-4 font-medium transition-colors"
              style={{
                fontSize: 14,
                color: activeTab === tab.key ? '#1E3A8A' : '#64748B',
                borderBottom: activeTab === tab.key ? '2px solid #1E3A8A' : '2px solid transparent',
              }}>
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {activeTab === 'upgrades' && (
            <button
              onClick={() => { setEditingUpgrade(undefined); setShowAddUpgrade(true); }}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 my-3 font-medium hover:bg-gray-50 transition-colors"
              style={{ fontSize: 13, borderColor: '#E2E8F0', color: '#475569' }}>
              <Plus className="w-3.5 h-3.5" /> Add Upgrade Entry
            </button>
          )}
        </div>

        {/* Assignment History Tab */}
        {activeTab === 'history' && (
          <EmptyState
            icon="history"
            title="Assignment history"
            subtitle="Assignment tracking is coming in the next module. Connect the Assignment module to see records here."
          />
        )}

        {/* Upgrade Log Tab */}
        {activeTab === 'upgrades' && (
          upgradesLoading ? (
            <div className="flex items-center justify-center py-12" style={{ fontSize: 13, color: '#64748B' }}>
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
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-white hover:opacity-90"
                  style={{ background: '#1E3A8A', fontSize: 13, fontWeight: 600 }}>
                  <Plus className="w-4 h-4" /> Add Upgrade Entry
                </button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 800 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Date', 'Type', 'Before', 'After', 'Cost', 'Vendor', 'Logged By', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3"
                        style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upgrades.map((u, i) => (
                    <tr key={u.id}
                      style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{u.upgradeDate}</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full px-2.5 py-0.5 font-medium"
                          style={{ fontSize: 11, background: u.upgradeType === 'Part Replaced' ? '#FEF3C7' : '#ECFDF5', color: u.upgradeType === 'Part Replaced' ? '#D97706' : '#059669' }}>
                          {u.upgradeType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{u.specBefore ?? '—'}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#10B981', fontWeight: 500 }}>{u.specAfter}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#1E293B' }}>${Number(u.cost).toFixed(2)}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{u.vendorName}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>
                        {u.loggedBy ? `${u.loggedBy.firstName} ${u.loggedBy.lastName}` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditingUpgrade(u); setShowAddUpgrade(true); }}
                            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-blue-50 transition-colors"
                            style={{ fontSize: 12, color: '#2563EB' }}>
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => setDeletingUpgrade(u)}
                            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-red-50 transition-colors"
                            style={{ fontSize: 12, color: '#EF4444' }}>
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

      {/* Drawers & Dialogs */}
      {showEdit && (
        <RegisterAssetDrawer
          assetId={asset.id}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setAsset(updated); setShowEdit(false); }}
        />
      )}
      {showAssign && (
        <AssignAssetDrawer
          asset={asset}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); loadAsset(); }}
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
