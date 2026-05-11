"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PortfolioItem } from "@/lib/mock-data";
import Modal from "@/components/Modal";
import Button from "@/components/Button";
import { useToast, failed } from "@/components/Toast";
import { containerVariants, itemVariants } from "@/lib/motion";
import PageIntroOverlay from "@/components/PageIntroOverlay";
import { usePageIntro } from "@/lib/use-page-intro";
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
  const [showIntro, doneIntro] = usePageIntro("intro:portfolio");
  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Tracks which live-preview iframes have finished loading so we can
  // fade their shimmer overlay out. Iframes mount lazily and external
  // sites can take a beat — without an overlay the cards just stay
  // surface-muted blank, which felt broken.
  const [loadedPreviews, setLoadedPreviews] = useState<Set<string>>(new Set());
  const markPreviewLoaded = useCallback((id: string) => {
    setLoadedPreviews((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  const { toast } = useToast();

  // Sidebar quick action: ?new=1 → open the new-project editor on mount
  // and strip the param so a refresh doesn't re-open it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("new") === "1") {
      setEditingItem(null);
      setEditorOpen(true);
      sp.delete("new");
      const url =
        window.location.pathname + (sp.toString() ? `?${sp.toString()}` : "");
      window.history.replaceState({}, "", url);
    }
  }, []);

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
      toast(failed("save the new order"), "error");
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
      toast(failed("update the thumbnail"), "error");
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
    // `relative` anchors the PageIntroOverlay below — intro plays
    // OVER the page shell so the skeleton + portfolio cards are
    // already laid out when it fades.
    <div className="w-full h-full flex flex-col relative">
      <AnimatePresence>
        {showIntro && (
          <PageIntroOverlay
            key="portfolio-intro"
            lottiePath="/lottie/portfolio-intro.json"
            wordmark="PORTFOLIO"
            onDone={doneIntro}
          />
        )}
      </AnimatePresence>
      {/* Sticky header — same shell as Projects / Earnings / Inbox so
          the title left-edge + baseline lock across dashboard tabs. */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
              Portfolio
            </h1>
            {items.length > 0 && (
              <p className="text-[11px] font-mono text-text-muted mt-0.5 tabular-nums">
                {items.length} project{items.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => openEditor(null)}>
            Add project
          </Button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-10 pt-3">

      {/* Empty state — bigger and more inviting, matches Projects'
          empty treatment so the dashboard feels coherent. */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
              <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-[14px] font-medium text-text-primary mb-1">
            Add your first project
          </p>
          <p className="text-[12px] text-text-muted mb-4 max-w-[320px] leading-relaxed">
            Showcase your work — projects you've shipped, demos you're proud of, anything that makes clients want to hire you.
          </p>
          <Button variant="primary" size="md" onClick={() => openEditor(null)}>
            Add project
          </Button>
        </div>
      )}

      {/* Card grid — 1-col on mobile, 2-col on lg+. Same breakpoints
          and stagger variants as Projects so the dashboard reads as
          one design system. Cards lead with the work image (the
          portfolio's actual currency) and the title sits underneath. */}
      {items.length > 0 && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          <AnimatePresence>
            {items.map((item, idx) => {
              const livePreview = item.assets.find((a) => a.type === "live_preview");
              return (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  layout
                  className="group relative border border-border rounded-[12px] overflow-hidden bg-background hover:border-border-hover transition-colors"
                >
                  {/* Hero — 16:10 thumbnail / live preview / fallback */}
                  <button
                    type="button"
                    onClick={() => openEditor(item)}
                    className="block w-full relative aspect-[16/10] bg-surface-muted overflow-hidden cursor-pointer"
                    aria-label={`Edit ${item.title}`}
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={`${item.title} thumbnail`}
                        className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                      />
                    ) : livePreview ? (
                      <>
                        <iframe
                          src={livePreview.url}
                          title={`${item.title} preview`}
                          className="w-[500%] h-[500%] border-0 pointer-events-none select-none origin-top-left"
                          style={{ transform: "scale(0.2)" }}
                          tabIndex={-1}
                          sandbox="allow-scripts allow-same-origin"
                          loading="lazy"
                          onLoad={() => markPreviewLoaded(item.id)}
                        />
                        {/* Loading shimmer — pulsing surface + mono
                            "LOADING" tick fades out once the iframe
                            fires onLoad. Beats the bare gray box. */}
                        {!loadedPreviews.has(item.id) && (
                          <div className="absolute inset-0 bg-surface-muted animate-pulse flex items-center justify-center pointer-events-none">
                            <div className="flex items-center gap-2 text-text-muted">
                              <svg
                                className="w-3.5 h-3.5 animate-spin"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="9"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeOpacity="0.25"
                                />
                                <path
                                  d="M21 12a9 9 0 0 0-9-9"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="text-[10px] font-mono uppercase tracking-[0.18em]">
                                Loading
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-text-muted/40">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Body */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className="text-[14px] font-medium text-text-primary truncate min-w-0 flex-1">
                        {item.title}
                      </p>
                      <span className="text-[10px] font-mono text-text-muted bg-surface-muted rounded-md px-2 py-[3px] flex-shrink-0 tabular-nums">
                        {item.assets.length} asset{item.assets.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-[12px] text-text-muted line-clamp-2 leading-relaxed min-h-[2.4em]">
                      {item.description || "No description yet."}
                    </p>

                    {/* Actions row — text-style buttons matching the
                        rest of the dashboard. Reorder controls tuck
                        into the right side so they don't dominate.
                        Reorder chevrons stay visible on mobile (no
                        hover state) so phone users can actually
                        reorder; on md+ they fade in on hover. */}
                    <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/60">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <button
                          onClick={() => openEditor(item)}
                          className="text-[12px] text-text-secondary hover:text-text-primary transition-colors cursor-pointer py-1"
                        >
                          Edit
                        </button>
                        <span className="text-text-muted/40 text-[10px]">·</span>
                        <ThumbnailUploadButton
                          itemId={item.id}
                          onUpload={(url) => handleThumbnailUpload(item.id, url)}
                        />
                        <span className="text-text-muted/40 text-[10px]">·</span>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="text-[12px] text-text-muted hover:text-negative transition-colors cursor-pointer py-1"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="text-text-muted hover:text-text-primary disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer p-1.5 md:p-1 rounded hover:bg-surface-muted"
                          aria-label="Move up"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveDown(idx)}
                          disabled={idx === items.length - 1}
                          className="text-text-muted hover:text-text-primary disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer p-1.5 md:p-1 rounded hover:bg-surface-muted"
                          aria-label="Move down"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

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
