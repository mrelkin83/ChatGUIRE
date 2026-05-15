"use client";

import { useState, useEffect } from "react";
import { Building2, Users, DollarSign, MessageSquare, TrendingUp, Activity } from "lucide-react";
import { API_BASE, saFetch } from "@/lib/api";

interface SADashboard {
  totalTenants: number; activeTenants: number; mrr: number;
  totalMessages: number; totalResellers: number;
  topTenants: { id: string; name: string; isActive: boolean }[];
  planStats: { name: string; count: number; price: number }[];
}

export default function SAPage() {
  const [data, setData] = useState<SADashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    saFetch(`${API_BASE}/api/superadmin/dashboard`)
      .then((r) => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" /></div>;

  const kpis = [
    { label: "Tenants Activos", value: `${data?.activeTenants ?? 0}/${data?.totalTenants ?? 0}`, icon: Building2, color: "#8b5cf6" },
    { label: "MRR Mensual", value: `$${(data?.mrr ?? 0).toLocaleString("es-CO")}`, icon: DollarSign, color: "#22c55e" },
    { label: "Mensajes", value: data?.totalMessages ?? 0, icon: MessageSquare, color: "#3b82f6" },
    { label: "Resellers", value: data?.totalResellers ?? 0, icon: Users, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#8b5cf6]" style={{ fontFamily: "var(--font-display)" }}>Dashboard SaaS</h1>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${kpi.color}15`, color: kpi.color }}>
                <kpi.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="text-xl font-bold">{kpi.value}</p>
            <p className="text-xs text-[#8b8b9e] mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Tenants */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-[#8b8b9e] mb-4">Últimos Tenants</h3>
          <div className="space-y-3">
            {data?.topTenants?.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <span className="text-sm">{t.name}</span>
                <div className={`h-1.5 w-1.5 rounded-full ${t.isActive ? 'bg-[#22c55e]' : 'bg-[#5a5a6e]'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-[#8b8b9e] mb-4">Distribución por Plan</h3>
          <div className="space-y-3">
            {data?.planStats?.map((p) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#8b5cf6]" />
                  <span className="text-sm">{p.name}</span>
                </div>
                <span className="text-sm text-[#8b8b9e]">{p.count} tenants</span>
              </div>
            ))}
            {(!data?.planStats || data.planStats.length === 0) && (
              <p className="text-sm text-[#8b8b9e]">Sin planes configurados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
