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
    <div className="border border-border rounded-[10px] overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-surface-muted border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-[7px] h-[7px] rounded-full bg-border-hover" />
          <div className="w-[7px] h-[7px] rounded-full bg-border-hover" />
          <div className="w-[7px] h-[7px] rounded-full bg-border-hover" />
        </div>
        <div className="flex-1 mx-2">
          <div className="bg-background border border-border rounded-md px-2.5 py-1 text-[11px] font-mono text-text-muted truncate">
            {asset.url}
          </div>
        </div>
      </div>
      {/* iframe */}
      <div className="aspect-[16/9] bg-surface-muted">
        <iframe
          src={asset.url}
          className="w-full h-full border-0"
          title={asset.title}
          sandbox="allow-scripts allow-same-origin"
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

  return (
    <div>
      {/* Back / breadcrumb */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-text-muted hover:text-text-primary transition-colors duration-150 mb-4 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to work
        </button>
      )}

      {/* Header */}
      <div className="mb-6 pr-8">
        <h2 className="text-[22px] font-semibold text-text-primary tracking-[-0.02em] leading-[1.2]">{item.title}</h2>
        <p className="text-[14px] text-text-secondary mt-2 leading-[1.6]">{item.description}</p>
        <p className="text-[11px] text-text-muted font-mono mt-3 tracking-[0.04em]">
          {item.assets.length} asset{item.assets.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-5">
        {/* Live preview assets with browser chrome */}
        {liveAssets.map((asset) => (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.08em] mb-2">{asset.title}</p>
            <LivePreviewAsset asset={asset} />
          </motion.div>
        ))}

        {/* Image assets as thumbnail grid */}
        {imageAssets.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.08em] mb-2">Images</p>
            <ImageAssetGrid assets={imageAssets} />
          </motion.div>
        )}

        {/* File assets as bordered list */}
        {fileAssets.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <p className="text-[11px] font-mono text-text-muted uppercase tracking-[0.08em] mb-2">Files</p>
            <FileAssetList assets={fileAssets} />
          </motion.div>
        )}
      </div>
    </div>
  );
}
