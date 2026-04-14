"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[#171717] text-[#fafafa] hover:bg-[#0a0a0a]",
  secondary:
    "bg-background border border-border text-text-primary hover:border-border-hover",
  ghost:
    "bg-transparent text-text-muted hover:text-text-primary",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-[18px] py-2 text-[13px]",
  lg: "px-[22px] py-2.5 text-[13px]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center font-body font-medium rounded-lg transition-colors duration-150 disabled:bg-surface-muted disabled:text-text-muted disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
