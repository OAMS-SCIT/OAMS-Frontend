'use client';

import { createPortal } from 'react-dom';

/**
 * Renders full-screen overlays (drawers, dialogs) into document.body via a
 * portal so their `position: fixed` is relative to the viewport — never trapped
 * by a transformed/animated/overflow ancestor (e.g. the page-mount fade-rise on
 * a page root, or the scrollable <main>). Same pattern as PortalMenu/ImageLightbox.
 *
 * Overlays only ever mount on the client after a user action, so rendering
 * synchronously when `document` exists is safe — no SSR/hydration concern.
 */
export function OverlayPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(<>{children}</>, document.body);
}
