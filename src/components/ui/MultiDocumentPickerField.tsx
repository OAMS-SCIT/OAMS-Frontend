'use client';

import { useRef } from 'react';
import { FileText, ImageIcon, Paperclip, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { validateDocumentFile } from './DocumentPickerField';

const ACCEPTED_ATTR = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';
const MAX_DOCS = 10;

export interface StagedDocument {
  key: string;
  file: File;
}

export interface ExistingDocument {
  id: string;
  url: string;
  fileName: string;
}

interface Props {
  label: string;
  /** Newly picked files (staged locally until save). */
  files: StagedDocument[];
  onChange: (files: StagedDocument[]) => void;
  /** Documents already saved on the server (edit mode). */
  existing?: ExistingDocument[];
  /** Called when the user removes an existing (server) document. */
  onRemoveExisting?: (id: string) => void;
  hint?: string;
}

/**
 * Optional multi-document picker (PDF / JPG / PNG, max 10 MB each).
 * Reuses DocumentPickerField validation so error copy matches acceptance criteria.
 */
export function MultiDocumentPickerField({
  label,
  files,
  onChange,
  existing = [],
  onRemoveExisting,
  hint = 'PDF, JPG, or PNG · max 10 MB each',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const total = existing.length + files.length;
  const remaining = MAX_DOCS - total;

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;

    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_DOCS} warranty documents allowed.`);
      clearInput();
      return;
    }

    const accepted: StagedDocument[] = [];
    for (const file of picked.slice(0, remaining)) {
      const error = validateDocumentFile(file);
      if (error) {
        toast.error(error);
        continue;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
      });
    }

    if (accepted.length > 0) {
      onChange([...files, ...accepted]);
    }
    clearInput();
  };

  const removeStaged = (key: string) => {
    onChange(files.filter((f) => f.key !== key));
  };

  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium text-foreground/80">
        {label} <span className="text-muted-foreground/70">(Optional)</span>
      </label>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_ATTR}
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {(existing.length > 0 || files.length > 0) && (
        <div className="space-y-2 mb-2">
          {existing.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-2 rounded-control border border-border px-3 py-2 bg-muted/40"
            >
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate flex-1">
                {doc.fileName?.trim() || 'Existing document attached'}
              </span>
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={() => onRemoveExisting(doc.id)}
                  className="text-muted-foreground hover:text-danger transition-colors"
                  aria-label="Remove document"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {files.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-2 rounded-control border border-border px-3 py-2 bg-muted/40"
            >
              {item.file.type === 'application/pdf' ||
              item.file.name.toLowerCase().endsWith('.pdf') ? (
                <FileText className="w-4 h-4 text-danger shrink-0" />
              ) : (
                <ImageIcon className="w-4 h-4 text-primary shrink-0" />
              )}
              <span className="text-xs text-foreground/80 truncate flex-1">
                {item.file.name}
              </span>
              <button
                type="button"
                onClick={() => removeStaged(item.key)}
                className="text-muted-foreground hover:text-danger transition-colors"
                aria-label="Remove file"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 w-full rounded-control border border-dashed border-border px-3 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:border-ring"
        >
          <Paperclip className="w-4 h-4 shrink-0" />
          {files.length > 0 || existing.length > 0
            ? `Add another document (${hint})`
            : `Attach documents (${hint})`}
        </button>
      )}
    </div>
  );
}
