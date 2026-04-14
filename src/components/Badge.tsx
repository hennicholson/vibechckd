import VerifiedSeal from "@/components/VerifiedSeal";

type BadgeVariant = "available" | "selective" | "unavailable" | "pending" | "approved" | "rejected" | "verified";

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
  size?: "sm" | "md";
}

const config: Record<BadgeVariant, { dot: string; text: string; label: string }> = {
  available: { dot: "bg-positive", text: "text-text-muted", label: "Available" },
  selective: { dot: "bg-warning", text: "text-text-muted", label: "Selective" },
  unavailable: { dot: "bg-border-hover", text: "text-text-muted", label: "Unavailable" },
  pending: { dot: "bg-warning", text: "text-text-muted", label: "Pending" },
  approved: { dot: "bg-positive", text: "text-text-muted", label: "Approved" },
  rejected: { dot: "bg-negative", text: "text-text-muted", label: "Rejected" },
  verified: { dot: "", text: "", label: "" },
};

export default function Badge({ variant, className = "", size = "sm" }: BadgeProps) {
  const { dot, text, label } = config[variant];

  if (variant === "verified") {
    const sealSize = size === "md" ? "sm" as const : "xs" as const;
    return (
      <span className={`inline-flex items-center flex-shrink-0 ${className}`} title="Verified">
        <VerifiedSeal size={sealSize} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] ${text} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
