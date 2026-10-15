import type { CSSProperties, ReactNode } from 'react';

/**
 * A labelled value row for the detail cards on the admin and employee asset
 * detail views. A null or undefined value renders as a placeholder dash.
 */
export function InfoRow({ label, value, mono, style }: {
  label: string; value: ReactNode; mono?: boolean; style?: CSSProperties;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-border/60">
      <span className="micro-label font-semibold tracking-[0.04em]">{label}</span>
      <span className={`text-2sm text-foreground ${mono ? 'font-mono' : ''}`} style={style}>{value ?? '—'}</span>
    </div>
  );
}
