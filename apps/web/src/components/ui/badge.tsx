"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "primary" | "amber" | "green" | "blue" | "red" | "purple" | "gray";
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles = {
  primary: "bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]",
  amber: "bg-[rgba(245,158,11,0.12)] text-[var(--accent-amber)]",
  green: "bg-[rgba(16,185,129,0.12)] text-[var(--accent-success)]",
  blue: "bg-[rgba(59,130,246,0.12)] text-[var(--accent-info)]",
  red: "bg-[rgba(239,68,68,0.12)] text-[var(--accent-danger)]",
  purple: "bg-[rgba(139,92,246,0.12)] text-[#8B5CF6]",
  gray: "bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)]",
};

export function Badge({ variant = "gray", children, icon, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
        variantStyles[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
