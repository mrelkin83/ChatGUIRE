"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, MessageSquare, ShoppingCart, CalendarDays,
  Package, Share2, BrainCircuit, Users, Settings, LogOut,
  Zap, Columns3, Send, ChevronLeft, ChevronRight,
  UserRound, PlugZap, Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const mainItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Inbox", icon: MessageSquare, href: "/dashboard/inbox" },
  { name: "Kanban", icon: Columns3, href: "/dashboard/kanban" },
  { name: "Campañas", icon: Send, href: "/dashboard/campaigns" },
  { name: "Grupos", icon: UserRound, href: "/dashboard/groups" },
  { name: "Pedidos", icon: ShoppingCart, href: "/dashboard/orders" },
  { name: "Citas", icon: CalendarDays, href: "/dashboard/appointments" },
  { name: "Catálogo", icon: Package, href: "/dashboard/catalog" },
  { name: "Canales", icon: Share2, href: "/dashboard/channels" },
];

const adminItems = [
  { name: "Bot Config", icon: Bot, href: "/dashboard/bot-config" },
  { name: "Integraciones", icon: PlugZap, href: "/dashboard/integrations" },
  { name: "IA Config", icon: BrainCircuit, href: "/dashboard/ai-config" },
  { name: "Equipo", icon: Users, href: "/dashboard/team" },
  { name: "Ajustes", icon: Settings, href: "/dashboard/settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={cn(
      "flex h-screen flex-col border-r border-[#252536] bg-[#0a0a10] flex-shrink-0 transition-all duration-200",
      collapsed ? "w-[60px]" : "w-[220px]"
    )}>
      {/* Logo */}
      <div className={cn("flex h-14 items-center border-b border-[#252536]", collapsed ? "justify-center px-2" : "px-4 gap-2.5")}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#ec4899]">
          <Zap className="h-3.5 w-3.5 text-white" />
        </div>
        {!collapsed && <span className="text-sm font-bold gradient-text">ChatGÜIRE</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {/* Main items */}
        <div className={cn("space-y-0.5", collapsed ? "px-1.5" : "px-2")}>
          {mainItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.name} href={item.href} title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-lg transition-colors",
                  collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2",
                  isActive
                    ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                    : "text-[#8b8b9e] hover:bg-white/[0.03] hover:text-[#c0c0cc]"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="text-[13px] font-medium truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* Separator */}
        {!collapsed && <div className="mx-3 my-3 border-t border-[#252536]" />}

        {/* Admin items */}
        <div className={cn("space-y-0.5", collapsed ? "px-1.5" : "px-2")}>
          {adminItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.name} href={item.href} title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-lg transition-colors",
                  collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2",
                  isActive
                    ? "bg-[#f59e0b]/10 text-[#f59e0b]"
                    : "text-[#8b8b9e] hover:bg-white/[0.03] hover:text-[#c0c0cc]"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="text-[13px] font-medium truncate">{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#252536] p-2">
        <button onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex w-full items-center text-[#5a5a6e] hover:text-[#8b8b9e] hover:bg-white/[0.03] rounded-lg transition-colors",
            collapsed ? "justify-center p-2" : "gap-2 px-3 py-2"
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <>
            <ChevronLeft className="h-4 w-4 shrink-0" />
            <span className="text-xs">Colapsar</span>
          </>}
        </button>
        <Link href="/" className={cn(
          "flex items-center text-[#8b8b9e] hover:text-[#f1f1f4] hover:bg-white/[0.03] rounded-lg transition-colors",
          collapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2"
        )}>
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="text-[13px] font-medium">Cerrar sesión</span>}
        </Link>
      </div>
    </aside>
  );
}
