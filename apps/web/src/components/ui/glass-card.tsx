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
  1: "bg-[var(--bg-surface-glass)]",
  2: "bg-[var(--bg-surface-2)]",
  3: "bg-[var(--bg-surface-3)]",
};

const glowStyles = {
  primary: "shadow-[var(--shadow-glow-primary)] border-[var(--border-glow)]",
  success: "shadow-[0_0_20px_var(--accent-success-glow)]",
  amber: "shadow-[var(--shadow-glow-amber)]",
  none: "",
};

export function GlassCard({ children, className, depth = 1, glow = "none", hover = false, onClick }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      className={cn(
        "backdrop-blur-[20px] saturate-[180%] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]",
        depthStyles[depth],
        glow !== "none" && glowStyles[glow],
        hover && "transition-all duration-250 hover:border-[var(--border-strong)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
