"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  depth?: 1 | 2 | 3;
  glow?: "primary" | "success" | "amber" | "none";
  hover?: boolean;
  onClick?: () => void;
}

const depthStyles = {
  1: "bg-[var(--bg-surface-1)]",
  2: "bg-[var(--bg-surface-2)]",
  3: "bg-[var(--bg-surface-3)]",
};

const glowStyles = {
  primary: "shadow-[var(--shadow-glow-primary)] border-[var(--border-glow)]",
  success: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
  amber:   "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
  none:    "",
};

export function GlassCard({
  children,
  className,
  depth = 1,
  glow = "none",
  hover = false,
  onClick,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      className={cn(
        "border border-[var(--border-subtle)] rounded-[var(--radius-lg)]",
        depthStyles[depth],
        glow !== "none" && glowStyles[glow],
        hover && "transition-all duration-200 hover:border-[var(--border-default)] hover:shadow-[var(--shadow-md)] cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
