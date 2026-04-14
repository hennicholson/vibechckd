"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Input from "../Input";
import Textarea from "../Textarea";
import Button from "../Button";
import { useToast } from "../Toast";
import FileUploadButton from "./FileUploadButton";
import {
  SPECIALTIES,
  SPECIALTY_LABELS,
  coders,
  type Specialty,
} from "@/lib/mock-data";

const defaultProfile = coders[0];

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "selective", label: "Selective" },
  { value: "unavailable", label: "Unavailable" },
] as const;

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
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const [form, setForm] = useState<ProfileData>({
    displayName: initialData?.displayName ?? defaultProfile.displayName,
    tagline: initialData?.tagline ?? defaultProfile.tagline,
    location: initialData?.location ?? defaultProfile.location,
    bio: initialData?.bio ?? defaultProfile.bio,
    specialties: initialData?.specialties ?? [...defaultProfile.specialties],
    hourlyRate: initialData?.hourlyRate ?? defaultProfile.hourlyRate,
    availability: initialData?.availability ?? defaultProfile.availability,
    githubUrl: initialData?.githubUrl ?? defaultProfile.githubUrl ?? "",
    twitterUrl: initialData?.twitterUrl ?? defaultProfile.twitterUrl ?? "",
    linkedinUrl: initialData?.linkedinUrl ?? defaultProfile.linkedinUrl ?? "",
    websiteUrl: initialData?.websiteUrl ?? defaultProfile.websiteUrl ?? "",
    avatarUrl: initialData?.avatarUrl ?? defaultProfile.avatarUrl ?? "",
    gifPreviewUrl: initialData?.gifPreviewUrl ?? defaultProfile.gifPreviewUrl ?? "",
  });

  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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

  const hasPfp = isRealUrl(form.avatarUrl) || form.avatarUrl.startsWith("/pfp/");

  const initials = form.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function isRealUrl(url: string): boolean {
    return url.startsWith("http://") || url.startsWith("https://");
  }

  return (
    <div className="mt-6 pb-24">
      {/* Profile Photo */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {hasPfp ? (
            <div className="w-[80px] h-[80px] rounded-[10px] overflow-hidden flex-shrink-0 pfp-static">
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
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ) : (
            <div className="w-[80px] h-[80px] rounded-[10px] bg-surface-muted flex items-center justify-center text-[20px] font-semibold text-text-muted select-none">
              {initials}
            </div>
          )}
          <div className="flex flex-col gap-2 flex-1">
            <FileUploadButton
              type="pfp"
              accept="image/jpeg,image/png,image/webp,image/gif"
              label="Change photo"
              onUpload={(url) => update("avatarUrl", url)}
            />
            <Link
              href={`/coders/${defaultProfile.slug}`}
              className="inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-text-primary transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Preview profile
            </Link>
          </div>
        </div>

        {/* GIF Preview Upload */}
        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-text-primary">
            GIF Preview
          </label>
          <p className="text-[12px] text-text-muted">
            Animated thumbnail shown in the browse gallery.
          </p>
          {form.gifPreviewUrl && isRealUrl(form.gifPreviewUrl) && (
            <div className="w-[120px] h-[80px] rounded-lg overflow-hidden border border-border">
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
      </div>

      {/* Basic Info */}
      <div className="border-t border-border pt-6 mt-6 space-y-4">
        <Input
          label="Name"
          value={form.displayName}
          onChange={(e) => update("displayName", e.target.value)}
        />
        <Input
          label="Tagline"
          value={form.tagline}
          onChange={(e) => update("tagline", e.target.value)}
        />
        <Input
          label="Location"
          value={form.location}
          onChange={(e) => update("location", e.target.value)}
        />
      </div>

      {/* Bio */}
      <div className="border-t border-border pt-6 mt-6">
        <Textarea
          label="Bio"
          value={form.bio}
          onChange={(e) => update("bio", e.target.value)}
          maxChars={500}
          currentLength={form.bio.length}
        />
      </div>

      {/* Specialties */}
      <div className="border-t border-border pt-6 mt-6">
        <label className="block text-[13px] font-medium text-text-primary mb-3">
          Specialties
        </label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpecialty(s)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer border inline-flex items-center gap-1.5 ${
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
      <div className="border-t border-border pt-6 mt-6">
        <Input
          label="Rate"
          placeholder="$150-250/hr"
          value={form.hourlyRate}
          onChange={(e) => update("hourlyRate", e.target.value)}
        />
      </div>

      {/* Availability */}
      <div className="border-t border-border pt-6 mt-6">
        <label className="block text-[13px] font-medium text-text-primary mb-3">
          Availability
        </label>
        <div className="inline-flex border border-border rounded-lg overflow-hidden">
          {AVAILABILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => update("availability", opt.value)}
              className={`px-4 py-2 text-[13px] font-medium transition-colors cursor-pointer border-r border-border last:border-r-0 ${
                form.availability === opt.value
                  ? "bg-[#0a0a0a] text-white"
                  : "bg-background text-text-secondary hover:bg-surface-muted"
              }`}
            >
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

      {/* Social Links */}
      <div className="border-t border-border pt-6 mt-6 space-y-4">
        <label className="block text-[13px] font-medium text-text-primary">
          Social Links
        </label>
        <Input
          label="GitHub"
          placeholder="https://github.com/username"
          value={form.githubUrl}
          onChange={(e) => update("githubUrl", e.target.value)}
        />
        <Input
          label="Twitter / X"
          placeholder="https://twitter.com/username"
          value={form.twitterUrl}
          onChange={(e) => update("twitterUrl", e.target.value)}
        />
        <Input
          label="LinkedIn"
          placeholder="https://linkedin.com/in/username"
          value={form.linkedinUrl}
          onChange={(e) => update("linkedinUrl", e.target.value)}
        />
        <Input
          label="Website"
          placeholder="https://yoursite.com"
          value={form.websiteUrl}
          onChange={(e) => update("websiteUrl", e.target.value)}
        />
      </div>

      {/* Sticky Save */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-8 py-4">
        <div className="max-w-2xl flex items-center justify-end gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
