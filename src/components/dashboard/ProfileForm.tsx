"use client";

import { useState } from "react";
import Input from "../Input";
import Textarea from "../Textarea";
import Button from "../Button";
import {
  SPECIALTIES,
  SPECIALTY_LABELS,
  coders,
  type Specialty,
} from "@/lib/mock-data";

const defaultProfile = coders[0];

type ProfileData = {
  displayName: string;
  tagline: string;
  location: string;
  bio: string;
  specialties: Specialty[];
  hourlyRate: string;
  githubUrl: string;
  twitterUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
};

export default function ProfileForm() {
  const [form, setForm] = useState<ProfileData>({
    displayName: defaultProfile.displayName,
    tagline: defaultProfile.tagline,
    location: defaultProfile.location,
    bio: defaultProfile.bio,
    specialties: [...defaultProfile.specialties],
    hourlyRate: defaultProfile.hourlyRate,
    githubUrl: defaultProfile.githubUrl ?? "",
    twitterUrl: defaultProfile.twitterUrl ?? "",
    linkedinUrl: defaultProfile.linkedinUrl ?? "",
    websiteUrl: defaultProfile.websiteUrl ?? "",
  });

  const [saved, setSaved] = useState(false);

  const update = <K extends keyof ProfileData>(
    field: K,
    value: ProfileData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const toggleSpecialty = (s: Specialty) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initials = form.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="mt-6 pb-24">
      {/* Photo */}
      <div className="flex items-center gap-4">
        <div className="w-[80px] h-[80px] rounded-[10px] bg-surface-muted flex items-center justify-center text-[20px] font-semibold text-text-muted select-none">
          {initials}
        </div>
        <button
          type="button"
          className="text-[13px] text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Change photo
        </button>
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
          {saved && (
            <span className="text-[13px] text-positive font-medium">
              Saved
            </span>
          )}
          <Button onClick={handleSave}>Save changes</Button>
        </div>
      </div>
    </div>
  );
}
