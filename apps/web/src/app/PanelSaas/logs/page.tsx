"use client";
import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { API_BASE, saFetch } from "@/lib/api";

export default function SALogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    saFetch(`${API_BASE}/api/superadmin/audit-logs`)
      .then(r=>r.json()).then(d=>setLogs(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8b5cf6] border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#8b5cf6]" style={{ fontFamily:"var(--font-display)" }}>Logs de Auditoría</h1>
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#252536] text-left text-xs font-semibold uppercase text-[#8b8b9e]">
              <th className="px-5 py-3">Acción</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#252536]">
            {logs.map((log) => (
              <tr key={log.id} className="table-row">
                <td className="px-5 py-3 text-sm">{log.action}</td>
                <td className="px-5 py-3 text-sm text-[#8b8b9e]">{log.targetType || '-'}</td>
                <td className="px-5 py-3 text-xs text-[#5a5a6e]">{new Date(log.createdAt).toLocaleString("es-CO")}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-12 text-center text-sm text-[#8b8b9e]"><FileText className="h-6 w-6 mx-auto mb-2 text-[#5a5a6e]"/>Sin registros de auditoría</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
