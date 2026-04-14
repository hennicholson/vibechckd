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
    const dim = size === "md" ? "w-[18px] h-[18px]" : "w-[14px] h-[14px]";
    const stroke = size === "md" ? 2 : 2.2;
    return (
      <span className={`inline-flex items-center flex-shrink-0 ${className}`} title="Verified">
        <svg className={`${dim}`} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#0a0a0a" strokeWidth={stroke} />
          <path d="M7.5 12.5L10.5 15.5L16.5 9" stroke="#0a0a0a" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
