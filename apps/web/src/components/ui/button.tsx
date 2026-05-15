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
  primary: "bg-[var(--gradient-primary)] text-white hover:-translate-y-px hover:shadow-[var(--shadow-glow-primary)] border-none",
  secondary: "bg-[var(--bg-surface-3)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--border-default)] hover:border-[var(--border-strong)]",
  ghost: "bg-transparent text-[var(--text-secondary)] border border-transparent hover:bg-[var(--accent-primary-subtle)] hover:text-[var(--text-primary)]",
  danger: "bg-[rgba(239,68,68,0.12)] text-[#EF4444] border border-[rgba(239,68,68,0.20)] hover:bg-[rgba(239,68,68,0.20)]",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-[var(--radius-sm)]",
  md: "px-5 py-2.5 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "px-6 py-3 text-base gap-2.5 rounded-[var(--radius-md)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all font-[var(--font-primary)] cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
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
