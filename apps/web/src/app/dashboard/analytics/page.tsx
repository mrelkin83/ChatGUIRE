"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  MessageSquare, Send, Clock, Heart, TrendingUp, TrendingDown,
  Calendar, Filter, BarChart3, Activity,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { API_BASE } from "@/lib/api";

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  instagram: "#E1306C",
  facebook: "#1877F2",
  tiktok: "#FE2C55",
  default: "#8b5cf6",
};

const CHANNEL_NAMES: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
};

const PERIODS = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "month", label: "Este mes" },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const } },
};

interface AnalyticsDaily {
  date: string;
  channel: string;
  messagesInbound: number;
  messagesOutbound: number;
  ordersCreated: number;
  appointmentsCreated: number;
  revenue: string;
}

interface AnalyticsResponse {
  daily: AnalyticsDaily[];
  totals: {
    totalMessagesInbound: number;
    totalMessagesOutbound: number;
    totalOrders: number;
    totalRevenue: number;
    totalAppointments: number;
  };
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload) return null;
  return (
    <div className="px-4 py-3 rounded-[var(--radius-md)] shadow-lg"
      style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-default)" }}>
      <p className="text-sm font-medium mb-1.5" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
        {label}
      </p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color || "var(--text-secondary)" }}>
          {entry.name}: {typeof entry.value === "number" && entry.value >= 1000 ? entry.value.toLocaleString("es-CO") : entry.value}
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) => {
  if (!active || !payload?.[0]) return null;
  const { name, value } = payload[0];
  return (
    <div className="px-4 py-3 rounded-[var(--radius-md)] shadow-lg"
      style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-default)" }}>
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{name}</p>
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{value.toLocaleString("es-CO")} mensajes</p>
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("7d");

  useEffect(() => {
    const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenant_id") : null;
    if (!tenantId) { setLoading(false); return; }
    fetch(`${API_BASE}/api/analytics/${tenantId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Error al cargar analíticas"))
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const t = data?.totals;
    return [
      { label: "Mensajes entrantes", value: Number(t?.totalMessagesInbound ?? 0), change: 0, prefix: "", suffix: "", icon: MessageSquare, color: "var(--accent-primary)", bgColor: "var(--accent-primary-subtle)" },
      { label: "Mensajes enviados", value: Number(t?.totalMessagesOutbound ?? 0), change: 0, prefix: "", suffix: "", icon: Send, color: "var(--accent-success)", bgColor: "rgba(16,185,129,0.12)" },
      { label: "Pedidos", value: Number(t?.totalOrders ?? 0), change: 0, prefix: "", suffix: "", icon: Activity, color: "var(--accent-info)", bgColor: "rgba(59,130,246,0.12)" },
      { label: "Ingresos", value: Number(t?.totalRevenue ?? 0), prefix: "$", suffix: "", change: 0, icon: Heart, color: "var(--accent-amber)", bgColor: "rgba(245,158,11,0.12)" },
    ];
  }, [data]);

  const channelMessageData = useMemo(() => {
    if (!data?.daily?.length) return [];
    const grouped: Record<string, Record<string, number>> = {};
    data.daily.forEach((d) => {
      const day = new Date(d.date).toLocaleDateString("es-CO", { weekday: "short" });
      if (!grouped[day]) grouped[day] = {};
      const ch = d.channel || "default";
      if (!grouped[day][ch]) grouped[day][ch] = 0;
      grouped[day][ch] += (Number(d.messagesInbound) + Number(d.messagesOutbound));
    });
    return Object.entries(grouped).map(([name, channels]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      ...channels,
    }));
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.daily?.length) return [];
    const grouped: Record<string, number> = {};
    data.daily.forEach((d) => {
      const ch = d.channel || "default";
      if (!grouped[ch]) grouped[ch] = 0;
      grouped[ch] += (Number(d.messagesInbound) + Number(d.messagesOutbound));
    });
    return Object.entries(grouped).map(([channel, value]) => ({
      name: CHANNEL_NAMES[channel] || channel,
      value,
      color: CHANNEL_COLORS[channel] || CHANNEL_COLORS.default,
    }));
  }, [data]);

  const hourlyData = useMemo(() => {
    if (!data?.daily?.length) {
      return Array.from({ length: 24 }, (_, i) => ({ hora: `${i}:00`, conversaciones: 0, mensajes: 0 }));
    }
    const hourly = Array.from({ length: 24 }, (_, i) => ({ hora: `${i}:00`, conversaciones: 0, mensajes: 0 }));
    data.daily.forEach((d) => {
      const h = new Date(d.date).getHours();
      if (hourly[h]) {
        hourly[h].conversaciones += (Number(d.messagesInbound) + Number(d.messagesOutbound));
        hourly[h].mensajes += (Number(d.messagesInbound) + Number(d.messagesOutbound));
      }
    });
    return hourly;
  }, [data]);

  const performanceData = useMemo(() => {
    if (!data?.daily?.length) return [];
    const grouped: Record<string, { conversations: number; messages: number }> = {};
    data.daily.forEach((d) => {
      const ch = d.channel || "default";
      if (!grouped[ch]) grouped[ch] = { conversations: 0, messages: 0 };
      grouped[ch].conversations += (Number(d.messagesInbound) + Number(d.messagesOutbound));
      grouped[ch].messages += (Number(d.messagesInbound) + Number(d.messagesOutbound));
    });
    return Object.entries(grouped).map(([channel, stats]) => ({
      channel,
      conversations: stats.conversations,
      messages: stats.messages,
      avgResponse: "—",
      satisfaction: "—",
    }));
  }, [data]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="h-16 w-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--bg-surface-2)" }}>
          <BarChart3 className="h-8 w-8" style={{ color: "var(--text-tertiary)" }} />
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Error al cargar analíticas</p>
        <button onClick={() => { setError(null); setLoading(true); window.location.reload(); }} className="btn-primary text-xs">Reintentar</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-9 w-64 rounded-[var(--radius-md)]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-32 rounded-[var(--radius-lg)]" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-80 rounded-[var(--radius-lg)]" />
          <div className="skeleton h-80 rounded-[var(--radius-lg)]" />
        </div>
        <div className="skeleton h-72 rounded-[var(--radius-lg)]" />
        <div className="skeleton h-64 rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Analytics</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Métricas y rendimiento de tus canales</p>
        </div>
        <div className="flex gap-1 p-1 rounded-[var(--radius-md)]" style={{ background: "var(--bg-surface-2)" }}>
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={cn("px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-all duration-200",
                period === p.key ? "text-white shadow-sm" : "hover:text-[var(--text-primary)]")}
              style={{ background: period === p.key ? "var(--accent-primary)" : "transparent", color: period === p.key ? "#fff" : "var(--text-secondary)" }}>
              {p.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={staggerItem}>
            <GlassCard hover className="p-5 relative overflow-hidden">
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: kpi.bgColor }}>
                  <kpi.icon className="h-5 w-5" style={{ color: kpi.color }} />
                </div>
                <span className={cn("flex items-center gap-0.5 text-xs font-semibold", kpi.change >= 0 ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]")}>
                  {kpi.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(kpi.change)}%
                </span>
              </div>
              <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>
                {kpi.prefix}
                <CountUp end={kpi.value} duration={1.5} separator="." decimals={kpi.value % 1 !== 0 ? 1 : 0} />
                {kpi.suffix}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{kpi.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={staggerItem}>
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Mensajes por canal</h3>
              <div className="flex items-center gap-3">
                {pieData.map((p) => (
                  <div key={p.name} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={channelMessageData}>
                <defs>
                  {pieData.map((p) => (
                    <linearGradient key={p.name} id={`grad_${p.name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={p.color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={p.color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                {pieData.map((p) => (
                  <Area key={p.name} type="monotone" dataKey={p.name} name={p.name} stroke={p.color}
                    fill={`url(#grad_${p.name})`} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        <motion.div variants={staggerItem}>
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Distribución por canal</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={3} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip content={<PieTooltip />} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8}
                  formatter={(value: string) => <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem}>
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-secondary)" }}>Actividad por hora</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 12, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="conversaciones" name="Conversaciones" stroke="var(--accent-primary)"
                  fill="url(#hourlyGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: "var(--accent-primary)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      </motion.div>

      {performanceData.length > 0 && (
        <motion.div variants={staggerContainer} initial="hidden" animate="show">
          <motion.div variants={staggerItem}>
            <GlassCard className="overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Rendimiento por canal</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                      <th className="px-5 py-3">Canal</th>
                      <th className="px-5 py-3">Mensajes</th>
                      <th className="px-5 py-3">Pedidos</th>
                      <th className="px-5 py-3">Ingresos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {performanceData.map((row) => {
                      const color = CHANNEL_COLORS[row.channel] || "var(--text-secondary)";
                      const rev = data?.daily?.filter((d) => d.channel === row.channel).reduce((sum, d) => sum + Number(d.revenue), 0) ?? 0;
                      const ord = data?.daily?.filter((d) => d.channel === row.channel).reduce((sum, d) => sum + Number(d.ordersCreated), 0) ?? 0;
                      return (
                        <tr key={row.channel} className="table-row">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                              <span className="text-sm font-medium">{CHANNEL_NAMES[row.channel] || row.channel}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm">{row.messages.toLocaleString("es-CO")}</td>
                          <td className="px-5 py-4 text-sm">{ord.toLocaleString("es-CO")}</td>
                          <td className="px-5 py-4 text-sm">${rev.toLocaleString("es-CO")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
