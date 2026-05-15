"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex gap-1 p-1 bg-[var(--bg-surface-1)] rounded-[var(--radius-md)]", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "relative px-4 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-colors flex items-center gap-2",
            active === tab.id ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {active === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute inset-0 bg-[var(--bg-surface-3)] rounded-[var(--radius-sm)]"
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className="text-xs bg-[var(--bg-surface-1)] px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
