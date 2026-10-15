/**
 * Text colour for a warranty expiry date in asset tables: red once expired or
 * within 30 days, amber within 90 days, muted otherwise or when there is no
 * warranty. Shared by the admin Asset Inventory and the employee My Assets list.
 */
export function warrantyStyle(expiry?: string | null) {
  if (!expiry) return 'text-muted-foreground/80';
  const days = Math.floor((new Date(expiry).getTime() - Date.now()) / 86400000);
  if (days < 0) return 'text-danger font-semibold';
  if (days <= 30) return 'text-danger';
  if (days <= 90) return 'text-warning-foreground';
  return 'text-muted-foreground';
}
