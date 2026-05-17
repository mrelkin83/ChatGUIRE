"use client";
import { useState, useEffect } from "react";
import { Server, Cpu, HardDrive, MemoryStick } from "lucide-react";
import { API_BASE, saFetch } from "@/lib/api";

export default function SAMonitorPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    saFetch(`${API_BASE}/api/superadmin/system-health`)
      .then(r=>r.json()).then(setHealth).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#8b5cf6]">Monitor VPS</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3b82f6]/10 text-[#3b82f6]"><Cpu className="h-5 w-5"/></div><div><h3 className="font-semibold text-sm">CPU</h3><p className="text-xs text-[#8b8b9e]">{health?.cpu?.cores} cores</p></div></div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#8b8b9e]">Load 1m</span><span className="font-mono">{health?.cpu?.loadAvg1}</span></div>
            <div className="flex justify-between"><span className="text-[#8b8b9e]">Load 5m</span><span className="font-mono">{health?.cpu?.loadAvg5}</span></div>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22c55e]/10 text-[#22c55e]"><HardDrive className="h-5 w-5"/></div><div><h3 className="font-semibold text-sm">Memoria</h3><p className="text-xs text-[#8b8b9e]">{health?.memory?.total}</p></div></div>
          <div>
            <div className="flex justify-between text-sm mb-1.5"><span className="text-[#8b8b9e]">Uso</span><span className="font-mono">{health?.memory?.usagePct}%</span></div>
            <div className="h-2 rounded-full bg-[#1a1a2e] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#f59e0b]" style={{ width: `${health?.memory?.usagePct || 0}%` }}/>
            </div>
            <p className="text-xs text-[#8b8b9e] mt-1">{health?.memory?.used} / {health?.memory?.total}</p>
          </div>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-4"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8b5cf6]/10 text-[#8b5cf6]"><Server className="h-5 w-5"/></div><div><h3 className="font-semibold text-sm">Sistema</h3></div></div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#8b8b9e]">Uptime</span><span className="font-mono">{Math.floor(health?.uptime/3600)}h {Math.floor((health?.uptime%3600)/60)}m</span></div>
            <div className="flex justify-between"><span className="text-[#8b8b9e]">Node</span><span className="font-mono">{health?.nodeVersion}</span></div>
            <div className="flex justify-between"><span className="text-[#8b8b9e]">Plataforma</span><span className="font-mono">{health?.platform}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
