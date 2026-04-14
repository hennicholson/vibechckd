interface AvatarProps {
  src?: string;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClass: Record<string, string> = {
  sm: "w-7 h-7 text-[11px]",
  md: "w-10 h-10 text-[14px]",
  lg: "w-16 h-16 text-[20px]",
  xl: "w-20 h-20 text-[24px]",
};

export default function Avatar({ alt, size = "md", className = "" }: AvatarProps) {
  const initials = alt.split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <div
      className={`rounded-[10px] bg-surface-muted flex items-center justify-center font-medium text-border-hover flex-shrink-0 ${sizeClass[size]} ${className}`}
    >
      {initials}
    </div>
  );
}
