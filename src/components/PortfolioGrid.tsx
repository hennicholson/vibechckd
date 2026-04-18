"use client";

import { motion } from "framer-motion";
import type { PortfolioItem, PortfolioAsset } from "@/lib/mock-data";

interface PortfolioGridProps {
  items: PortfolioItem[];
  onItemClick: (item: PortfolioItem) => void;
  layout?: "grid" | "list";
}

const assetTypeLabels: Record<PortfolioAsset["type"], string> = {
  pdf: "PDF",
  image: "Image",
  video: "Video",
  live_preview: "Live",
  figma: "Figma",
};

function AssetTypePills({ assets }: { assets: PortfolioAsset[] }) {
  const types = [...new Set(assets.map((a) => a.type))];
  return (
    <div className="flex gap-1.5 flex-wrap">
      {types.map((type) => (
        <span
          key={type}
          className="inline-block font-mono text-[10px] text-text-muted bg-surface-muted rounded px-1.5 py-0.5"
        >
          {assetTypeLabels[type]}
        </span>
      ))}
    </div>
  );
}

export default function PortfolioGrid({ items, onItemClick, layout = "grid" }: PortfolioGridProps) {
  if (layout === "list") {
    return (
      <div className="space-y-3">
        {items.map((item, i) => {
          const livePreview = item.assets.find((a) => a.type === "live_preview");
          const thumb = item.thumbnailUrl || item.assets.find((a) => a.type === "image")?.url || "";
          const hasImage = thumb && (thumb.startsWith("http") || thumb.startsWith("/"));

          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              onClick={() => onItemClick(item)}
              className="w-full text-left border border-border rounded-[10px] overflow-hidden hover:border-border-hover transition-colors cursor-pointer group"
            >
              {/* Thumbnail / Live Preview */}
              {livePreview ? (
                <div className="relative aspect-[16/9] bg-surface-muted overflow-hidden">
                  <div className="absolute inset-0 origin-top-left grayscale group-hover:grayscale-0 transition-[filter] duration-500" style={{ width: "200%", height: "200%", transform: "scale(0.5)" }}>
                    <iframe
                      src={livePreview.url}
                      title={item.title}
                      className="w-full h-full border-0 pointer-events-none" scrolling="no"
                      loading="lazy"
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                    <span className="text-[9px] font-medium text-white uppercase tracking-wider">Live</span>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-end justify-start p-3 z-10">
                    <span className="text-[11px] font-medium text-white/0 group-hover:text-white transition-colors duration-300 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                      View
                    </span>
                  </div>
                </div>
              ) : hasImage ? (
                <div className="aspect-[16/9] bg-surface-muted overflow-hidden">
                  <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/9] bg-surface-muted flex items-center justify-center">
                  <svg className="w-6 h-6 text-border-hover" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
              )}

              <div className="px-4 py-3">
                <h3 className="text-[14px] font-medium text-text-primary">{item.title}</h3>
                {item.description && (
                  <p className="text-[12px] text-text-muted mt-0.5 line-clamp-2">{item.description}</p>
                )}
                <div className="mt-2">
                  <AssetTypePills assets={item.assets} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map((item, i) => {
        const livePreview = item.assets.find((a) => a.type === "live_preview");
        const thumb = item.thumbnailUrl || item.assets.find((a) => a.type === "image")?.url || "";
        const hasImage = thumb && (thumb.startsWith("http") || thumb.startsWith("/"));

        return (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
            onClick={() => onItemClick(item)}
            className="text-left border border-border rounded-[10px] overflow-hidden hover:border-border-hover transition-colors cursor-pointer group"
          >
            {livePreview ? (
              <div className="relative aspect-[3/2] bg-surface-muted overflow-hidden">
                <div className="absolute inset-0 origin-top-left grayscale group-hover:grayscale-0 transition-[filter] duration-500" style={{ width: "200%", height: "200%", transform: "scale(0.5)" }}>
                  <iframe
                    src={livePreview.url}
                    title={item.title}
                    className="w-full h-full border-0 pointer-events-none" scrolling="no"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[9px] font-medium text-white uppercase tracking-wider">Live</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <span className="px-4 py-2 text-[12px] font-medium bg-[#171717] text-white rounded-lg shadow-lg">View project</span>
                </div>
              </div>
            ) : hasImage ? (
              <div className="aspect-[3/2] bg-surface-muted overflow-hidden">
                <img src={thumb} alt={item.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-[3/2] bg-surface-muted flex items-center justify-center">
                <svg className="w-6 h-6 text-border-hover" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            )}

            <div className="p-3">
              <h3 className="text-[13px] font-medium text-text-primary">{item.title}</h3>
              <p className="text-[12px] text-text-muted mt-1 line-clamp-2">{item.description}</p>
              <p className="text-[11px] text-text-muted mt-2">{item.assets.length} asset{item.assets.length !== 1 ? "s" : ""}</p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
