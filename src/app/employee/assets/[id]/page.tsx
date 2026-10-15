'use client';

import { Suspense } from 'react';
import { MyAssetDetail } from '@/features/employees/my-asset-detail';

// MyAssetDetail reads ?from= (the list state to return to) via useSearchParams,
// which needs a Suspense boundary or the production build fails.
export default function MyAssetDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-2sm text-muted-foreground">
          Loading asset…
        </div>
      }
    >
      <MyAssetDetail />
    </Suspense>
  );
}
