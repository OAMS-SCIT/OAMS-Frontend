'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  images: { id: string; url: string }[];
  /** Index of the currently-shown image. */
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  /** Optional caption (e.g. the asset name), shown top-left. */
  title?: string;
}

/**
 * Full-screen image viewer rendered via a portal on document.body. Shows one
 * image at a time with prev/next navigation (wrap-around), a counter, and a
 * thumbnail strip. Closes on Escape, backdrop click, or the X button; the arrow
 * keys navigate. Display-only — no editing here.
 *
 * Follows the portal + Escape pattern in components/ui/PortalMenu.tsx.
 */
export function ImageLightbox({ images, index, onIndexChange, onClose, title }: Props) {
  const count = images.length;
  // Clamp so an out-of-range index (e.g. after a removal) still renders.
  const safeIndex = Math.min(Math.max(index, 0), Math.max(0, count - 1));

  const goPrev = () => onIndexChange((safeIndex - 1 + count) % count);
  const goNext = () => onIndexChange((safeIndex + 1) % count);

  // Keyboard: Escape closes, arrows navigate.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && count > 1) goPrev();
      else if (e.key === 'ArrowRight' && count > 1) goNext();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex, count]);

  // Lock body scroll while the lightbox is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (typeof document === 'undefined' || count === 0) return null;

  const current = images[safeIndex];

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 10000, background: 'rgba(0,0,0,0.85)', animation: 'oamsLightboxFade 0.2s ease-out' }}
      onClick={onClose}
    >
      <style>{`
        @keyframes oamsLightboxFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes oamsLightboxZoom {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
      {/* Top bar: title + counter + close */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-semibold text-white/85">
          {title ?? 'Image'}
          {count > 1 && (
            <span className="font-normal text-white/55 ml-2.5">
              {safeIndex + 1} / {count}
            </span>
          )}
        </span>
        <button
          onClick={onClose}
          className="rounded-full flex items-center justify-center w-9 h-9 bg-white/[0.12] transition-colors hover:bg-white/20"
          title="Close (Esc)"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main stage */}
      <div className="flex-1 flex items-center justify-center px-4 min-h-0 relative">
        {count > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 rounded-full flex items-center justify-center w-11 h-11 bg-white/[0.12] transition-colors hover:bg-white/20"
            title="Previous (←)"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={title ?? 'Asset image'}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '90vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: 8,
            animation: 'oamsLightboxZoom 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {count > 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 rounded-full flex items-center justify-center w-11 h-11 bg-white/[0.12] transition-colors hover:bg-white/20"
            title="Next (→)"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {count > 1 && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-4 shrink-0 flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => onIndexChange(i)}
              className={`rounded-control overflow-hidden transition-all w-14 h-14 p-0 border-2 ${
                i === safeIndex ? 'border-white opacity-100' : 'border-transparent opacity-55 hover:opacity-80'
              }`}
              title={`Image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
