interface VerifiedSealProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

const sizeMap = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-[18px] h-[18px]",
  lg: "w-5 h-5",
};

export default function VerifiedSeal({ className = "", size = "sm" }: VerifiedSealProps) {
  return (
    <svg
      className={`${sizeMap[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C10.9 2 10 2.9 9.2 3.5C8.5 4 7.7 4.2 6.8 4.1C5.9 4 5.1 4.4 4.5 5.1C3.9 5.8 3.7 6.7 3.4 7.5C3.1 8.3 2.5 8.9 1.9 9.5C1.3 10.1 0.9 10.9 1 11.8C1.1 12.7 1.6 13.4 2 14.1C2.4 14.8 2.5 15.6 2.4 16.5C2.3 17.4 2.7 18.2 3.4 18.8C4.1 19.4 4.9 19.6 5.7 19.9C6.5 20.2 7.1 20.8 7.6 21.5C8.1 22.1 8.9 22.5 9.8 22.4C10.7 22.3 11.4 21.8 12 21.4C12.6 21.8 13.3 22.3 14.2 22.4C15.1 22.5 15.9 22.1 16.4 21.5C16.9 20.8 17.5 20.2 18.3 19.9C19.1 19.6 19.9 19.4 20.6 18.8C21.3 18.2 21.7 17.4 21.6 16.5C21.5 15.6 21.6 14.8 22 14.1C22.4 13.4 22.9 12.7 23 11.8C23.1 10.9 22.7 10.1 22.1 9.5C21.5 8.9 20.9 8.3 20.6 7.5C20.3 6.7 20.1 5.8 19.5 5.1C18.9 4.4 18.1 4 17.2 4.1C16.3 4.2 15.5 4 14.8 3.5C14 2.9 13.1 2 12 2Z"
        fill="#1a1a1a"
      />
      <path
        d="M8.5 12.5L11 15L16 9.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
