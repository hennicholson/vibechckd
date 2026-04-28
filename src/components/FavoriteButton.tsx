"use client";

interface Props {
  favorited: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
  className?: string;
}

// Heart toggle used on coder cards + inside the profile popup. Stops
// propagation so clicking the heart inside a card doesn't also open the
// card's popup.
export default function FavoriteButton({
  favorited,
  onClick,
  size = "md",
  className = "",
}: Props) {
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const iconDim = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick(e);
      }}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`${dim} rounded-full flex items-center justify-center bg-background/85 backdrop-blur-sm border border-border hover:border-text-primary transition-colors cursor-pointer ${className}`}
    >
      <svg
        className={`${iconDim} ${favorited ? "fill-negative stroke-negative" : "fill-none stroke-text-primary"} transition-colors`}
        viewBox="0 0 24 24"
        strokeWidth={favorited ? 0 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
