"use client";

import { useState, useRef } from "react";

interface FileUploadProps {
  label?: string;
  accept?: string;
  className?: string;
}

export default function FileUpload({ label = "Upload Files", accept, className = "" }: FileUploadProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const names = Array.from(fileList).map((f) => f.name);
    setFiles((prev) => [...prev, ...names]);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-[13px] font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <div
        className={`border-[1.5px] border-dashed rounded-xl p-8 text-center transition-all duration-150 cursor-pointer ${
          dragOver ? "border-text-primary bg-surface-muted scale-[1.01]" : "border-border-hover hover:border-text-muted"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="w-10 h-10 bg-surface-muted rounded-lg flex items-center justify-center mx-auto mb-3">
        <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        </div>
        <p className="text-[13px] text-text-muted">
          Drag files here or <span className="text-text-primary">click to browse</span>
        </p>
        <p className="text-[11px] text-text-muted mt-1 font-mono">
          PNG, JPG, PDF, GIF, MP4, ZIP
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((name, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md">
              <span className="text-[12px] text-text-secondary font-mono truncate flex-1">{name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((_, j) => j !== i)); }}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
