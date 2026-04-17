"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";

const availabilityOptions = [
  { label: "Available", dot: "bg-positive" },
  { label: "Selective", dot: "bg-warning" },
  { label: "Unavailable", dot: "bg-[#a3a3a3]" },
] as const;

export default function SettingsPage() {
  const { toast } = useToast();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isCreator = role !== "client";

  // Password section
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Availability
  const [availability, setAvailability] = useState<string>("Available");

  // Load current availability from profile
  useEffect(() => {
    if (!isCreator) return;
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.availability) {
          const label = data.availability.charAt(0).toUpperCase() + data.availability.slice(1);
          setAvailability(label);
        }
      })
      .catch(() => {});
  }, [isCreator]);

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [newInquiries, setNewInquiries] = useState(true);

  // Profile visibility
  const [profileVisible, setProfileVisible] = useState(true);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

        <div className="mb-3">
          <p className="text-[13px] text-text-muted">{(session?.user as any)?.email || "your@email.com"}</p>
        </div>

        {!showPassword ? (
          <button
            onClick={() => setShowPassword(true)}
            className="text-[12px] text-text-secondary hover:text-text-primary transition-colors duration-150 cursor-pointer"
          >
            Change password
          </button>
        ) : (
          <div className="space-y-3 mt-3">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm">Update password</Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPassword(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border">
          <button className="text-[12px] text-text-secondary hover:text-text-primary transition-colors duration-150 cursor-pointer">
            Export data
          </button>
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
              onClick={async () => {
                setAvailability(option.label);
                try {
                  await fetch("/api/profile", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ availability: option.label.toLowerCase() }),
                  });
                  toast("Availability updated", "success");
                } catch {
                  toast("Failed to update", "error");
                }
              }}
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
          onChange={setProfileVisible}
        />
      </div>
      )}

      {/* Connected Accounts */}
      {isCreator && (
      <div className="border border-border rounded-[10px] p-5 mb-4">
        <h2 className="text-[14px] font-medium text-text-primary mb-4">Connected accounts</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-primary">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span className="text-[13px] text-text-primary">GitHub</span>
            </div>
            <button className="text-[12px] text-text-secondary hover:text-text-primary border border-border rounded-md px-3 py-1 transition-colors duration-150 cursor-pointer">
              Connect
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-primary">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span className="text-[13px] text-text-primary">Twitter</span>
            </div>
            <button className="text-[12px] text-text-secondary hover:text-text-primary border border-border rounded-md px-3 py-1 transition-colors duration-150 cursor-pointer">
              Connect
            </button>
          </div>
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
            onChange={(v) => { setEmailNotifications(v); toast("Settings saved", "success"); }}
          />
          <ToggleRow
            label="Project updates"
            checked={projectUpdates}
            onChange={(v) => { setProjectUpdates(v); toast("Settings saved", "success"); }}
          />
          <ToggleRow
            label="New inquiries"
            checked={newInquiries}
            onChange={(v) => { setNewInquiries(v); toast("Settings saved", "success"); }}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-border rounded-[10px] p-5 mb-4 border-t-negative/40 border-t-2">
        <h2 className="text-[14px] font-medium text-negative mb-4">Danger zone</h2>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="border border-negative text-negative rounded-lg px-4 py-2 text-[13px] hover:bg-negative/10 transition-colors duration-150 cursor-pointer"
        >
          Delete account
        </button>
      </div>

      </div>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Are you sure?" size="sm">
        <p className="text-[13px] text-text-muted mb-6">
          This action cannot be undone. All of your data will be permanently deleted.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <button className="bg-negative text-white rounded-lg px-4 py-2 text-[13px] font-medium hover:bg-negative/90 transition-colors duration-150 cursor-pointer">
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-text-primary">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${
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
