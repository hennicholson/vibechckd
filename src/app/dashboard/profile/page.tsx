"use client";

import { useEffect, useState } from "react";
import ProfileForm from "@/components/dashboard/ProfileForm";

export default function ProfilePage() {
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) setInitialData(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl px-8 py-6">
      <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
        Profile
      </h1>
      {loading ? (
        <div className="mt-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-surface-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <ProfileForm initialData={initialData ?? undefined} />
      )}
    </div>
  );
}
