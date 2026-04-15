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
  const [progress, setProgress] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = useCallback(
    async (file: File) => {
      setProgress(`${file.name} (${formatFileSize(file.size)})`);
      setUploading(true);

      // Show instant local preview for images
      if (file.type.startsWith("image/") && (type === "pfp" || type === "preview")) {
        const localUrl = URL.createObjectURL(file);
        onUpload(localUrl); // Instant preview — will be replaced with CDN URL
      }

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

        onUpload(data.url); // Replace local preview with CDN URL
        toast(
          type === "pfp" ? "Photo updated" :
          type === "preview" ? "GIF preview uploaded" :
          "File uploaded",
          "success"
        );
      } catch (error) {
        toast(error instanceof Error ? error.message : "Upload failed", "error");
      } finally {
        setUploading(false);
        setProgress(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [type, itemId, onUpload, toast]
  );

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => !uploading && inputRef.current?.click()}
        disabled={uploading}
        className={`inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium border rounded-md transition-colors cursor-pointer ${
          uploading
            ? "border-border text-text-muted bg-surface-muted"
            : "border-border text-text-secondary hover:border-border-hover hover:text-text-primary"
        }`}
      >
        {uploading ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="truncate max-w-[150px]">{progress}</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {label}
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
    </div>
  );
}
