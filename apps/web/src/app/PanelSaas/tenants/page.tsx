"use client";

import { useState, useEffect } from "react";
import { Plus, PauseCircle, PlayCircle, Trash2, Loader2, X, Building2, Gift, Calendar } from "lucide-react";
import { API_BASE, saFetch } from "@/lib/api";

interface Tenant { id: string; name: string; vertical: string; isActive: boolean; createdAt: string; }

export default function SATenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState("retail_fashion");
  const [isDemo, setIsDemo] = useState(false);
  const [demoDays, setDemoDays] = useState(14);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = () => {
    saFetch(`${API_BASE}/api/superadmin/tenants`)
      .then((r) => r.json()).then((d) => setTenants(Array.isArray(d) ? d : [])).catch(()=>{}).finally(() => setLoading(false));
  };

  const handleCreate = async () => {
    setSaving(true);
    setError("");
    try {
      const demoExpiresAt = isDemo
        ? new Date(Date.now() + demoDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const res = await saFetch(`${API_BASE}/api/superadmin/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, vertical, isDemo, demoExpiresAt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear tenant");
        setSaving(false);
        return;
      }
      setShowCreate(false);
      setName("");
      setIsDemo(false);
      setDemoDays(14);
      fetchTenants();
    } catch (err: any) {
      setError(err.message || "Error de conexión");
    }
    setSaving(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    await saFetch(`${API_BASE}/api/superadmin/tenants/${id}/${active ? 'suspend' : 'activate'}`, { method: "PUT" });
    fetchTenants();
  };

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#8b5cf6]" style={{ fontFamily: "var(--font-display)" }}>Tenants</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white text-sm">+ Nuevo Tenant</button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#252536] text-left text-xs font-semibold uppercase text-[#8b8b9e]">
              <th className="px-5 py-3">Nombre</th><th className="px-5 py-3">Vertical</th><th className="px-5 py-3">Estado</th><th className="px-5 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252536]">
            {tenants.map((t) => (
              <tr key={t.id} className="table-row">
                <td className="px-5 py-3 text-sm font-medium">{t.name}</td>
                <td className="px-5 py-3 text-sm text-[#8b8b9e]">{t.vertical}</td>
                <td className="px-5 py-3">
                  <span className={`badge ${t.isActive ? 'badge-green' : 'badge-red'}`}>{t.isActive ? 'Activo' : 'Suspendido'}</span>
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => handleToggle(t.id, t.isActive)} className={`p-1.5 rounded-lg ${t.isActive ? 'text-[#f59e0b] hover:bg-[#f59e0b]/10' : 'text-[#22c55e] hover:bg-[#22c55e]/10'}`} title={t.isActive ? 'Suspender' : 'Activar'}>
                    {t.isActive ? <PauseCircle className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold">Nuevo Tenant</h3><button onClick={()=>setShowCreate(false)} className="text-[#8b8b9e]"><X className="h-5 w-5"/></button></div>
            <div className="space-y-4">
              <div><label className="block text-sm text-[#8b8b9e] mb-1.5">Nombre</label><input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="input-field" placeholder="Mi Negocio"/></div>
              <div><label className="block text-sm text-[#8b8b9e] mb-1.5">Vertical</label><select value={vertical} onChange={(e)=>setVertical(e.target.value)} className="input-field"><option value="retail_fashion">Retail Moda</option><option value="retail_tech">Tecnología</option><option value="health">Salud</option></select></div>
              <div className="flex items-center gap-3">
                <input id="demo" type="checkbox" checked={isDemo} onChange={(e)=>setIsDemo(e.target.checked)} className="h-4 w-4 rounded border-[#252536] bg-[#161622] text-[#8b5cf6] focus:ring-[#8b5cf6]"/>
                <label htmlFor="demo" className="text-sm text-[#8b8b9e] flex items-center gap-2"><Gift className="h-3.5 w-3.5"/> Cuenta demo</label>
              </div>
              {isDemo && (
                <div><label className="block text-sm text-[#8b8b9e] mb-1.5 flex items-center gap-2"><Calendar className="h-3.5 w-3.5"/> Días de prueba</label><input type="number" min={1} max={90} value={demoDays} onChange={(e)=>setDemoDays(Number(e.target.value))} className="input-field"/></div>
              )}
              {error && <p className="text-sm text-[#ef4444]">{error}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={()=>{setShowCreate(false);setError("");}} className="btn-secondary">Cancelar</button>
                <button onClick={handleCreate} disabled={saving||!name} className="btn-primary bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] text-white">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:"Crear"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
