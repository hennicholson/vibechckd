"use client";

import { useState, useEffect } from "react";
import PortfolioManager from "@/components/dashboard/PortfolioManager";
import type { PortfolioItem } from "@/lib/mock-data";

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/portfolio")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load portfolio");
        return res.json();
      })
      .then((data) => {
        // Map DB shape to component shape
        const mapped: PortfolioItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description ?? "",
          thumbnailUrl: item.thumbnailUrl ?? "",
          assets: (item.assets ?? []).map((a: any) => ({
            id: a.id,
            type: a.assetType,
            title: a.title,
            url: a.fileUrl ?? "",
            thumbnailUrl: a.thumbnailUrl,
          })),
        }));
        setItems(mapped);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <p className="text-negative text-[14px]">Error: {error}</p>
      </div>
    );
  }

  if (items === null) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-28 bg-surface-muted rounded animate-pulse" />
          <div className="h-9 w-24 bg-surface-muted rounded-lg animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-[10px] h-[72px] animate-pulse bg-surface-muted" />
          ))}
        </div>
      </div>
    );
  }

  return <PortfolioManager initialItems={items} />;
}
