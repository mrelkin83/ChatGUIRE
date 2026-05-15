"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import { API_BASE, saFetch } from "@/lib/api";

export default function SAPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState(""); const [slug, setSlug] = useState(""); const [price, setPrice] = useState(0);
  const [limits, setLimits] = useState('{"max_messages":1000,"max_agents":3}'); const [features, setFeatures] = useState('["IA","WhatsApp","Dashboard"]');
  const [saving, setSaving] = useState(false);

  useEffect(() => { saFetch(`${API_BASE}/api/superadmin/plans`).then(r=>r.json()).then(d=>setPlans(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  const handleCreate = async () => {
    setSaving(true);
    await saFetch(`${API_BASE}/api/superadmin/plans`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name, slug, priceCop: price, limits: JSON.parse(limits), features: JSON.parse(features) }) });
    const r = await saFetch(`${API_BASE}/api/superadmin/plans`); setPlans(await r.json());
    setSaving(false); setShowCreate(false);
  };

  const handleDelete = async (id: string) => { await saFetch(`${API_BASE}/api/superadmin/plans/${id}`, { method:"DELETE" }); setPlans(plans.filter(p=>p.id!==id)); };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#8b5cf6]" style={{ fontFamily:"var(--font-display)" }}>Planes</h1>
        <button onClick={()=>setShowCreate(true)} className="btn-primary bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white text-sm">+ Nuevo Plan</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{p.name}</h3>
              <button onClick={()=>handleDelete(p.id)} className="p-1 rounded hover:bg-[#ef4444]/10 text-[#5a5a6e] hover:text-[#ef4444]"><Trash2 className="h-3.5 w-3.5"/></button>
            </div>
            <p className="text-2xl font-bold text-[#8b5cf6]">${Number(p.priceCop).toLocaleString("es-CO")}</p>
            <p className="text-xs text-[#8b8b9e] mt-1 capitalize">{p.billingCycle}</p>
            <div className="mt-3 space-y-1">
              {(p.features as string[])?.map((f,i) => <p key={i} className="text-xs text-[#8b8b9e]">• {f}</p>)}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Nuevo Plan</h3><button onClick={()=>setShowCreate(false)} className="text-[#8b8b9e]"><X className="h-5 w-5"/></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm text-[#8b8b9e] mb-1.5">Nombre</label><input type="text" value={name} onChange={e=>setName(e.target.value)} className="input-field" placeholder="Plan Básico"/></div>
              <div><label className="block text-sm text-[#8b8b9e] mb-1.5">Slug</label><input type="text" value={slug} onChange={e=>setSlug(e.target.value)} className="input-field" placeholder="plan-basico"/></div>
              <div><label className="block text-sm text-[#8b8b9e] mb-1.5">Precio COP</label><input type="number" value={price} onChange={e=>setPrice(Number(e.target.value))} className="input-field"/></div>
              <div><label className="block text-sm text-[#8b8b9e] mb-1.5">Límites (JSON)</label><textarea value={limits} onChange={e=>setLimits(e.target.value)} rows={2} className="input-field resize-none text-xs font-mono"/></div>
              <div><label className="block text-sm text-[#8b8b9e] mb-1.5">Features (JSON array)</label><textarea value={features} onChange={e=>setFeatures(e.target.value)} rows={2} className="input-field resize-none text-xs font-mono"/></div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={()=>setShowCreate(false)} className="btn-secondary">Cancelar</button>
                <button onClick={handleCreate} disabled={saving||!name||!slug} className="btn-primary bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:"Crear"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
