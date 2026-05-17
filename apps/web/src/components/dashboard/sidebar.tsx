"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, MessageSquare, Columns3, Send, Users,
  ShoppingCart, CalendarDays, Package, Share2, Bot,
  PlugZap, BrainCircuit, Settings,
  PanelLeftClose, PanelLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

const mainItems = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Inbox", icon: MessageSquare, href: "/dashboard/inbox" },
  { name: "Kanban", icon: Columns3, href: "/dashboard/kanban" },
  { name: "Campañas", icon: Send, href: "/dashboard/campaigns" },
  { name: "Grupos", icon: Users, href: "/dashboard/groups" },
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
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col h-screen bg-[var(--bg-surface-1)] border-r border-[var(--border-subtle)] flex-shrink-0 overflow-hidden"
    >
      <div className="flex items-center h-16 px-4 border-b border-[var(--border-subtle)] flex-shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white font-bold text-lg flex-shrink-0" style={{ background: "var(--gradient-primary)" }}>
          C
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-3 text-lg font-bold whitespace-nowrap overflow-hidden"
            >
              ChatG<span className="gradient-text">Ü</span>IRE
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {mainItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-all relative group",
                  active
                    ? "bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent-primary)]"
                    transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-surface-3)] rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 mb-2 px-3">
          {!collapsed && <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Admin</p>}
        </div>
        <div className="space-y-1">
          {adminItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-all relative group",
                  active
                    ? "bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active-admin"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--accent-primary)]"
                    transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-surface-3)] rounded-md text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[var(--border-subtle)] p-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ background: "var(--accent-primary)" }}>
            A
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0"
              >
                <p className="text-sm font-medium truncate">Admin</p>
                <p className="text-xs text-[var(--text-tertiary)] truncate">Propietario</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors"
      >
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </motion.aside>
  );
}
