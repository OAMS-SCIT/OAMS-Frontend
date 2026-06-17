'use client';

import { useRef, useState } from 'react';
import { CloudUpload, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED = ['image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_EXT = '.jpg, .jpeg, .png';
const MAX_FILES = 5;

export interface UploadedImage {
  /** Unique key for React list rendering */
  key: string;
  file: File;
  previewUrl: string;
}

/** An image already persisted on the server (Cloudinary URL). */
export interface ExistingImage {
  id: string;
  url: string;
}

interface Props {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  /**
   * Images already saved on the server (edit mode). Rendered as removable
   * thumbnails; removal calls `onRemoveExisting`. They count toward MAX_FILES.
   */
  existing?: ExistingImage[];
  onRemoveExisting?: (id: string) => void;
  /** When true the drop zone is disabled (e.g. an upload is in flight). */
  uploading?: boolean;
}

export function ImageUploadZone({
  images,
  onChange,
  existing = [],
  onRemoveExisting,
  uploading = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const total = existing.length + images.length;

  const processFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const remaining = MAX_FILES - total;

    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} images allowed.`);
      return;
    }

    const valid: UploadedImage[] = [];
    const rejected: string[] = [];

    for (const file of arr.slice(0, remaining)) {
      if (!ACCEPTED.includes(file.type)) {
        rejected.push(file.name);
        continue;
      }
      valid.push({
        key: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }

    if (rejected.length > 0) {
      toast.error(`Rejected (unsupported format): ${rejected.join(', ')}. Only JPG and PNG are allowed.`);
    }

    if (valid.length > 0) {
      onChange([...images, ...valid]);
    }
  };

  const removeImage = (key: string) => {
    const updated = images.filter((img) => img.key !== key);
    // Revoke the old object URL to prevent memory leaks
    const removed = images.find((img) => img.key === key);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    onChange(updated);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => { if (!uploading) inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { if (uploading) { e.preventDefault(); return; } onDrop(e); }}
        className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-8 transition-colors ${
          dragging ? 'border-info bg-secondary' : 'border-input bg-muted/50'
        } ${uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <CloudUpload className={`w-8 h-8 mb-3 ${dragging ? 'text-info' : 'text-muted-foreground/50'}`} />
        <div className={`font-medium mb-1 text-sm ${dragging ? 'text-primary' : 'text-muted-foreground'}`}>
          {uploading ? 'Uploading…' : 'Drag images here or click to browse'}
        </div>
        <div className="text-xs text-muted-foreground/80">
          {ACCEPTED_EXT} · Max {MAX_FILES} images · {total}/{MAX_FILES} added
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          multiple
          className="hidden"
          onChange={onInputChange}
        />
      </div>

      {/* Thumbnails: existing (server) images first, then newly-staged files */}
      {(existing.length > 0 || images.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {existing.map((img) => (
            <div
              key={img.id}
              className="relative rounded-md overflow-hidden w-[72px] h-[72px] border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt="Asset image"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {onRemoveExisting && (
                <button
                  onClick={(e) => { e.stopPropagation(); if (!uploading) onRemoveExisting(img.id); }}
                  disabled={uploading}
                  className="absolute top-0.5 right-0.5 rounded-full flex items-center justify-center w-[18px] h-[18px] bg-danger hover:opacity-90 transition-opacity disabled:opacity-50"
                  title="Remove"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              )}
            </div>
          ))}
          {images.map((img) => (
            <div
              key={img.key}
              className="relative rounded-md overflow-hidden w-[72px] h-[72px] border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={img.file.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(img.key); }}
                className="absolute top-0.5 right-0.5 rounded-full flex items-center justify-center w-[18px] h-[18px] bg-danger hover:opacity-90 transition-opacity"
                title="Remove"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 flex items-center gap-0.5 px-1 py-0.5 bg-black/50">
                <ImageIcon className="w-2.5 h-2.5 text-white shrink-0" />
                <span className="text-white truncate text-[8px]">{img.file.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
