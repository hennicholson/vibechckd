"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/Toast";

interface PersonalProfileData {
  name: string;
  email: string;
  image: string;
  role: string;
  whopLinked: boolean;
}

const blankData: PersonalProfileData = {
  name: "",
  email: "",
  image: "",
  role: "client",
  whopLinked: false,
};

export default function PersonalProfileForm() {
  const { update: updateSession } = useSession();
  const { toast } = useToast();
  const [data, setData] = useState<PersonalProfileData>(blankData);
  const [initial, setInitial] = useState<PersonalProfileData>(blankData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          const next = {
            name: d.name ?? "",
            email: d.email ?? "",
            image: d.image ?? "",
            role: d.role ?? "client",
            whopLinked: !!d.whopLinked,
          };
          setData(next);
          setInitial(next);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isDirty = data.name !== initial.name || data.image !== initial.image;

  const update = useCallback(<K extends keyof PersonalProfileData>(field: K, value: PersonalProfileData[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, image: data.image }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      setInitial({ ...data });
      // Refresh the next-auth session JWT so the sidebar avatar / name
      // reflect the new value without needing a full page reload.
      await updateSession();
      toast("Profile saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => setData({ ...initial });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-surface-muted rounded-[10px] animate-pulse" />
        <div className="h-16 bg-surface-muted rounded-[10px] animate-pulse" />
      </div>
    );
  }

  const initials = data.name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-5">
      {isDirty && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={handleDiscard}
            className="px-3 py-1.5 text-[12px] font-medium text-text-secondary border border-border rounded-md hover:border-border-hover transition-colors cursor-pointer"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 text-[12px] font-medium bg-text-primary text-white rounded-md hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {/* Avatar + name */}
      <section className="border border-border rounded-[10px] p-5">
        <h2 className="text-[14px] font-medium text-text-primary mb-4">Identity</h2>
        <div className="flex items-start gap-4">
          {data.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.image}
              alt={data.name || "Avatar"}
              className="w-16 h-16 rounded-full object-cover bg-surface-muted flex-shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center text-[18px] font-medium text-text-muted flex-shrink-0">
              {initials || "?"}
            </div>
          )}
          <div className="flex-1 space-y-3 min-w-0">
            <Field label="Display name">
              <input
                type="text"
                value={data.name}
                onChange={(e) => update("name", e.target.value.slice(0, 120))}
                placeholder="Your name"
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-[14px] text-text-primary outline-none focus:border-text-primary"
              />
            </Field>
            <Field label="Avatar URL" hint="Paste an image URL (we'll add upload soon).">
              <input
                type="url"
                value={data.image}
                onChange={(e) => update("image", e.target.value)}
                placeholder="https://..."
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-[13px] text-text-primary outline-none focus:border-text-primary font-mono"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* Account info — read-only (changing email lives in Settings) */}
      <section className="border border-border rounded-[10px] p-5">
        <h2 className="text-[14px] font-medium text-text-primary mb-4">Account</h2>
        <div className="space-y-3">
          <Row label="Email" value={data.email} />
          <Row
            label="Role"
            value={data.role === "client" ? "Client" : data.role === "coder" ? "Creator" : data.role}
          />
          <Row label="Signed in via Whop" value={data.whopLinked ? "Yes" : "No"} />
        </div>
        <p className="text-[11px] text-text-muted mt-4">
          Change email or password from{" "}
          <a href="/dashboard/settings" className="underline underline-offset-2 hover:text-text-primary">
            Settings
          </a>
          .
        </p>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-text-muted mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-text-muted mt-1">{hint}</span>}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-b-0">
      <span className="text-[12px] text-text-muted">{label}</span>
      <span className="text-[13px] text-text-primary truncate">{value}</span>
    </div>
  );
}
