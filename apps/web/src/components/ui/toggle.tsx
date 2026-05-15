"use client";

import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={cn("flex items-center gap-3 cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200",
          checked ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-surface-3)]"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-sm",
            checked ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
      {label && <span className="text-sm text-[var(--text-secondary)]">{label}</span>}
    </label>
  );
}
