'use client';

import { Suspense } from 'react';
import { MyAssets } from '@/features/employees/my-assets';

// MyAssets reads its list state from useSearchParams, which needs a Suspense
// boundary or the production build fails on this prerendered route.
export default function MyAssetsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16 text-2sm text-muted-foreground">
          Loading your assets…
        </div>
      }
    >
      <MyAssets />
    </Suspense>
  );
}
