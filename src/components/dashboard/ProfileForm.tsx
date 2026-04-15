"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Input from "../Input";
import Textarea from "../Textarea";
import Button from "../Button";
import Badge from "../Badge";
import VerifiedSeal from "../VerifiedSeal";
import { useToast } from "../Toast";
import FileUploadButton from "./FileUploadButton";
import {
  SPECIALTIES,
  SPECIALTY_LABELS,
  type Specialty,
} from "@/lib/mock-data";

const AVAILABILITY_OPTIONS = [
  { value: "available" as const, label: "Available", dot: "bg-emerald-500" },
  { value: "selective" as const, label: "Selective", dot: "bg-amber-400" },
  { value: "unavailable" as const, label: "Unavailable", dot: "bg-neutral-400" },
];

type Availability = "available" | "selective" | "unavailable";

type ProfileData = {
  displayName: string;
  tagline: string;
  location: string;
  bio: string;
  specialties: Specialty[];
  hourlyRate: string;
  availability: Availability;
  githubUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  avatarUrl: string;
  gifPreviewUrl: string;
};

interface ProfileFormProps {
  initialData?: Partial<ProfileData>;
  onFormChange?: (data: ProfileData) => void;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-[10px] p-5">
      <div className="mb-4">
        <h3 className="text-[14px] font-medium text-text-primary">{title}</h3>
        {description && (
          <p className="text-[12px] text-text-muted mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function isRealUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export default function ProfileForm({ initialData, onFormChange }: ProfileFormProps) {
  const [form, setForm] = useState<ProfileData>({
    displayName: initialData?.displayName ?? "",
    tagline: initialData?.tagline ?? "",
    location: initialData?.location ?? "",
    bio: initialData?.bio ?? "",
    specialties: initialData?.specialties ?? [],
    hourlyRate: initialData?.hourlyRate ?? "",
    availability: initialData?.availability ?? "available",
    githubUrl: initialData?.githubUrl ?? "",
    twitterUrl: initialData?.twitterUrl ?? "",
    linkedinUrl: initialData?.linkedinUrl ?? "",
    websiteUrl: initialData?.websiteUrl ?? "",
    avatarUrl: initialData?.avatarUrl ?? "",
    gifPreviewUrl: initialData?.gifPreviewUrl ?? "",
  });

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Notify parent of form changes
  useEffect(() => {
    onFormChange?.(form);
  }, [form, onFormChange]);

  const update = <K extends keyof ProfileData>(
    field: K,
    value: ProfileData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSpecialty = (s: Specialty) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      toast("Profile saved", "success");
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Something went wrong",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setForm({
      displayName: initialData?.displayName ?? "",
      tagline: initialData?.tagline ?? "",
      location: initialData?.location ?? "",
      bio: initialData?.bio ?? "",
      specialties: initialData?.specialties ?? [],
      hourlyRate: initialData?.hourlyRate ?? "",
      availability: initialData?.availability ?? "available",
      githubUrl: initialData?.githubUrl ?? "",
      twitterUrl: initialData?.twitterUrl ?? "",
      linkedinUrl: initialData?.linkedinUrl ?? "",
      websiteUrl: initialData?.websiteUrl ?? "",
      avatarUrl: initialData?.avatarUrl ?? "",
      gifPreviewUrl: initialData?.gifPreviewUrl ?? "",
    });
    toast("Changes discarded", "info");
  };

  const hasPfp = isRealUrl(form.avatarUrl) || form.avatarUrl.startsWith("/pfp/");

  const initials = form.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasGif = form.gifPreviewUrl && isRealUrl(form.gifPreviewUrl);
  const thumbnailUrl = hasGif ? form.gifPreviewUrl : form.avatarUrl;
  const availabilityColor =
    form.availability === "available"
      ? "bg-emerald-500"
      : form.availability === "selective"
        ? "bg-amber-400"
        : "bg-neutral-400";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
      {/* LEFT COLUMN: Form */}
      <div className="space-y-5">
        {/* IDENTITY */}
        <SectionCard title="Identity" description="Your name, photo, and how you appear in the gallery.">
          {/* PFP + Name + Tagline row */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            {/* PFP */}
            <div className="flex-shrink-0">
              <div className="relative w-[100px] h-[100px]">
                {hasPfp ? (
                  <div className="w-full h-full rounded-full overflow-hidden pfp-static">
                    {isRealUrl(form.avatarUrl) ? (
                      <img
                        src={form.avatarUrl}
                        alt={form.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image
                        src={form.avatarUrl}
                        alt={form.displayName}
                        width={100}
                        height={100}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full bg-surface-muted flex items-center justify-center text-[24px] font-semibold text-text-muted select-none">
                    {initials || "?"}
                  </div>
                )}
                {/* Overlay upload button */}
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("pfp-upload-trigger");
                    input?.click();
                  }}
                  className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/40 transition-colors duration-150 flex items-center justify-center group cursor-pointer"
                >
                  <svg
                    className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              {/* Hidden file upload */}
              <div className="hidden">
                <FileUploadButton
                  type="pfp"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  label="Change photo"
                  onUpload={(url) => update("avatarUrl", url)}
                  className="[&>div]:!p-0 [&>div]:!border-0"
                />
              </div>
              {/* Actual clickable hidden input approach */}
              <input
                id="pfp-upload-trigger"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("type", "pfp");
                  try {
                    const res = await fetch("/api/upload", { method: "POST", body: formData });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Upload failed");
                    update("avatarUrl", data.url);
                    toast("Profile photo updated", "success");
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "Upload failed", "error");
                  }
                  e.target.value = "";
                }}
              />
            </div>

            {/* Name + Tagline */}
            <div className="flex-1 space-y-3">
              <Input
                label="Name"
                value={form.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                placeholder="Your display name"
              />
              <Input
                label="Tagline"
                value={form.tagline}
                onChange={(e) => update("tagline", e.target.value)}
                placeholder="What you do in a few words"
              />
            </div>
          </div>

          {/* GIF Preview */}
          <div className="space-y-2">
            <div>
              <label className="block text-[13px] font-medium text-text-primary">
                Browse feed preview
              </label>
              <p className="text-[12px] text-text-muted mt-0.5">
                This GIF plays as your thumbnail in the gallery
              </p>
            </div>
            {hasGif && (
              <div className="w-[160px] aspect-[3/2] rounded-lg overflow-hidden border border-border">
                <img
                  src={form.gifPreviewUrl}
                  alt="GIF preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <FileUploadButton
              type="preview"
              accept="image/gif"
              label="Upload GIF preview"
              onUpload={(url) => update("gifPreviewUrl", url)}
            />
          </div>

          {/* Availability */}
          <div className="mt-4">
            <label className="block text-[13px] font-medium text-text-primary mb-2">
              Availability
            </label>
            <div className="inline-flex border border-border rounded-lg overflow-hidden">
              {AVAILABILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("availability", opt.value)}
                  className={`px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer border-r border-border last:border-r-0 flex items-center gap-2 ${
                    form.availability === opt.value
                      ? "bg-[#0a0a0a] text-white"
                      : "bg-background text-text-secondary hover:bg-surface-muted"
                  }`}
                >
                  <span className={`w-[6px] h-[6px] rounded-full ${
                    form.availability === opt.value ? "bg-white/70" : opt.dot
                  }`} />
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-muted mt-2">
              {form.availability === "available"
                ? "You are open to new project inquiries."
                : form.availability === "selective"
                  ? "You are selectively accepting projects."
                  : "You are not accepting new projects."}
            </p>
          </div>
        </SectionCard>

        {/* ABOUT */}
        <SectionCard title="About" description="Tell potential clients about yourself.">
          <div className="space-y-4">
            <Textarea
              label="Bio"
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              maxChars={500}
              currentLength={form.bio.length}
              placeholder="A brief description of your experience and what you bring to projects..."
            />
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              placeholder="San Francisco, CA"
            />
          </div>
        </SectionCard>

        {/* EXPERTISE */}
        <SectionCard title="Expertise" description="Your specializations and pricing.">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
            {/* Specialties */}
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-2">
                Specialties
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer border inline-flex items-center gap-1.5 ${
                      form.specialties.includes(s)
                        ? "bg-[#171717] text-[#fafafa] border-[#171717] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                        : "bg-background text-text-secondary border-border hover:border-border-hover"
                    }`}
                  >
                    {form.specialties.includes(s) && (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                    {SPECIALTY_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Rate */}
            <div>
              <Input
                label="Rate"
                placeholder="$150-250/hr"
                value={form.hourlyRate}
                onChange={(e) => update("hourlyRate", e.target.value)}
              />
            </div>
          </div>
        </SectionCard>

        {/* LINKS */}
        <SectionCard title="Links" description="Connect your online presence.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
                <svg className="w-3.5 h-3.5 text-text-muted" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </label>
              <input
                value={form.githubUrl}
                onChange={(e) => update("githubUrl", e.target.value)}
                placeholder="https://github.com/username"
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:border-text-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
                <svg className="w-3.5 h-3.5 text-text-muted" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                Twitter / X
              </label>
              <input
                value={form.twitterUrl}
                onChange={(e) => update("twitterUrl", e.target.value)}
                placeholder="https://twitter.com/username"
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:border-text-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
                <svg className="w-3.5 h-3.5 text-text-muted" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                LinkedIn
              </label>
              <input
                value={form.linkedinUrl}
                onChange={(e) => update("linkedinUrl", e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:border-text-secondary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
                <svg className="w-3.5 h-3.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Website
              </label>
              <input
                value={form.websiteUrl}
                onChange={(e) => update("websiteUrl", e.target.value)}
                placeholder="https://yoursite.com"
                className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:border-text-secondary"
              />
            </div>
          </div>
        </SectionCard>

        {/* SAVE */}
        <div className="border border-border rounded-[10px] px-5 py-4 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={handleDiscard}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>

      {/* RIGHT COLUMN: Browse feed preview */}
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <span className="block text-[11px] font-mono uppercase text-text-muted tracking-wider mb-3">
            Browse feed preview
          </span>
          <div className="rounded-[10px] overflow-hidden border border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {/* Thumbnail area */}
            <div className={`relative aspect-[3/2] bg-surface-muted overflow-hidden ${hasGif ? "" : hasPfp ? "pfp-static" : ""}`}>
              {(hasPfp || hasGif) ? (
                <img
                  src={thumbnailUrl}
                  alt={form.displayName || "Preview"}
                  className="w-full h-full object-cover grayscale-[15%]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[32px] font-semibold text-text-muted/40 select-none">
                    {initials || "?"}
                  </span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
            </div>
            {/* Info section */}
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                {/* Mini avatar */}
                <div className="w-6 h-6 rounded-md bg-surface-muted overflow-hidden flex-shrink-0">
                  {hasPfp ? (
                    <img
                      src={form.avatarUrl}
                      alt={form.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] font-medium text-text-muted">
                      {initials || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] font-medium text-text-primary truncate">
                      {form.displayName || "Your Name"}
                    </span>
                    <Badge variant="verified" />
                  </div>
                  <span className="text-[12px] text-text-muted truncate block">
                    {form.specialties.length > 0
                      ? SPECIALTY_LABELS[form.specialties[0]]
                      : "Specialty"}
                    {form.location ? ` \u00B7 ${form.location}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`w-[6px] h-[6px] rounded-full ${availabilityColor} flex-shrink-0`} />
                  <span className="text-[11px] font-mono text-text-muted">
                    {form.hourlyRate || "$--/hr"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
