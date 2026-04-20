"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/Input";
import Button from "@/components/Button";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordsMatch = newPassword === confirmPassword;
  const passwordLongEnough = newPassword.length >= 8;
  const canSubmit = passwordLongEnough && passwordsMatch && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!passwordLongEnough) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    if (!token || !email) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/login?reset=success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token || !email) {
    return (
      <div>
        <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
          Invalid reset link
        </h1>
        <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
          This reset link is invalid or has expired.
        </p>
        <div className="space-y-3">
          <Button href="/forgot-password" className="w-full">Request a new link</Button>
          <p className="text-[13px] text-text-muted text-center">
            <Link href="/login" className="text-text-primary font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[20px] font-semibold text-text-primary tracking-[-0.02em] text-center">
        Set new password
      </h1>
      <p className="text-[13px] text-text-muted text-center mt-1 mb-6">
        Enter your new password below
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New password"
          type="password"
          placeholder="Min 8 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error && (
          <p className="text-[12px] text-negative">{error}</p>
        )}

        {newPassword && confirmPassword && !passwordsMatch && (
          <p className="text-[12px] text-negative">Passwords do not match</p>
        )}

        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {loading ? "Resetting..." : "Reset password"}
        </Button>
      </form>

      <p className="text-[13px] text-text-muted text-center mt-5">
        <Link href="/login" className="text-text-primary font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
