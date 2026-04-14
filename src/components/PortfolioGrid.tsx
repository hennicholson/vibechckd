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
      <div className="border border-border rounded-[10px] overflow-hidden">
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.04 }}
            onClick={() => onItemClick(item)}
            className={`w-full text-left flex items-start gap-4 px-4 py-4 hover:bg-background-alt transition-colors duration-150 cursor-pointer ${
              i < items.length - 1 ? "border-b border-border" : ""
            }`}
          >
            {/* Folder icon */}
            <div className="w-9 h-9 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-medium text-text-primary">{item.title}</h3>
              <p className="text-[12px] text-text-muted mt-0.5 line-clamp-1">{item.description}</p>
              <div className="mt-2">
                <AssetTypePills assets={item.assets} />
              </div>
            </div>
            <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-border rounded-[10px] overflow-hidden">
      {items.map((item, i) => (
        <motion.button
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.05 }}
          onClick={() => onItemClick(item)}
          className="text-left border-b border-r border-border hover:bg-background-alt transition-colors duration-150 cursor-pointer"
        >
          {/* Thumbnail */}
          <div className="aspect-[3/2] bg-surface-muted flex items-center justify-center">
            <svg className="w-6 h-6 text-border-hover" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="text-[13px] font-medium text-text-primary">{item.title}</h3>
            <p className="text-[12px] text-text-muted mt-1 line-clamp-2">{item.description}</p>
            <p className="text-[11px] text-text-muted mt-2">{item.assets.length} asset{item.assets.length !== 1 ? "s" : ""}</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
