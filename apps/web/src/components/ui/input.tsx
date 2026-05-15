"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] text-[var(--text-secondary)] font-medium">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "bg-[var(--bg-surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] py-2.5 px-3 rounded-[var(--radius-md)] text-sm w-full transition-all font-[var(--font-primary)]",
              "focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--accent-primary-subtle)]",
              "placeholder:text-[var(--text-tertiary)]",
              icon && "pl-10",
              error && "border-[var(--accent-danger)] shadow-[0_0_0_3px_rgba(239,68,68,0.12)]",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[var(--accent-danger)]">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
