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

interface Props {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
}

export function ImageUploadZone({ images, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const remaining = MAX_FILES - images.length;

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
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-8 cursor-pointer transition-colors"
        style={{
          borderColor: dragging ? '#3B82F6' : '#CBD5E1',
          background: dragging ? '#EFF6FF' : '#FAFAFA',
        }}
      >
        <CloudUpload className="w-8 h-8 mb-3" style={{ color: dragging ? '#3B82F6' : '#CBD5E1' }} />
        <div className="font-medium mb-1" style={{ fontSize: 14, color: dragging ? '#2563EB' : '#64748B' }}>
          Drag images here or click to browse
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>
          {ACCEPTED_EXT} · Max {MAX_FILES} images · {images.length}/{MAX_FILES} added
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

      {/* Thumbnail previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {images.map((img) => (
            <div
              key={img.key}
              className="relative rounded-lg overflow-hidden"
              style={{ width: 72, height: 72, border: '1px solid #E2E8F0', background: '#F8FAFC' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt={img.file.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); removeImage(img.key); }}
                className="absolute top-0.5 right-0.5 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                style={{ width: 18, height: 18, background: '#EF4444' }}
                title="Remove"
              >
                <X className="w-2.5 h-2.5 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 flex items-center gap-0.5 px-1 py-0.5"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                <ImageIcon className="w-2.5 h-2.5 text-white shrink-0" />
                <span className="text-white truncate" style={{ fontSize: 8 }}>{img.file.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
