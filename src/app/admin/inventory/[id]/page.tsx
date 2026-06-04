'use client';

import { AssetDetail } from '@/features/assets/asset-detail';
import { useApp } from '@/providers/app-provider';

export default function AdminAssetDetailPage() {
  const { assets, updateAssetStatus, returnAsset, assignAsset } = useApp();
  return (
    <AssetDetail
      assets={assets}
      onUpdateStatus={updateAssetStatus}
      onReturnAsset={returnAsset}
      onAssignAsset={assignAsset}
    />
  );
}
