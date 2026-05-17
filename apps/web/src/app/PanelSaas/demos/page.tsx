"use client";
import { useState, useEffect } from "react";
import { Gift, Clock } from "lucide-react";
import { API_BASE, saFetch } from "@/lib/api";

export default function SADemosPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    saFetch(`${API_BASE}/api/superadmin/tenants`)
      .then(r=>r.json()).then(d=>setTenants(Array.isArray(d)?d.filter((t:any)=>t.isDemo):[])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#8b5cf6]">Cuentas Demo</h1>
      <div className="grid gap-4">
        {tenants.map(t => (
          <div key={t.id} className="glass-card p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f59e0b]/10 text-[#f59e0b]"><Gift className="h-5 w-5"/></div>
              <div><p className="font-medium">{t.name}</p><div className="flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3 text-[#8b8b9e]"/><span className="text-xs text-[#8b8b9e]">Expira: {t.demoExpiresAt ? new Date(t.demoExpiresAt).toLocaleDateString("es-CO") : 'Sin fecha'}</span></div></div>
            </div>
          </div>
        ))}
        {tenants.length === 0 && <div className="glass-card p-12 text-center"><Gift className="h-8 w-8 mx-auto text-[#5a5a6e] mb-3"/><p className="text-sm text-[#8b8b9e]">No hay cuentas demo activas</p></div>}
      </div>
    </div>
  );
}
