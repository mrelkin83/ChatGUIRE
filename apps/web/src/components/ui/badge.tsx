"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "primary" | "amber" | "green" | "blue" | "red" | "purple" | "gray";
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles = {
  primary: "bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] border border-[rgba(59,130,246,0.15)]",
  amber:   "bg-[var(--accent-amber-subtle)] text-[var(--accent-amber)] border border-[rgba(245,158,11,0.15)]",
  green:   "bg-[var(--accent-success-subtle)] text-[var(--accent-success)] border border-[rgba(16,185,129,0.15)]",
  blue:    "bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] border border-[rgba(59,130,246,0.15)]",
  red:     "bg-[var(--accent-danger-subtle)] text-[var(--accent-danger)] border border-[rgba(239,68,68,0.15)]",
  purple:  "bg-[var(--accent-purple-subtle)] text-[var(--accent-purple)] border border-[rgba(139,92,246,0.15)]",
  gray:    "bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] border border-[var(--border-subtle)]",
};

export function Badge({ variant = "gray", children, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-[0.01em]",
        variantStyles[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
