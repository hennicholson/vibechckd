"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-text-primary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:border-text-secondary ${
            error ? "border-negative" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-negative text-[12px]">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
