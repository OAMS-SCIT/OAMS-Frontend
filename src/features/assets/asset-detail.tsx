'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight, Pencil, UserPlus, RotateCcw, Monitor, Plus } from 'lucide-react';
import { Asset, AssetStatus, AssetCondition } from '@/types';
import { mockAssignmentHistory, mockUpgradeLogs, mockUsers } from '@/lib/mock-data';
import { StatusBadge, ConditionBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { AssignModal } from '@/components/overlays/AssignModal';
import { ReturnModal } from '@/components/overlays/ReturnModal';

interface Props {
  assets: Asset[];
  onUpdateStatus: (id: string, status: AssetStatus) => void;
  onReturnAsset: (id: string) => void;
  onAssignAsset: (assetId: string, employeeId: string, employeeName: string) => void;
}

function InfoRow({ label, value, mono, style }: { label: string; value: React.ReactNode; mono?: boolean; style?: React.CSSProperties }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1E293B', fontFamily: mono ? 'monospace' : undefined, ...style }}>{value || '—'}</span>
    </div>
  );
}

export function AssetDetail({ assets, onUpdateStatus, onReturnAsset, onAssignAsset }: Props) {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'history' | 'upgrades'>('history');
  const [showAssign, setShowAssign] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  const asset = assets.find(a => a.id === id);
  if (!asset) {
    return (
      <div className="text-center py-20">
        <p style={{ fontSize: 16, color: '#64748B' }}>Asset not found.</p>
        <button onClick={() => router.push('/admin/inventory')} className="mt-4 text-blue-600 hover:underline">Back to Inventory</button>
      </div>
    );
  }

  const assignmentHistory = mockAssignmentHistory.filter(a => a.assetId === asset.id);
  const upgradeLogs = mockUpgradeLogs.filter(u => u.assetId === asset.id);
  const activeAssignment = assignmentHistory.find(a => a.isActive);

  const warrantyDays = asset.warrantyExpiry
    ? Math.floor((new Date(asset.warrantyExpiry).getTime() - Date.now()) / 86400000) : null;
  const warrantyStyle = warrantyDays !== null
    ? { color: warrantyDays < 0 ? '#EF4444' : warrantyDays <= 30 ? '#EF4444' : warrantyDays <= 90 ? '#F59E0B' : '#1E293B' }
    : {};

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5" style={{ fontSize: 13 }}>
        <button onClick={() => router.push('/admin/inventory')} className="hover:text-blue-600 transition-colors" style={{ color: '#64748B' }}>
          Asset Inventory
        </button>
        <ChevronRight className="w-4 h-4" style={{ color: '#CBD5E1' }} />
        <span className="font-semibold" style={{ color: '#1E293B' }}>{asset.name}</span>
      </div>

      {/* Hero Card */}
      <div className="rounded-2xl p-6 mb-6 flex gap-8" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Device placeholder image */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="rounded-xl flex items-center justify-center" style={{ width: 180, height: 140, background: '#F1F5F9' }}>
            <Monitor className="w-16 h-16" style={{ color: '#CBD5E1' }} />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map(n => (
              <div key={n} className="rounded-lg" style={{ width: 50, height: 40, background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
            ))}
          </div>
        </div>

        {/* Asset Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-bold mb-1" style={{ fontSize: 22, color: '#1E293B' }}>{asset.name}</h1>
              <div style={{ fontSize: 13, color: '#94A3B8', fontFamily: 'monospace' }}>{asset.id}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={asset.status} size="lg" />
            </div>
          </div>

          <div className="flex gap-6 mt-4">
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>LOCATION</div>
              <div style={{ fontSize: 13, color: '#475569' }}>{asset.location}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>CONDITION</div>
              <ConditionBadge condition={asset.condition} />
            </div>
            {asset.assignedTo && (
              <div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>ASSIGNED TO</div>
                <div className="flex items-center gap-2">
                  <Avatar name={asset.assignedTo} size={22} />
                  <span style={{ fontSize: 13, color: '#475569' }}>{asset.assignedTo}</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 mt-5">
            {asset.status === 'Available' && (
              <button onClick={() => setShowAssign(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
                style={{ background: '#10B981', fontSize: 14 }}>
                <UserPlus className="w-4 h-4" /> Assign Asset
              </button>
            )}
            {asset.status === 'Assigned' && (
              <button onClick={() => setShowReturn(true)}
                className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-white hover:opacity-90 transition-colors"
                style={{ background: '#F59E0B', fontSize: 14 }}>
                <RotateCcw className="w-4 h-4" /> Process Return
              </button>
            )}
            <button className="flex items-center gap-2 rounded-lg border px-4 py-2.5 font-medium hover:bg-gray-50 transition-colors"
              style={{ fontSize: 14, borderColor: '#E2E8F0', color: '#475569' }}>
              <Pencil className="w-4 h-4" /> Edit Asset
            </button>
          </div>
        </div>
      </div>

      {/* Info Grid - 3 columns */}
      <div className="grid gap-5 mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {/* Core Specs */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: '#1E293B' }}>Core Specifications</h3>
          <InfoRow label="Brand" value={asset.brand} />
          <InfoRow label="Model" value={asset.model} />
          <InfoRow label="Serial Number" value={asset.serialNumber} mono />
          <InfoRow label="Category" value={asset.categoryName} />
          <InfoRow label="Device Type" value={asset.deviceType} />
          {asset.customAttributes && asset.customAttributes.length > 0 && (
            <>
              <div className="mt-3 mb-2" style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 600 }}>
                Category Attributes
              </div>
              {asset.customAttributes.map(attr => (
                <InfoRow key={attr.id} label={attr.label} value={attr.value} />
              ))}
            </>
          )}
        </div>

        {/* Financial & Warranty */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: '#1E293B' }}>Financial & Warranty</h3>
          <InfoRow label="Purchase Date" value={asset.purchaseDate} />
          <InfoRow label="Purchase Price" value={asset.purchasePrice ? `$${asset.purchasePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : undefined} />
          <InfoRow label="Vendor / Supplier" value={asset.vendor} />
          <InfoRow label="Purchase Order Ref." value={asset.purchaseOrderRef} />
          <InfoRow label="Warranty Start" value={asset.warrantyStart} />
          <InfoRow label="Warranty Expiry" value={
            asset.warrantyExpiry ? (
              <span style={warrantyStyle}>
                {asset.warrantyExpiry}
                {warrantyDays !== null && warrantyDays < 0 && <span className="ml-2 text-xs">(Expired)</span>}
                {warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 90 && <span className="ml-2 text-xs">({warrantyDays} days left)</span>}
              </span>
            ) : undefined
          } />
          <InfoRow label="Warranty Provider" value={asset.warrantyProvider} />
        </div>

        {/* Physical Details */}
        <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: '#1E293B' }}>Physical Details</h3>
          <InfoRow label="Condition" value={<ConditionBadge condition={asset.condition} />} />
          <InfoRow label="Location" value={asset.location} />
          <InfoRow label="Registered Date" value={asset.registeredDate} />
          <InfoRow label="Registered By" value={asset.registeredBy} />
          <InfoRow label="Last Modified" value={asset.lastModified} />
        </div>
      </div>

      {/* Tabbed History Panel */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {/* Tab Bar */}
        <div className="flex items-center border-b" style={{ borderColor: '#E2E8F0', padding: '0 24px' }}>
          {[
            { key: 'history', label: 'Assignment History' },
            { key: 'upgrades', label: 'Upgrade Log' },
          ].map(tab => (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key as 'history' | 'upgrades')}
              className="relative mr-6 py-4 font-medium transition-colors"
              style={{
                fontSize: 14, color: activeTab === tab.key ? '#1E3A8A' : '#64748B',
                borderBottom: activeTab === tab.key ? '2px solid #1E3A8A' : '2px solid transparent',
              }}>
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {activeTab === 'history' && asset.status === 'Available' && (
            <button onClick={() => setShowAssign(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 my-3 font-semibold hover:opacity-90 transition-colors"
              style={{ fontSize: 13, background: '#1E3A8A', color: '#fff' }}>
              <Plus className="w-3.5 h-3.5" /> Assign Asset
            </button>
          )}
          {activeTab === 'upgrades' && (
            <button className="flex items-center gap-1.5 rounded-lg border px-3 py-2 my-3 font-medium hover:bg-gray-50 transition-colors"
              style={{ fontSize: 13, borderColor: '#E2E8F0', color: '#475569' }}>
              <Plus className="w-3.5 h-3.5" /> Add Upgrade Entry
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'history' && (
          assignmentHistory.length === 0 ? (
            <EmptyState icon="history" title="No assignment history yet" subtitle="This asset has never been assigned. Use the 'Assign Asset' button to create the first assignment." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 900 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Employee', 'Assigned Date', 'Expected Return', 'Actual Return', 'Condition (Assign)', 'Condition (Return)', 'Notes', 'Assigned By'].map(h => (
                      <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignmentHistory.map((rec, i) => {
                    const user = mockUsers.find(u => u.id === rec.employeeId);
                    return (
                      <tr key={rec.id} style={{
                        background: rec.isActive ? '#fff' : '#F8FAFC',
                        borderBottom: '1px solid #F1F5F9',
                        borderLeft: rec.isActive ? '3px solid #3B82F6' : '3px solid transparent',
                      }}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Avatar user={user} name={rec.employeeName} size={28} />
                            <div>
                              <div className="font-medium" style={{ fontSize: 13, color: '#1E293B' }}>{rec.employeeName}</div>
                              <div style={{ fontSize: 11, color: '#94A3B8' }}>{rec.employeeDesignation}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{rec.assignedDate}</td>
                        <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{rec.expectedReturn || '—'}</td>
                        <td className="px-5 py-3.5">
                          {rec.isActive
                            ? <span className="inline-flex items-center rounded-full px-2.5 py-0.5 font-medium" style={{ fontSize: 11, background: '#EFF6FF', color: '#2563EB' }}>Currently Assigned</span>
                            : <span style={{ fontSize: 13, color: '#64748B' }}>{rec.actualReturn || '—'}</span>}
                        </td>
                        <td className="px-5 py-3.5"><ConditionBadge condition={rec.conditionAtAssignment} /></td>
                        <td className="px-5 py-3.5">{rec.conditionAtReturn ? <ConditionBadge condition={rec.conditionAtReturn} /> : <span style={{ color: '#CBD5E1' }}>—</span>}</td>
                        <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B', maxWidth: 180 }}>{rec.notes || '—'}</td>
                        <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{rec.assignedBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'upgrades' && (
          upgradeLogs.length === 0 ? (
            <EmptyState icon="assets" title="No upgrades recorded" subtitle="No upgrade entries have been added for this asset yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 800 }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    {['Date', 'Upgrade Type', 'Before', 'After', 'Cost', 'Vendor', 'Logged By', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3" style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upgradeLogs.map((log, i) => (
                    <tr key={log.id} style={{ background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{log.date}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, fontWeight: 500, color: '#1E293B' }}>{log.upgradeType}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{log.specBefore}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#10B981', fontWeight: 500 }}>{log.specAfter}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#1E293B' }}>${log.cost.toFixed(2)}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{log.vendor}</td>
                      <td className="px-5 py-3.5" style={{ fontSize: 13, color: '#64748B' }}>{log.loggedBy}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button className="text-blue-500 hover:text-blue-700 text-xs font-medium">Edit</button>
                          <button className="text-red-400 hover:text-red-600 text-xs font-medium">Delete</button>
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

      {showAssign && (
        <AssignModal
          asset={asset}
          onClose={() => setShowAssign(false)}
          onConfirm={(employeeId, employeeName, date) => {
            onAssignAsset(asset.id, employeeId, employeeName);
            setShowAssign(false);
          }}
        />
      )}
      {showReturn && (
        <ReturnModal
          asset={asset}
          onClose={() => setShowReturn(false)}
          onConfirm={() => { onReturnAsset(asset.id); setShowReturn(false); }}
        />
      )}
    </div>
  );
}
