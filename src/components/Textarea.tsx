"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxChars?: number;
  currentLength?: number;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, maxChars, currentLength = 0, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-text-primary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted/60 transition-colors duration-150 focus:outline-none focus:border-text-secondary resize-y min-h-[120px] ${
            error ? "border-negative" : ""
          } ${className}`}
          {...props}
        />
        <div className="flex justify-between">
          {error && <p className="text-negative text-[12px]">{error}</p>}
          {maxChars && (
            <p
              className={`text-[11px] font-mono ml-auto ${
                currentLength > maxChars ? "text-negative" : "text-text-muted"
              }`}
            >
              {currentLength}/{maxChars}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
