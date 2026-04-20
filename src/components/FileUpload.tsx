"use client";

import { useState, useRef, useCallback } from "react";

interface UploadedFile {
  name: string;
  url: string;
}

interface FileUploadProps {
  label?: string;
  accept?: string;
  className?: string;
  onFilesChange: (files: UploadedFile[]) => void;
  files?: UploadedFile[];
}

export default function FileUpload({
  label = "Upload Files",
  accept,
  className = "",
  onFilesChange,
  files = [],
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadedFile | null> => {
      setError("");
      setUploading(file.name);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "asset");

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        return { name: file.name, url: data.url };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        return null;
      } finally {
        setUploading(null);
      }
    },
    []
  );

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      const fileArray = Array.from(fileList);
      let currentFiles = [...files];

      for (const file of fileArray) {
        const uploaded = await uploadFile(file);
        if (uploaded) {
          currentFiles = [...currentFiles, uploaded];
          onFilesChange(currentFiles);
        }
      }

      if (inputRef.current) inputRef.current.value = "";
    },
    [files, uploadFile, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      const updated = files.filter((_, i) => i !== index);
      onFilesChange(updated);
    },
    [files, onFilesChange]
  );

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);

  return (
    <div className={className}>
      {label && (
        <label className="block text-[13px] font-medium text-text-primary mb-1.5">
          {label}
        </label>
      )}
      <div
        className={`border-[1.5px] border-dashed rounded-xl p-8 text-center transition-all duration-150 cursor-pointer ${
          dragOver
            ? "border-text-primary bg-surface-muted scale-[1.01]"
            : "border-border-hover hover:border-text-muted"
        } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-5 h-5 text-text-muted animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <p className="text-[13px] text-text-muted">
              Uploading{" "}
              <span className="font-mono text-text-secondary">{uploading}</span>
            </p>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 bg-surface-muted rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-5 h-5 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <p className="text-[13px] text-text-muted">
              Drag files here or{" "}
              <span className="text-text-primary">click to browse</span>
            </p>
            <p className="text-[11px] text-text-muted mt-1 font-mono">
              PNG, JPG, PDF, GIF, MP4
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-[12px] text-negative mt-1.5">{error}</p>
      )}

      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md"
            >
              {isImage(file.name) ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-6 h-6 rounded object-cover flex-shrink-0"
                />
              ) : (
                <svg
                  className="w-4 h-4 text-text-muted flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              )}
              <span className="text-[12px] text-text-secondary font-mono truncate flex-1">
                {file.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { UploadedFile };
