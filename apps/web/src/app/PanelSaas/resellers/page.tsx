"use client";
import { useState, useEffect } from "react";
import { UserCheck, Plus, Loader2, X, Copy } from "lucide-react";
import { API_BASE, saFetch } from "@/lib/api";

export default function SAResellersPage() {
  const [resellers, setResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [commission, setCommission] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => { saFetch(`${API_BASE}/api/superadmin/resellers`).then(r=>r.json()).then(d=>setResellers(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  const handleCreate = async () => {
    setSaving(true);
    await saFetch(`${API_BASE}/api/superadmin/resellers`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name, email, commissionPct: commission }) });
    setSaving(false); setShowCreate(false); setName(""); setEmail("");
    const r = await saFetch(`${API_BASE}/api/superadmin/resellers`); setResellers(await r.json());
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#8b5cf6]">Resellers</h1>
        <button onClick={()=>setShowCreate(true)} className="btn-primary bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white text-sm">+ Nuevo</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resellers.map((r) => (
          <div key={r.id} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#22c55e]/10 text-[#22c55e]"><UserCheck className="h-5 w-5"/></div>
              <div><h3 className="font-semibold text-sm">{r.name}</h3><p className="text-xs text-[#8b8b9e]">{r.email}</p></div>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#8b8b9e]">
              <span>ComisiÃ³n: {r.commissionPct}%</span>
              <span className="flex items-center gap-1"><Copy className="h-3 w-3"/>{r.referralCode}</span>
            </div>
            <p className="text-xs text-[#5a5a6e] mt-2">{r.totalReferrals} referidos Â· ${Number(r.totalEarnings).toLocaleString("es-CO")} ganado</p>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Nuevo Reseller</h3><button onClick={()=>setShowCreate(false)} className="text-[#8b8b9e]"><X className="h-5 w-5"/></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm text-[#8b8b9e] mb-1.5">Nombre</label><input type="text" value={name} onChange={e=>setName(e.target.value)} className="input-field"/></div>
              <div><label className="block text-sm text-[#8b8b9e] mb-1.5">Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input-field"/></div>
              <div><label className="block text-sm text-[#8b8b9e] mb-1.5">ComisiÃ³n (%)</label><input type="number" value={commission} onChange={e=>setCommission(Number(e.target.value))} className="input-field"/></div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={()=>setShowCreate(false)} className="btn-secondary">Cancelar</button>
                <button onClick={handleCreate} disabled={saving||!name||!email} className="btn-primary bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:"Crear"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
