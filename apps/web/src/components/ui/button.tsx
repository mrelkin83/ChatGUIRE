"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary:
    "bg-[var(--accent-primary)] text-white border border-[rgba(255,255,255,0.08)] hover:bg-[var(--accent-primary-hover)] hover:shadow-[var(--shadow-glow-primary)]",
  secondary:
    "bg-[var(--bg-surface-2)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-surface-3)] hover:border-[var(--border-strong)]",
  ghost:
    "bg-transparent text-[var(--text-secondary)] border border-transparent hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]",
  danger:
    "bg-[var(--accent-danger-subtle)] text-[var(--accent-danger)] border border-[rgba(239,68,68,0.18)] hover:bg-[rgba(239,68,68,0.16)]",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-[var(--radius-sm)]",
  md: "px-4 py-2 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "px-5 py-2.5 text-sm gap-2 rounded-[var(--radius-md)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all cursor-pointer whitespace-nowrap",
          "disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
