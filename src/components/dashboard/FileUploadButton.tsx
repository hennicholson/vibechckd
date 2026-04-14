"use client";

import { useState, useRef, useCallback } from "react";
import { useToast } from "@/components/Toast";

interface FileUploadButtonProps {
  type: "pfp" | "preview" | "asset";
  itemId?: string;
  onUpload: (url: string) => void;
  accept?: string;
  label?: string;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileUploadButton({
  type,
  itemId,
  onUpload,
  accept,
  label = "Upload",
  className = "",
}: FileUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setFileSize(file.size);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);
        if (itemId) formData.append("itemId", itemId);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        toast(
          type === "pfp"
            ? "Profile photo updated"
            : type === "preview"
              ? "GIF preview uploaded"
              : "File uploaded",
          "success"
        );
        onUpload(data.url);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        toast(message, "error");
      } finally {
        setUploading(false);
        setFileName(null);
        setFileSize(null);
        // Reset the input so the same file can be re-selected
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [type, itemId, onUpload, toast]
  );

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      handleUpload(file);
    },
    [handleUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  return (
    <div className={className}>
      <div
        className={`
          border border-dashed rounded-lg p-4 text-center transition-all duration-150 cursor-pointer select-none
          ${dragOver ? "border-text-primary bg-surface-muted" : "border-border hover:border-border-hover"}
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            {/* Spinner */}
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
            {fileName && (
              <p className="text-[12px] text-text-secondary font-mono truncate max-w-full">
                {fileName}
                {fileSize != null && (
                  <span className="text-text-muted ml-1">
                    ({formatFileSize(fileSize)})
                  </span>
                )}
              </p>
            )}
            <p className="text-[11px] text-text-muted">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
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
            <p className="text-[13px] text-text-muted">
              {label}{" "}
              <span className="text-text-secondary">or drag and drop</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
