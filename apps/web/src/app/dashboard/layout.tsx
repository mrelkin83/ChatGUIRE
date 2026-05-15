"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Navbar } from "@/components/dashboard/navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[var(--bg-root)] text-[var(--text-primary)] overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
