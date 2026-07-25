'use client';

import { useRef } from 'react';
import { FileText, ImageIcon, Paperclip, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ACCEPTED_ATTR = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';
const MAX_BYTES = 10 * 1024 * 1024;

const UNSUPPORTED_MSG =
  'Unsupported file format. Please upload a PDF, JPG, or PNG file.';
const SIZE_EXCEEDED_MSG = 'File size exceeds the 10 MB limit';

export function isAcceptedDocument(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  // Some browsers leave type empty for certain PDFs — fall back to extension.
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ext === 'pdf' || ext === 'jpg' || ext === 'jpeg' || ext === 'png';
}

export function validateDocumentFile(file: File): string | null {
  if (!isAcceptedDocument(file)) return UNSUPPORTED_MSG;
  if (file.size > MAX_BYTES) return SIZE_EXCEEDED_MSG;
  return null;
}

interface Props {
  label: string;
  /** Newly picked file (staged locally until save). */
  file: File | null;
  onPick: (file: File | null) => void;
  /** Existing document URL when editing an asset that already has one. */
  existingUrl?: string | null;
  /** Display name for the existing document, when known. */
  existingFileName?: string | null;
  /** Hint under the attach button. */
  hint?: string;
}

/**
 * Optional single-document picker (PDF / JPG / PNG, max 10 MB).
 * Enforces acceptance-criteria error copy via toast on invalid picks.
 */
export function DocumentPickerField({
  label,
  file,
  onPick,
  existingUrl,
  existingFileName,
  hint = 'PDF, JPG, or PNG · max 10 MB',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null;
    if (!next) {
      onPick(null);
      return;
    }
    const error = validateDocumentFile(next);
    if (error) {
      toast.error(error);
      clearInput();
      return;
    }
    onPick(next);
  };

  const existingLabel =
    existingFileName?.trim() ||
    (existingUrl ? 'Existing document attached' : null);

  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium text-foreground/80">
        {label} <span className="text-muted-foreground/70">(Optional)</span>
      </label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_ATTR}
        className="hidden"
        onChange={handleChange}
      />
      {file ? (
        <div className="flex items-center gap-2 rounded-control border border-border px-3 py-2 bg-muted/40">
          {file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') ? (
            <FileText className="w-4 h-4 text-danger shrink-0" />
          ) : (
            <ImageIcon className="w-4 h-4 text-primary shrink-0" />
          )}
          <span className="text-xs text-foreground/80 truncate flex-1">{file.name}</span>
          <button
            type="button"
            onClick={() => {
              onPick(null);
              clearInput();
            }}
            className="text-muted-foreground hover:text-danger transition-colors"
            aria-label="Remove file"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      ) : existingUrl ? (
        <div className="flex items-center gap-2 rounded-control border border-border px-3 py-2 bg-muted/40">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate flex-1">{existingLabel}</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-primary hover:underline shrink-0"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 w-full rounded-control border border-dashed border-border px-3 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:border-ring"
        >
          <Paperclip className="w-4 h-4 shrink-0" />
          Attach document ({hint})
        </button>
      )}
    </div>
  );
}
