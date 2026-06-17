'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  /**
   * Pixel coordinates for where the menu should appear.
   * Typically computed from the trigger button's getBoundingClientRect().
   * top   = button.bottom + a small gap
   * right = window.innerWidth - button.right  (so menu right-aligns with button)
   */
  anchor: { top: number; right: number };
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Renders its children in a fixed-positioned menu attached to document.body
 * via a React portal.  This escapes any overflow:hidden ancestor (e.g. the
 * rounded table container) so the menu is never clipped by a parent element.
 */
export function PortalMenu({ anchor, onClose, children }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Full-screen transparent backdrop — click anywhere to close */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 9998 }}
        onClick={onClose}
      />

      {/* The actual menu */}
      <div
        ref={menuRef}
        className="rounded-xl overflow-hidden py-1 min-w-40 bg-popover text-popover-foreground border border-border shadow-pop motion-safe:animate-pop-in"
        style={{
          position: 'fixed',
          top: anchor.top,
          right: anchor.right,
          zIndex: 9999,
        }}
        // Prevent the backdrop click from firing when clicking inside the menu
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

/** Convenience: a single item inside a PortalMenu */
export function PortalMenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-2sm cursor-pointer transition-colors ${danger ? 'text-danger hover:bg-danger-surface' : 'text-foreground hover:bg-accent'}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
