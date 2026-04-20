"use client";

import { ButtonHTMLAttributes, AnchorHTMLAttributes, forwardRef } from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost";

type ButtonBaseProps = {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  href?: string;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

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

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, href, ...props }, ref) => {
    const classes = `inline-flex items-center justify-center font-body font-medium rounded-lg transition-colors duration-150 disabled:bg-surface-muted disabled:text-text-muted disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    if (href) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={classes}
          {...(props as Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">)}
        >
          {children}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={classes}
        {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
