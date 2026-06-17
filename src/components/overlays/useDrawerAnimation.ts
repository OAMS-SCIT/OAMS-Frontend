import { useCallback, useState } from 'react';

/**
 * Plays a slide-out exit animation before the parent unmounts the drawer.
 *
 * Drawers are conditionally mounted by their parent (`{open && <Drawer/>}`), so
 * a raw `onClose()` unmounts instantly with no exit animation. This hook returns
 * a `requestClose` that flips `closing` (swap the panel to its `*-out` keyframe)
 * and defers the real `onClose` until the animation has finished.
 *
 * Reduced-motion users skip straight to `onClose` — no delay, no animation.
 */
export function useDrawerAnimation(onClose: () => void, durationMs = 280) {
  const [closing, setClosing] = useState(false);

  const requestClose = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      onClose();
      return;
    }
    setClosing(true);
    window.setTimeout(onClose, durationMs);
  }, [onClose, durationMs]);

  return { closing, requestClose };
}
