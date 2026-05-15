"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  MessageSquare,
  ShoppingCart,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Calendar,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { formatCOP, formatRelativeTime } from "@/lib/utils";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.08 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const messageData = [
  { name: "Lun", whatsapp: 45, instagram: 12, facebook: 8, tiktok: 3 },
  { name: "Mar", whatsapp: 52, instagram: 18, facebook: 5, tiktok: 7 },
  { name: "Mié", whatsapp: 38, instagram: 15, facebook: 11, tiktok: 4 },
  { name: "Jue", whatsapp: 65, instagram: 22, facebook: 9, tiktok: 6 },
  { name: "Vie", whatsapp: 71, instagram: 28, facebook: 14, tiktok: 9 },
  { name: "Sáb", whatsapp: 43, instagram: 16, facebook: 7, tiktok: 5 },
  { name: "Dom", whatsapp: 29, instagram: 10, facebook: 4, tiktok: 2 },
];

const revenueData = [
  { name: "Lun", revenue: 1250000 },
  { name: "Mar", revenue: 980000 },
  { name: "Mié", revenue: 1450000 },
  { name: "Jue", revenue: 1120000 },
  { name: "Vie", revenue: 1680000 },
  { name: "Sáb", revenue: 890000 },
  { name: "Dom", revenue: 650000 },
];

const recentActivity = [
  {
    icon: MessageSquare,
    color: "var(--channel-whatsapp)",
    text: "Juan Pérez envió un mensaje por WhatsApp",
    time: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    icon: ShoppingCart,
    color: "var(--accent-amber)",
    text: "Nuevo pedido #1234 — $185.000",
    time: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    icon: Calendar,
    color: "var(--accent-info)",
    text: "María García agendó cita para mañana",
    time: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    icon: Users,
    color: "var(--accent-primary)",
    text: "Carlos se unió como agente",
    time: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    icon: DollarSign,
    color: "var(--accent-success)",
    text: "Pago recibido — $320.000",
    time: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
];

interface KPI {
  label: string;
  value: number;
  change: number;
  prefix?: string;
  suffix?: string;
  icon: any;
  color: string;
  bgColor: string;
}

const kpis: KPI[] = [
  {
    label: "Conversaciones",
    value: 128,
    change: 12.5,
    icon: MessageSquare,
    color: "var(--accent-primary)",
    bgColor: "var(--accent-primary-subtle)",
  },
  {
    label: "Mensajes hoy",
    value: 847,
    change: 8.2,
    icon: Activity,
    color: "var(--accent-success)",
    bgColor: "rgba(16,185,129,0.12)",
  },
  {
    label: "Pedidos",
    value: 34,
    change: -2.1,
    icon: ShoppingCart,
    color: "var(--accent-amber)",
    bgColor: "rgba(245,158,11,0.12)",
  },
  {
    label: "Ingresos",
    value: 4250000,
    change: 15.3,
    prefix: "$",
    icon: DollarSign,
    color: "var(--accent-success)",
    bgColor: "rgba(16,185,129,0.12)",
  },
  {
    label: "Tiempo resp.",
    value: 2.4,
    suffix: "min",
    change: -8.0,
    icon: Clock,
    color: "var(--accent-info)",
    bgColor: "rgba(59,130,246,0.12)",
  },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-4 py-3 shadow-lg">
      <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}:{" "}
          {typeof entry.value === "number" && entry.value > 1000
            ? formatCOP(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="skeleton h-32 rounded-[var(--radius-lg)]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Hola, Admin <span className="inline-block">👋</span>
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Aquí tienes un resumen de tu negocio
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} variants={staggerItem}>
            <GlassCard hover className="p-5 relative overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: kpi.bgColor }}
                >
                  <kpi.icon
                    className="h-5 w-5"
                    style={{ color: kpi.color }}
                  />
                </div>
                <span
                  className={`flex items-center gap-0.5 text-xs font-semibold ${
                    kpi.change >= 0
                      ? "text-[var(--accent-success)]"
                      : "text-[var(--accent-danger)]"
                  }`}
                >
                  {kpi.change >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(kpi.change)}%
                </span>
              </div>
              <div
                className="text-2xl font-bold"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {kpi.prefix}
                <CountUp
                  end={kpi.value}
                  duration={1.5}
                  separator="."
                  decimals={kpi.value % 1 !== 0 ? 1 : 0}
                />
                {kpi.suffix}
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                {kpi.label}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <motion.div variants={staggerItem}>
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">
              Mensajes por canal
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={messageData}>
                <defs>
                  <linearGradient
                    id="whatsappGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--channel-whatsapp)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--channel-whatsapp)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="instagramGrad"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--channel-instagram)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--channel-instagram)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="whatsapp"
                  name="WhatsApp"
                  stroke="var(--channel-whatsapp)"
                  fill="url(#whatsappGrad)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="instagram"
                  name="Instagram"
                  stroke="var(--channel-instagram)"
                  fill="url(#instagramGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>

        <motion.div variants={staggerItem}>
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">
              Ingresos (últimos 7 días)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--accent-primary)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--accent-primary)"
                      stopOpacity={0.3}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--text-tertiary)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="revenue"
                  name="Ingresos"
                  fill="url(#revenueGrad)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <GlassCard className="p-5">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-4">
            Actividad Reciente
          </h3>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <motion.div
                key={i}
                variants={staggerItem}
                className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--bg-surface-3)] transition-colors"
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon
                    className="h-4.5 w-4.5"
                    style={{ color: item.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">
                    {item.text}
                  </p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)] whitespace-nowrap">
                  {formatRelativeTime(item.time)}
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
