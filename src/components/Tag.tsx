interface TagProps {
  children: React.ReactNode;
  variant?: "default" | "accent";
  className?: string;
}

export default function Tag({ children, className = "" }: TagProps) {
  return (
    <span
      className={`inline-block font-mono text-[11px] font-medium text-text-secondary bg-surface-muted border border-transparent rounded-md px-2 py-[3px] ${className}`}
    >
      {children}
    </span>
  );
}
