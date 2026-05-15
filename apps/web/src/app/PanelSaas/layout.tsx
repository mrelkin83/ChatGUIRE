"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Building2, CreditCard, Users, Monitor,
  FileText, Settings, LogOut, Zap, Gift, UserCheck, Activity, Server,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/PanelSaas" },
  { name: "Tenants", icon: Building2, href: "/PanelSaas/tenants" },
  { name: "Planes", icon: CreditCard, href: "/PanelSaas/plans" },
  { name: "Demos", icon: Gift, href: "/PanelSaas/demos" },
  { name: "Resellers", icon: UserCheck, href: "/PanelSaas/resellers" },
  { name: "Monitor", icon: Server, href: "/PanelSaas/monitor" },
  { name: "Logs", icon: FileText, href: "/PanelSaas/logs" },
];

interface SuperAdminUser { id: string; email: string; fullName: string; role: string; }

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SuperAdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Skip auth for login page
  const isLoginPage = pathname === "/PanelSaas/login";

  useEffect(() => {
    const stored = localStorage.getItem("superadmin_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push("/PanelSaas/login");
    }
  }, [loading, user, isLoginPage, router]);

  const handleLogout = () => {
    localStorage.removeItem("superadmin_token");
    localStorage.removeItem("superadmin_user");
    setUser(null);
    router.push("/PanelSaas/login");
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#07070a]"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" /></div>;
  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex h-screen bg-[#07070a] text-[#f1f1f4]">
      {/* Sidebar */}
      <div className="flex h-screen w-[220px] flex-col border-r border-[#252536] bg-[#0f0f16]/95">
        <div className="flex h-14 items-center gap-2 border-b border-[#252536] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#ec4899]">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-[#8b5cf6]">Panel SaaS</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors",
                  isActive ? "bg-[#8b5cf6]/10 text-[#8b5cf6]" : "text-[#8b8b9e] hover:bg-white/[0.04] hover:text-[#f1f1f4]"
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.75} />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[#252536] p-3">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-xs font-bold flex items-center justify-center text-white">
              {user?.fullName?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.fullName}</p>
              <p className="text-[10px] text-[#5a5a6e]">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-[#5a5a6e] hover:text-[#ef4444] transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-[#252536] bg-[#0f0f16]/80 px-6">
          <h2 className="text-sm font-semibold text-[#8b8b9e]">Panel SuperAdmin</h2>
          <div className="flex items-center gap-2 rounded-full border border-[#252536] bg-[#161622] px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[#8b5cf6]" />
            <span className="text-[11px] text-[#8b8b9e]">SaaS Admin</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
