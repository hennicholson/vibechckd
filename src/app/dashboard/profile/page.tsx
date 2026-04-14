"use client";

import ProfileForm from "@/components/dashboard/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="max-w-2xl px-8 py-6">
      <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em]">
        Profile
      </h1>
      <ProfileForm />
    </div>
  );
}
