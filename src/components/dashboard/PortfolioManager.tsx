"use client";

import { useState, useRef, useCallback } from "react";
import type { PortfolioItem } from "@/lib/mock-data";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast } from "@/components/Toast";
import PortfolioItemEditor from "./PortfolioItemEditor";

function ThumbnailUploadButton({
  itemId,
  onUpload,
}: {
  itemId: string;
  onUpload: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "asset");
        formData.append("itemId", itemId);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        onUpload(data.url);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Upload failed", "error");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [itemId, onUpload, toast]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer px-1.5 py-1 disabled:opacity-50"
      >
        {uploading ? "..." : "Thumb"}
      </button>
    </>
  );
}

interface PortfolioManagerProps {
  initialItems: PortfolioItem[];
}

export default function PortfolioManager({ initialItems }: PortfolioManagerProps) {
  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  function openEditor(item: PortfolioItem | null) {
    setEditingItem(item);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingItem(null);
  }

  async function handleSave(saved: PortfolioItem) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [...prev, saved];
    });
    closeEditor();
    toast("Project saved", "success");
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      setItems((prev) => prev.filter((i) => i.id !== id));
      setDeleteConfirmId(null);
      toast("Project removed", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function persistReorder(newItems: PortfolioItem[]) {
    const order = newItems.map((item, idx) => ({ id: item.id, sortOrder: idx }));
    try {
      const res = await fetch("/api/portfolio/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) throw new Error("Failed to save order");
    } catch {
      toast("Failed to save order", "error");
    }
  }

  async function handleThumbnailUpload(itemId: string, url: string) {
    try {
      const res = await fetch(`/api/portfolio/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailUrl: url }),
      });
      if (!res.ok) throw new Error("Failed to update thumbnail");
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, thumbnailUrl: url } : i))
      );
      toast("Thumbnail updated", "success");
    } catch {
      toast("Failed to update thumbnail", "error");
    }
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setItems((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      persistReorder(next);
      return next;
    });
    toast("Order updated");
  }

  function moveDown(idx: number) {
    if (idx === items.length - 1) return;
    setItems((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      persistReorder(next);
      return next;
    });
    toast("Order updated");
  }

  return (
    <div className="max-w-5xl h-full flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">Portfolio</h1>
          <Button variant="secondary" size="md" onClick={() => openEditor(null)}>
            Add project
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2">

      {/* Items list */}
      {items.length === 0 && (
        <div className="border border-dashed border-border rounded-[10px] py-16 px-8 text-center">
          <div className="w-10 h-10 rounded-[10px] bg-surface-muted flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-[14px] font-medium text-text-primary mb-1">
            Add your first project
          </p>
          <p className="text-[13px] text-text-muted max-w-[280px] mx-auto">
            Start building your portfolio to showcase your work and attract project inquiries.
          </p>
          <button
            onClick={() => openEditor(null)}
            className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 bg-[#0a0a0a] text-white text-[13px] font-medium rounded-lg transition-colors hover:bg-[#171717] cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add project
          </button>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item, idx) => {
          const livePreview = item.assets.find((a) => a.type === "live_preview");
          return (
            <div
              key={item.id}
              className="border border-border rounded-[10px] overflow-hidden flex items-center gap-4 pr-3 group"
            >
              {/* Thumbnail / live preview */}
              <div className="w-[72px] h-[60px] bg-surface-muted flex-shrink-0 flex items-center justify-center overflow-hidden relative">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={`${item.title} thumbnail`}
                    className="w-full h-full object-cover"
                  />
                ) : livePreview ? (
                  <iframe
                    src={livePreview.url}
                    title={`${item.title} preview`}
                    className="w-[360px] h-[300px] border-0 pointer-events-none select-none"
                    style={{ transform: "scale(0.2)", transformOrigin: "top left" }}
                    tabIndex={-1}
                    sandbox="allow-scripts allow-same-origin"
                    loading="lazy"
                  />
                ) : (
                  <svg className="w-5 h-5 text-text-muted/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 py-2.5">
                <p className="text-[13px] font-medium text-text-primary truncate">{item.title}</p>
                <p className="text-[12px] text-text-muted truncate mt-0.5">{item.description}</p>
              </div>

              {/* Asset count */}
              <span className="text-[11px] font-mono text-text-muted bg-surface-muted rounded-md px-2 py-[3px] flex-shrink-0">
                {item.assets.length} asset{item.assets.length !== 1 ? "s" : ""}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <ThumbnailUploadButton
                  itemId={item.id}
                  onUpload={(url) => handleThumbnailUpload(item.id, url)}
                />
                <button
                  onClick={() => openEditor(item)}
                  className="text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer px-1.5 py-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmId(item.id)}
                  className="text-[12px] text-text-muted hover:text-negative transition-colors cursor-pointer px-1.5 py-1"
                >
                  Delete
                </button>
              </div>

              {/* Reorder controls */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="text-text-secondary hover:text-text-primary disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer p-1 rounded hover:bg-surface-muted"
                  aria-label="Move up"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === items.length - 1}
                  className="text-text-secondary hover:text-text-primary disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer p-1 rounded hover:bg-surface-muted"
                  aria-label="Move down"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Drag handle (visual only) */}
              <div className="flex-shrink-0 text-text-muted/30 cursor-grab">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="5" cy="3" r="1.2" />
                  <circle cx="11" cy="3" r="1.2" />
                  <circle cx="5" cy="8" r="1.2" />
                  <circle cx="11" cy="8" r="1.2" />
                  <circle cx="5" cy="13" r="1.2" />
                  <circle cx="11" cy="13" r="1.2" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      </div>

      {/* Editor modal */}
      <Modal
        open={editorOpen}
        onClose={closeEditor}
        title={editingItem ? "Edit project" : "New project"}
        size="xl"
      >
        <PortfolioItemEditor
          item={editingItem}
          onSave={handleSave}
          onClose={closeEditor}
        />
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete project"
        size="sm"
      >
        <p className="text-[13px] text-text-secondary mb-5">
          Are you sure you want to delete this project? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            disabled={deleting}
            className="bg-negative hover:bg-negative/90 text-white"
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
