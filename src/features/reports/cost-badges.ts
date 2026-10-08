import type { CostCategory } from '@/types';

/** Badge colours per cost category/type, shared by the report previews. */
export const CATEGORY_BADGE: Record<CostCategory, string> = {
  Purchase: 'bg-info-surface text-info-foreground',
  Upgrade: 'bg-warning-surface text-warning-foreground',
  Repair: 'bg-secondary text-secondary-foreground',
  Accessories: 'bg-purple-surface text-purple-foreground',
};
