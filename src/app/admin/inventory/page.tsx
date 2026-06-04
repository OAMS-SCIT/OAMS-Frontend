'use client';

import { AssetInventory } from '@/features/assets/asset-inventory';
import { useApp } from '@/providers/app-provider';

export default function AdminInventoryPage() {
  const { assets, addAsset, updateAssetStatus } = useApp();
  return (
    <AssetInventory
      assets={assets}
      onAddAsset={addAsset}
      onUpdateStatus={updateAssetStatus}
    />
  );
}
