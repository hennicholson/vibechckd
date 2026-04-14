"use client";

import { useState } from "react";
import type { PortfolioItem, PortfolioAsset } from "@/lib/mock-data";
import Input from "@/components/Input";
import Textarea from "@/components/Textarea";
import Button from "@/components/Button";
import Tag from "@/components/Tag";

const ASSET_TYPES = ["pdf", "image", "video", "live_preview", "figma"] as const;

const ASSET_TYPE_LABELS: Record<PortfolioAsset["type"], string> = {
  pdf: "PDF",
  image: "Image",
  video: "Video",
  live_preview: "Live Preview",
  figma: "Figma",
};

const ASSET_TYPE_ICONS: Record<PortfolioAsset["type"], React.ReactNode> = {
  pdf: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  image: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  video: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  live_preview: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  figma: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3H8.5a3.5 3.5 0 000 7H12m0-7h3.5a3.5 3.5 0 010 7H12m0-7v7m0 0H8.5a3.5 3.5 0 000 7H12m0-7h3.5a3.5 3.5 0 010 7H12m0-7v7" />
    </svg>
  ),
};

interface PortfolioItemEditorProps {
  item: PortfolioItem | null;
  onSave: (item: PortfolioItem) => void;
  onClose: () => void;
}

export default function PortfolioItemEditor({ item, onSave, onClose }: PortfolioItemEditorProps) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [assets, setAssets] = useState<PortfolioAsset[]>(item?.assets ?? []);

  // Add asset form state
  const [newAssetType, setNewAssetType] = useState<PortfolioAsset["type"]>("image");
  const [newAssetTitle, setNewAssetTitle] = useState("");
  const [newAssetUrl, setNewAssetUrl] = useState("");

  const livePreviewAsset = assets.find((a) => a.type === "live_preview");

  function handleAddAsset() {
    if (!newAssetTitle.trim() || !newAssetUrl.trim()) return;
    const asset: PortfolioAsset = {
      id: `a-${Date.now()}`,
      type: newAssetType,
      title: newAssetTitle.trim(),
      url: newAssetUrl.trim(),
    };
    setAssets((prev) => [...prev, asset]);
    setNewAssetTitle("");
    setNewAssetUrl("");
    setNewAssetType("image");
  }

  function handleRemoveAsset(assetId: string) {
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  }

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      id: item?.id ?? `pi-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      thumbnailUrl: item?.thumbnailUrl ?? "",
      assets,
    });
  }

  return (
    <div className="space-y-5">
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Project name"
      />

      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Brief description of the project"
        maxChars={200}
        currentLength={description.length}
      />

      {/* Assets list */}
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-text-primary">Assets</p>

        {assets.length > 0 && (
          <div className="border border-border rounded-[10px] divide-y divide-border">
            {assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="text-text-muted flex-shrink-0">
                  {ASSET_TYPE_ICONS[asset.type]}
                </span>
                <Tag>{ASSET_TYPE_LABELS[asset.type]}</Tag>
                <span className="text-[13px] text-text-primary truncate flex-1">
                  {asset.title}
                </span>
                <span className="text-[11px] font-mono text-text-muted truncate max-w-[160px]">
                  {asset.url}
                </span>
                <button
                  onClick={() => handleRemoveAsset(asset.id)}
                  className="text-[12px] text-text-muted hover:text-negative transition-colors cursor-pointer flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {assets.length === 0 && (
          <p className="text-[12px] text-text-muted py-3">No assets yet. Add one below.</p>
        )}
      </div>

      {/* Add asset form */}
      <div className="border border-border rounded-[10px] p-3 space-y-3 bg-background-alt">
        <p className="text-[12px] font-medium text-text-secondary">Add asset</p>
        <div className="grid grid-cols-[auto_1fr] gap-3 items-end">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-text-primary">Type</label>
            <select
              value={newAssetType}
              onChange={(e) => setNewAssetType(e.target.value as PortfolioAsset["type"])}
              className="bg-background border border-border rounded-lg px-3 py-2.5 text-[14px] text-text-primary transition-colors duration-150 focus:outline-none focus:border-text-secondary cursor-pointer"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ASSET_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Title"
            value={newAssetTitle}
            onChange={(e) => setNewAssetTitle(e.target.value)}
            placeholder="Asset title"
          />
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              label="URL"
              value={newAssetUrl}
              onChange={(e) => setNewAssetUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddAsset}
            disabled={!newAssetTitle.trim() || !newAssetUrl.trim()}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Live preview iframe */}
      {livePreviewAsset && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-text-primary">Live preview</p>
          <div className="border border-border rounded-[10px] overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-muted border-b border-border">
              <div className="flex gap-1.5">
                <span className="w-[10px] h-[10px] rounded-full bg-border" />
                <span className="w-[10px] h-[10px] rounded-full bg-border" />
                <span className="w-[10px] h-[10px] rounded-full bg-border" />
              </div>
              <div className="flex-1 bg-background border border-border rounded-md px-2.5 py-1 text-[11px] font-mono text-text-muted truncate">
                {livePreviewAsset.url}
              </div>
              <a
                href={livePreviewAsset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            <iframe
              src={livePreviewAsset.url}
              title={livePreviewAsset.title}
              className="w-full h-[300px] bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!title.trim()}>
          Save
        </Button>
      </div>
    </div>
  );
}
