"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  Monitor,
  FileText,
  LogOut,
  Shield,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { name: "Tenants", icon: Building2, href: "/admin/tenants" },
  { name: "Planes", icon: CreditCard, href: "/admin/plans" },
  { name: "Resellers", icon: Users, href: "/admin/resellers" },
  { name: "Monitor", icon: Monitor, href: "/admin/monitor" },
  { name: "Logs", icon: FileText, href: "/admin/logs" },
];

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isLoginPage = pathname === "/admin";

  useEffect(() => {
    const stored = localStorage.getItem("admin_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("admin_user");
        localStorage.removeItem("admin_token");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push("/admin");
    }
  }, [loading, user, isLoginPage, router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setUser(null);
    router.push("/admin");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#07070a]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#f59e0b] border-t-transparent" />
      </div>
    );
  }

  if (isLoginPage) return <>{children}</>;

  const currentPage = menuItems.find((item) => item.href === pathname);

  return (
    <div className="flex h-screen bg-[#07070a] text-[#f1f1f4]">
      <aside className="flex h-screen w-[240px] flex-col border-r border-[#252536] bg-[#0f0f16]/95">
        <div className="flex h-14 items-center gap-3 border-b border-[#252536] px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#d97706]">
            <Shield className="h-4 w-4 text-black" />
          </div>
          <div>
            <span className="text-sm font-bold text-[#f59e0b]">SuperAdmin</span>
            <p className="text-[10px] text-[#5a5a6e] leading-none">ChatG\u00dcIRE</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#5a5a6e]">
            Navegaci\u00f3n
          </p>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                  isActive
                    ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                    : "text-[#8b8b9e] hover:bg-white/[0.04] hover:text-[#f1f1f4]"
                )}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.75} />
                {item.name}
                {isActive && <ChevronRight className="h-3 w-3 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#252536] p-3">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-xs font-bold flex items-center justify-center text-black">
              {user?.fullName?.charAt(0) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {user?.fullName || "Admin"}
              </p>
              <p className="text-[10px] text-[#5a5a6e]">
                {user?.role || "superadmin"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#5a5a6e] hover:text-[#ef4444] transition-colors"
              title="Cerrar sesi\u00f3n"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-[#252536] bg-[#0f0f16]/80 px-6">
          <div className="flex items-center gap-2">
            {currentPage && (
              <>
                <currentPage.icon className="h-4 w-4 text-[#f59e0b]" />
                <h2 className="text-sm font-semibold text-[#f1f1f4]">
                  {currentPage.name}
                </h2>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#252536] bg-[#161622] px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[#f59e0b] animate-pulse-glow" />
            <span className="text-[11px] text-[#8b8b9e]">En l\u00ednea</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
