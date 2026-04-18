"use client";

import { motion } from "framer-motion";
import type { PortfolioItem, PortfolioAsset } from "@/lib/mock-data";

const assetLabels: Record<PortfolioAsset["type"], string> = {
  pdf: "PDF",
  image: "Image",
  video: "Video",
  live_preview: "Live",
  figma: "Figma",
};

const assetIcons: Record<PortfolioAsset["type"], React.ReactNode> = {
  live_preview: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  image: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  pdf: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  video: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  figma: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3H9a3 3 0 000 6h3m0-6v6m0-6h3a3 3 0 010 6h-3m0 0H9a3 3 0 000 6h3m0-6v6m0 0H9a3 3 0 010-6h3m0 6v-6m0 0h3a3 3 0 000-6h-3" />
    </svg>
  ),
};

function LivePreviewAsset({ asset }: { asset: PortfolioAsset }) {
  return (
    <div className="flex flex-col h-full">
      {/* Compact browser chrome */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-muted border-b border-border flex-shrink-0">
        <div className="flex gap-1 flex-shrink-0">
          <div className="w-[6px] h-[6px] rounded-full bg-[#ef4444]/50" />
          <div className="w-[6px] h-[6px] rounded-full bg-[#f59e0b]/50" />
          <div className="w-[6px] h-[6px] rounded-full bg-[#22c55e]/50" />
        </div>
        <div className="flex-1 min-w-0 mx-1">
          <div className="bg-background border border-border rounded px-2 py-0.5 text-[10px] font-mono text-text-muted truncate">
            {asset.url}
          </div>
        </div>
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-text-muted hover:text-text-primary border border-border rounded hover:border-border-hover transition-colors no-underline flex-shrink-0"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open
        </a>
      </div>
      {/* iframe -- full size, scrollable */}
      <div className="flex-1 bg-surface-muted overflow-hidden">
        <iframe
          src={asset.url}
          className="w-full h-full border-0"
          title={asset.title}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="lazy"
        />
      </div>
    </div>
  );
}

function ImageAssetGrid({ assets }: { assets: PortfolioAsset[] }) {
  return (
    <div className={`grid gap-3 ${assets.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {assets.map((asset) => (
        <a
          key={asset.id}
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group border border-border rounded-[10px] overflow-hidden hover:border-border-hover transition-colors duration-150"
        >
          <div className="aspect-[4/3] bg-surface-muted flex items-center justify-center">
            <svg className="w-5 h-5 text-border-hover" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="px-3 py-2">
            <p className="text-[12px] text-text-secondary truncate">{asset.title}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

function FileAssetList({ assets }: { assets: PortfolioAsset[] }) {
  return (
    <div className="border border-border rounded-[10px] overflow-hidden">
      {assets.map((asset, i) => (
        <a
          key={asset.id}
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 px-3.5 py-3 hover:bg-background-alt transition-colors duration-150 ${
            i < assets.length - 1 ? "border-b border-border" : ""
          }`}
        >
          <div className="w-7 h-7 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0 text-text-muted">
            {assetIcons[asset.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-text-primary truncate">{asset.title}</p>
            <p className="text-[11px] text-text-muted">{assetLabels[asset.type]}</p>
          </div>
          <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ))}
    </div>
  );
}

export default function PortfolioFolder({ item, onBack }: { item: PortfolioItem; onBack?: () => void }) {
  const liveAssets = item.assets.filter((a) => a.type === "live_preview");
  const imageAssets = item.assets.filter((a) => a.type === "image");
  const fileAssets = item.assets.filter((a) => a.type === "pdf" || a.type === "video" || a.type === "figma");
  const hasLivePreview = liveAssets.length > 0;

  // Full-height layout for live previews -- minimal chrome, max iframe space
  if (hasLivePreview) {
    return (
      <div className="flex flex-col h-full">
        {/* Compact inline header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary transition-colors cursor-pointer flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h2 className="text-[14px] font-semibold text-text-primary truncate flex-1">{item.title}</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {liveAssets[0] && (
              <a
                href={liveAssets[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover hover:text-text-primary transition-colors no-underline"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open in new tab
              </a>
            )}
            {onBack && (
              <button
                onClick={onBack}
                className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {/* Live preview fills remaining space */}
        <div className="flex-1 min-h-0">
          <LivePreviewAsset asset={liveAssets[0]} />
        </div>
      </div>
    );
  }

  // Standard layout for non-live-preview items
  return (
    <div className="p-6">
      {/* Back */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors duration-150 mb-4 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      {/* Header */}
      <div className="mb-6 pr-8">
        <h2 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">{item.title}</h2>
        {item.description && (
          <p className="text-[13px] text-text-secondary mt-2 leading-[1.6]">{item.description}</p>
        )}
      </div>

      <div className="space-y-5">
        {imageAssets.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <ImageAssetGrid assets={imageAssets} />
          </motion.div>
        )}

        {fileAssets.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <FileAssetList assets={fileAssets} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
