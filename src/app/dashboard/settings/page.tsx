"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Modal from "@/components/Modal";

const availabilityOptions = ["Available", "Selective", "Unavailable"] as const;

export default function SettingsPage() {
  // Password section
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Availability
  const [availability, setAvailability] = useState<string>("Available");

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [newInquiries, setNewInquiries] = useState(true);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div className="max-w-2xl px-8 py-6">
      <h1 className="text-[20px] font-semibold text-text-primary mb-6">Settings</h1>

      {/* Account */}
      <div className="border border-border rounded-[10px] p-5 mb-4">
        <h2 className="text-[14px] font-medium text-text-primary mb-4">Account</h2>

        <div className="mb-3">
          <p className="text-[13px] text-text-muted">creator@vibechckd.cc</p>
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
      </div>

      {/* Availability */}
      <div className="border border-border rounded-[10px] p-5 mb-4">
        <h2 className="text-[14px] font-medium text-text-primary mb-1">Availability</h2>
        <p className="text-[12px] text-text-muted mb-4">Control how you appear to clients</p>

        <div className="inline-flex bg-surface-muted rounded-lg p-1">
          {availabilityOptions.map((option) => (
            <button
              key={option}
              onClick={() => setAvailability(option)}
              className={`relative px-4 py-1.5 text-[13px] font-medium rounded-md transition-colors duration-150 cursor-pointer ${
                availability === option
                  ? "text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {availability === option && (
                <motion.div
                  layoutId="settings-availability-indicator"
                  className="absolute inset-0 bg-background border border-border rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{option}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="border border-border rounded-[10px] p-5 mb-4">
        <h2 className="text-[14px] font-medium text-text-primary mb-4">Notifications</h2>

        <div className="space-y-4">
          <ToggleRow
            label="Email notifications"
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
          <ToggleRow
            label="Project updates"
            checked={projectUpdates}
            onChange={setProjectUpdates}
          />
          <ToggleRow
            label="New inquiries"
            checked={newInquiries}
            onChange={setNewInquiries}
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-border rounded-[10px] p-5 mb-4">
        <h2 className="text-[14px] font-medium text-negative mb-4">Danger zone</h2>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="border border-negative text-negative rounded-lg px-4 py-2 text-[13px] hover:bg-negative/10 transition-colors duration-150 cursor-pointer"
        >
          Delete account
        </button>
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
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ left: checked ? 18 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}
