'use client';

import { useRef, useState } from 'react';
import { uploadFile, type UploadedFile } from '@/lib/upload-client';

interface Props {
  type: UploadedFile['type'];
  multiple?: boolean;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
}

// One shared control for Photos, Receipt, and Warranty document capture —
// see "Camera / gallery capture UX" in docs/DESIGN.md. `capture` opens the
// device camera on mobile; the same input is a normal file picker on desktop.
export function FileCaptureInput({ type, multiple = false, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    if (!multiple && value.length > 0) {
      const ok = window.confirm('Replace the existing file?');
      if (!ok) return;
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(Array.from(fileList).map((f) => uploadFile(f, type)));
      onChange(multiple ? [...value, ...uploaded] : [uploaded[0]]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const accept = type === 'PHOTO' ? 'image/*' : 'image/*,application/pdf';

  if (multiple) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.map((f, idx) => (
          <div key={idx} className="relative h-14 w-14 overflow-hidden rounded-lg bg-border">
            {f.mimeType.startsWith('image/') && <img src={f.blobUrl} className="h-full w-full object-cover" alt="" />}
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== idx))}
              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] leading-none text-white"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex h-14 w-14 items-center justify-center rounded-lg border-[1.5px] border-dashed border-border text-text-secondary"
        >
          <CameraIcon />
        </button>
        <input ref={inputRef} type="file" accept={accept} capture="environment" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>
    );
  }

  const file = value[0];
  return (
    <button
      type="button"
      disabled={uploading}
      onClick={() => inputRef.current?.click()}
      className={`flex w-full items-center gap-2.5 rounded-lg border-[1.5px] p-3.5 text-left ${
        file ? 'border-solid border-border text-text' : 'border-dashed border-border text-text-secondary'
      }`}
    >
      <CameraIcon />
      {file ? (
        <>
          <span className="flex-1 truncate text-xs font-semibold">{file.fileName}</span>
          <span className="text-[11px] text-text-secondary">Change</span>
        </>
      ) : (
        <span className="text-xs">{uploading ? 'Uploading…' : 'Tap to take a photo or choose a file'}</span>
      )}
      <input ref={inputRef} type="file" accept={accept} capture="environment" hidden onChange={(e) => handleFiles(e.target.files)} />
    </button>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="flex-shrink-0">
      <path d="M4 8a2 2 0 012-2h1l1.4-2h7.2L17 6h1a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
