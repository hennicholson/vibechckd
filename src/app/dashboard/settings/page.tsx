"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

// ─────────────────────────────────────────────────────────────────────────────
// Settings page — wired end-to-end.
//
// Wave 1 scope:
//   • Password change   → POST /api/settings (requires currentPassword)
//   • Email change      → POST /api/account/email (signs user out on success)
//   • Delete account    → DELETE /api/account/delete (with DELETE confirm)
//   • Availability      → PUT /api/profile (already working, preserved)
//   • Profile visibility → coderProfiles.status (draft ↔ active) via PUT /api/profile
//   • Notification prefs → localStorage only ("server-side delivery coming soon")
//   • Connected accounts / Export data → disabled "coming soon"
// ─────────────────────────────────────────────────────────────────────────────

const availabilityOptions = [
  { label: "Available", value: "available", dot: "bg-positive" },
  { label: "Selective", value: "selective", dot: "bg-warning" },
  { label: "Unavailable", value: "unavailable", dot: "bg-[#a3a3a3]" },
] as const;

type AvailabilityLabel = (typeof availabilityOptions)[number]["label"];

// LocalStorage keys for notification prefs. We scope them under a namespace so
// other features (and a future server migration) can clear them cleanly.
const NOTIF_KEYS = {
  email: "vibechckd.notifications.email",
  projectUpdates: "vibechckd.notifications.projectUpdates",
  newInquiries: "vibechckd.notifications.newInquiries",
  profileVisibleLocal: "vibechckd.profile.visibleLocal",
} as const;

function loadBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === "true";
}

function saveBool(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, String(value));
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isCreator = role !== "client";
  const email = (session?.user as { email?: string } | undefined)?.email ?? "";

  // ── Password section ──
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  // Whether the user already has a password. Whop-SSO accounts arrive with
  // `passwordHash = null`; in that case we render a "Set password" CTA instead
  // of "Change password" and skip the current-password input.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [whopLinked, setWhopLinked] = useState(false);

  // ── Email change section ──
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailShowPassword, setEmailShowPassword] = useState(false);

  // ── Availability ──
  const [availability, setAvailability] = useState<AvailabilityLabel>("Available");

  // ── Profile visibility (maps to coderProfiles.status active/draft) ──
  const [profileVisible, setProfileVisible] = useState<boolean>(true);
  const [profileVisibleLoaded, setProfileVisibleLoaded] = useState(false);

  // ── Notifications (localStorage only) ──
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [newInquiries, setNewInquiries] = useState(true);

  // ── Delete modal ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteShowPassword, setDeleteShowPassword] = useState(false);

  // Hydrate localStorage-backed toggles on mount (client-only).
  useEffect(() => {
    setEmailNotifications(loadBool(NOTIF_KEYS.email, true));
    setProjectUpdates(loadBool(NOTIF_KEYS.projectUpdates, true));
    setNewInquiries(loadBool(NOTIF_KEYS.newInquiries, true));
  }, []);

  // Load current availability + profile status from the server.
  // /api/settings GET is the single source of truth for both fields and also
  // tells us whether this user has set a password yet (Whop-SSO accounts have
  // none) and whether their account is linked to Whop.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (typeof data?.hasPassword === "boolean") setHasPassword(data.hasPassword);
        if (typeof data?.whopLinked === "boolean") setWhopLinked(data.whopLinked);
        if (!isCreator) {
          setProfileVisibleLoaded(true);
          return;
        }
        if (data?.availability) {
          const label =
            (data.availability as string).charAt(0).toUpperCase() +
            (data.availability as string).slice(1);
          setAvailability(label as AvailabilityLabel);
        }
        if (typeof data?.profileStatus === "string") {
          setProfileVisible(data.profileStatus === "active");
        } else {
          // No server-side profile row yet — fall back to localStorage so the
          // toggle remains persistent even before a profile is created.
          setProfileVisible(loadBool(NOTIF_KEYS.profileVisibleLocal, true));
        }
        setProfileVisibleLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProfileVisible(loadBool(NOTIF_KEYS.profileVisibleLocal, true));
        setProfileVisibleLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isCreator]);

  // ── Password submission ──
  async function submitPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);

    const isInitialSet = hasPassword === false;

    if (!isInitialSet && !currentPassword) {
      setPwError("Enter your current password");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("New password must be at least 8 characters");
      return;
    }
    if (!isInitialSet && newPassword === currentPassword) {
      setPwError("New password must differ from current password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match");
      return;
    }

    setPwSubmitting(true);
    try {
      const body: Record<string, string> = { password: newPassword };
      if (!isInitialSet) body.currentPassword = currentPassword;
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPwError(data?.error || "Failed to update password");
        toast(data?.error || "Failed to update password", "error");
        return;
      }
      toast(isInitialSet ? "Password set" : "Password updated", "success");
      setHasPassword(true);
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwError("Network error. Please try again.");
      toast("Network error", "error");
    } finally {
      setPwSubmitting(false);
    }
  }

  // ── Email change submission ──
  async function submitEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);

    if (!emailCurrentPassword) {
      setEmailError("Enter your current password");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) {
      setEmailError("Enter a valid email address");
      return;
    }
    if (newEmail.trim().toLowerCase() === email.toLowerCase()) {
      setEmailError("New email is the same as the current email");
      return;
    }

    setEmailSubmitting(true);
    try {
      const res = await fetch("/api/account/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: emailCurrentPassword,
          newEmail: newEmail.trim().toLowerCase(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailError(data?.error || "Failed to change email");
        toast(data?.error || "Failed to change email", "error");
        return;
      }
      toast(
        `Email changed. Please check ${newEmail.trim().toLowerCase()} to verify.`,
        "success"
      );
      // Force a sign-out so the session cookie reflects the new, unverified
      // identity. The sibling auth agent owns the re-verification flow.
      setTimeout(() => {
        signOut({ callbackUrl: "/login" });
      }, 600);
    } catch {
      setEmailError("Network error. Please try again.");
      toast("Network error", "error");
    } finally {
      setEmailSubmitting(false);
    }
  }

  // ── Delete submission ──
  async function submitDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError(null);

    if (!deletePassword) {
      setDeleteError("Enter your current password");
      return;
    }
    if (deleteConfirm !== "DELETE") {
      setDeleteError('Type "DELETE" to confirm');
      return;
    }

    setDeleteSubmitting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: deletePassword,
          confirm: "DELETE",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg = data?.error || "Failed to delete account";
        if (data?.blocking?.pendingWithdrawals) {
          msg = `You have ${data.blocking.pendingWithdrawals} pending withdrawal(s). Please resolve them before deleting your account.`;
        } else if (data?.blocking?.pendingTransactions) {
          msg = `You have ${data.blocking.pendingTransactions} pending transaction(s). Please wait for them to complete.`;
        }
        setDeleteError(msg);
        toast(msg, "error");
        return;
      }
      toast("Account deleted", "success");
      // Session is now invalid server-side; sign out clears the client cookie.
      setTimeout(() => {
        signOut({ callbackUrl: "/" });
      }, 600);
    } catch {
      setDeleteError("Network error. Please try again.");
      toast("Network error", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  }

  // ── Availability update ──
  async function updateAvailability(option: (typeof availabilityOptions)[number]) {
    const prev = availability;
    setAvailability(option.label);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: option.value }),
      });
      if (!res.ok) throw new Error("server");
      toast("Availability updated", "success");
    } catch {
      setAvailability(prev);
      toast("Failed to update availability", "error");
    }
  }

  // ── Profile visibility toggle (coderProfiles.status) ──
  async function updateProfileVisibility(next: boolean) {
    const prev = profileVisible;
    setProfileVisible(next);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileVisibility: next ? "active" : "draft" }),
      });
      if (!res.ok) {
        // Server rejected — roll back and surface the reason.
        setProfileVisible(prev);
        const data = await res.json().catch(() => ({}));
        toast((data?.error as string) || "Failed to update visibility", "error");
        return;
      }
      saveBool(NOTIF_KEYS.profileVisibleLocal, next);
      toast(
        next ? "Profile visible in gallery" : "Profile hidden from gallery",
        "success"
      );
    } catch {
      setProfileVisible(prev);
      toast("Failed to update visibility", "error");
    }
  }

  // ── Notification toggle helpers ──
  function onToggleNotif(key: keyof typeof NOTIF_KEYS, next: boolean) {
    saveBool(NOTIF_KEYS[key], next);
  }

  return (
    <div className="max-w-2xl h-full flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background px-4 md:px-8 pt-4 md:pt-6 pb-3">
        <h1 className="text-[20px] font-semibold text-text-primary">Settings</h1>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-b from-background to-transparent pointer-events-none translate-y-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 pt-2">
        {/* Account */}
        <div className="border border-border rounded-[10px] p-5 mb-4">
          <h2 className="text-[14px] font-medium text-text-primary mb-4">Account</h2>

          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[13px] text-text-muted truncate">{email || "your@email.com"}</p>
            <button
              type="button"
              onClick={() => {
                setEmailModalOpen(true);
                setEmailError(null);
                setEmailCurrentPassword("");
                setNewEmail("");
              }}
              className="text-[12px] text-text-secondary hover:text-text-primary transition-colors duration-150 cursor-pointer shrink-0"
            >
              Change email
            </button>
          </div>

          {!showPasswordForm ? (
            <div className="flex flex-col gap-2">
              {hasPassword === false ? (
                // No password yet — render the CTA as a primary button so
                // Whop SSO users see clearly that they should set one to
                // unlock direct sign-in at vibechckd.cc.
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(true);
                    setPwError(null);
                  }}
                  className="self-start inline-flex items-center gap-2 h-9 px-3 rounded-md bg-text-primary text-white text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Set a password
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(true);
                    setPwError(null);
                  }}
                  className="self-start text-[12px] text-text-secondary hover:text-text-primary transition-colors duration-150 cursor-pointer underline underline-offset-2"
                >
                  Change password
                </button>
              )}
              {hasPassword === false && whopLinked && (
                <p className="text-[11px] text-text-muted leading-relaxed">
                  You're signed in via Whop. Set a password to also access vibechckd directly at vibechckd.cc.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={submitPasswordChange} className="space-y-3 mt-3">
              {hasPassword !== false ? (
                <PasswordInput
                  label="Current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  show={showCurrent}
                  onToggleShow={() => setShowCurrent((s) => !s)}
                  autoComplete="current-password"
                />
              ) : (
                <p className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                  Setting password for the first time
                </p>
              )}
              <PasswordInput
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggleShow={() => setShowNew((s) => !s)}
                autoComplete="new-password"
              />
              <PasswordInput
                label="Confirm password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                onToggleShow={() => setShowConfirm((s) => !s)}
                autoComplete="new-password"
              />
              {pwError && (
                <p className="text-negative text-[12px]" role="alert">
                  {pwError}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" type="submit" disabled={pwSubmitting}>
                  {pwSubmitting ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Spinner /> Updating…
                    </span>
                  ) : (
                    "Update password"
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  disabled={pwSubmitting}
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPwError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-[12px] text-text-muted">Export data — coming soon</span>
          </div>
        </div>

        {/* Availability */}
        {isCreator && (
          <div className="border border-border rounded-[10px] p-5 mb-4">
            <h2 className="text-[14px] font-medium text-text-primary mb-1">Availability</h2>
            <p className="text-[12px] text-text-muted mb-4">Control how you appear to clients</p>

            <div className="inline-flex bg-surface-muted rounded-lg p-1 max-w-full overflow-x-auto">
              {availabilityOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => updateAvailability(option)}
                  className={`relative px-4 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-150 cursor-pointer ${
                    availability === option.label
                      ? "text-text-primary"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {availability === option.label && (
                    <motion.div
                      layoutId="settings-availability-indicator"
                      className="absolute inset-0 bg-background border border-border rounded-md"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 inline-flex items-center gap-1.5">
                    <span className={`w-[6px] h-[6px] rounded-full ${option.dot}`} />
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Profile Visibility */}
        {isCreator && (
          <div className="border border-border rounded-[10px] p-5 mb-4">
            <h2 className="text-[14px] font-medium text-text-primary mb-4">Profile</h2>
            <ToggleRow
              label="Show my profile in the public gallery"
              checked={profileVisible}
              disabled={!profileVisibleLoaded}
              onChange={updateProfileVisibility}
            />
          </div>
        )}

        {/* Connected Accounts — wave 1: disabled */}
        {isCreator && (
          <div className="border border-border rounded-[10px] p-5 mb-4">
            <h2 className="text-[14px] font-medium text-text-primary mb-4">Connected accounts</h2>

            <div className="space-y-3">
              <ConnectedAccountRow name="GitHub" iconPath="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              <ConnectedAccountRow name="Twitter" iconPath="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="border border-border rounded-[10px] p-5 mb-4">
          <h2 className="text-[14px] font-medium text-text-primary mb-4">Notifications</h2>

          <div className="space-y-4">
            <ToggleRow
              label="Email notifications"
              checked={emailNotifications}
              onChange={(v) => {
                setEmailNotifications(v);
                onToggleNotif("email", v);
              }}
            />
            <ToggleRow
              label="Project updates"
              checked={projectUpdates}
              onChange={(v) => {
                setProjectUpdates(v);
                onToggleNotif("projectUpdates", v);
              }}
            />
            <ToggleRow
              label="New inquiries"
              checked={newInquiries}
              onChange={(v) => {
                setNewInquiries(v);
                onToggleNotif("newInquiries", v);
              }}
            />
          </div>
          <p className="text-[11px] text-text-muted mt-4">
            Preferences are saved locally. Server-side notification delivery is coming soon.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="border border-border rounded-[10px] p-5 mb-4 border-t-negative/40 border-t-2">
          <h2 className="text-[14px] font-medium text-negative mb-4">Danger zone</h2>
          <button
            type="button"
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteError(null);
              setDeletePassword("");
              setDeleteConfirm("");
            }}
            className="border border-negative text-negative rounded-lg px-4 py-2 text-[13px] hover:bg-negative/10 transition-colors duration-150 cursor-pointer"
          >
            Delete account
          </button>
        </div>
      </div>

      {/* Email Change Modal */}
      <Modal
        open={emailModalOpen}
        onClose={() => !emailSubmitting && setEmailModalOpen(false)}
        title="Change email"
        size="sm"
      >
        <form onSubmit={submitEmailChange} className="space-y-3">
          <p className="text-[12px] text-text-muted">
            We&apos;ll send a verification link to the new address. You&apos;ll be signed out after
            confirming.
          </p>
          <Input
            label="New email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            autoComplete="email"
            autoFocus
          />
          <PasswordInput
            label="Current password"
            value={emailCurrentPassword}
            onChange={setEmailCurrentPassword}
            show={emailShowPassword}
            onToggleShow={() => setEmailShowPassword((s) => !s)}
            autoComplete="current-password"
          />
          {emailError && (
            <p className="text-negative text-[12px]" role="alert">
              {emailError}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={emailSubmitting}
              onClick={() => setEmailModalOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={emailSubmitting}>
              {emailSubmitting ? (
                <span className="inline-flex items-center gap-1.5">
                  <Spinner /> Saving…
                </span>
              ) : (
                "Change email"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => !deleteSubmitting && setShowDeleteModal(false)}
        title="Delete account"
        size="sm"
      >
        <form onSubmit={submitDelete} className="space-y-3">
          <p className="text-[13px] text-text-muted">
            This action cannot be undone. All of your data will be permanently deleted.
          </p>
          <PasswordInput
            label="Current password"
            value={deletePassword}
            onChange={setDeletePassword}
            show={deleteShowPassword}
            onToggleShow={() => setDeleteShowPassword((s) => !s)}
            autoComplete="current-password"
            autoFocus
          />
          <Input
            label='Type "DELETE" to confirm'
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            autoComplete="off"
          />
          {deleteError && (
            <p className="text-negative text-[12px]" role="alert">
              {deleteError}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={deleteSubmitting}
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={deleteSubmitting || deleteConfirm !== "DELETE" || !deletePassword}
              className="bg-negative text-white rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-negative/90 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none inline-flex items-center gap-1.5"
            >
              {deleteSubmitting ? (
                <>
                  <Spinner /> Deleting…
                </>
              ) : (
                "Delete account"
              )}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${
          checked ? "bg-text-primary" : "bg-border"
        }`}
      >
        <motion.div
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
          animate={{ left: checked ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function ConnectedAccountRow({ name, iconPath }: { name: string; iconPath: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-primary">
          <path d={iconPath} />
        </svg>
        <span className="text-[13px] text-text-primary">{name}</span>
      </div>
      <span className="text-[12px] text-text-muted border border-border rounded-md px-3 py-1">
        Coming soon
      </span>
    </div>
  );
}

/** Password input with show/hide toggle. Uses an inline eye-icon SVG since the
 *  project doesn't include an icon library. */
function PasswordInput({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  const inputId = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-[13px] font-medium text-text-primary">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full bg-background border border-border rounded-lg pl-3.5 pr-10 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:border-text-secondary"
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={onToggleShow}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
        >
          {show ? <EyeOff /> : <Eye />}
        </button>
      </div>
    </div>
  );
}

function Eye() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12z" />
      <circle cx="12" cy="12" r="3" strokeWidth={1.5} />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3l18 18M10.5 10.5a2.12 2.12 0 003 3M7 7C4 9 2 12 2 12s4 7.5 10 7.5c1.7 0 3.2-.5 4.5-1.2M14 5.2c-.6-.1-1.3-.2-2-.2-6 0-10 7-10 7" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="w-3.5 h-3.5 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={3} />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4zm2 5.3A7.96 7.96 0 014 12H0c0 3 1.1 5.8 3 7.9l3-2.6z"
      />
    </svg>
  );
}
