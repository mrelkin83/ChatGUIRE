"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Bell } from "lucide-react";

const channelColors: Record<string, string> = {
  whatsapp: "var(--channel-whatsapp)",
  instagram: "var(--channel-instagram)",
  facebook: "var(--channel-facebook)",
  tiktok: "var(--channel-tiktok)",
};

export function Navbar() {
  const pathname = usePathname();
  const [searchFocused, setSearchFocused] = useState(false);

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumb = segments.map((s, i) => ({
    label: s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "),
    isLast: i === segments.length - 1,
  }));

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)]/80 backdrop-blur-xl px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-1.5 text-sm">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[var(--text-tertiary)]">/</span>}
              <span className={crumb.isLast ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"}>
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className={`relative transition-all duration-300 ${searchFocused ? "w-80" : "w-56"}`}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Buscar..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] rounded-lg py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--accent-primary-subtle)] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {Object.entries(channelColors).map(([channel, color]) => (
            <div
              key={channel}
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color, opacity: 0.5, boxShadow: `0 0 6px ${color}` }}
              title={channel}
            />
          ))}
        </div>

        <button className="relative p-2 rounded-lg hover:bg-[var(--bg-surface-2)] transition-colors text-[var(--text-secondary)]">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--accent-danger)]" />
        </button>

        <div className="h-8 w-8 rounded-full bg-[var(--gradient-primary)] flex items-center justify-center text-white font-bold text-xs">
          A
        </div>
      </div>
    </header>
  );
}
