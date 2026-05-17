"use client";

import { useState, useEffect, useRef } from "react";
import { API_BASE, dfetch, getTenantId } from "@/lib/api";
import {
  Send, Users, Plus, MoreHorizontal, Play, Pause, Trash2,
  Calendar, MessageSquare, BarChart3, X, Loader2, Upload,
  CheckCircle2, XCircle, Clock, AlertCircle, Sliders
} from "lucide-react";
import CampaignDashboard from "@/components/campaigns/CampaignDashboard";

interface ContactList {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
  listId: string;
  listName: string;
  messages: { text: string; active: boolean }[];
  status: string;
  scheduledAt: string | null;
  recurrence: string;
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [activeTab, setActiveTab] = useState<"campaigns" | "lists" | "segmented">("campaigns");
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [importingListId, setImportingListId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; variables: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Campaign form
  const [campName, setCampName] = useState("");
  const [campListId, setCampListId] = useState("");
  const [campMessages, setCampMessages] = useState<{ text: string; active: boolean }[]>([
    { text: "", active: true }
  ]);
  const [campScheduledAt, setCampScheduledAt] = useState("");
  const [campRecurrence, setCampRecurrence] = useState("once");

  // List form
  const [listName, setListName] = useState("");
  const [listDesc, setListDesc] = useState("");

  useEffect(() => {
    const id = getTenantId();
    if (id) {
      setTenantId(id);
      Promise.all([
        dfetch(`${API_BASE}/api/campaigns/${id}`).then((r) => r.json()),
        dfetch(`${API_BASE}/api/contact-lists/${id}`).then((r) => r.json()),
      ])
        .then(([campsData, listsData]) => {
          setCampaigns(Array.isArray(campsData) ? campsData : []);
          setContactLists(Array.isArray(listsData) ? listsData : []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleCreateList = async () => {
    if (!listName) return;
    setSaving(true);
    try {
      const res = await dfetch(`${API_BASE}/api/contact-lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, name: listName, description: listDesc }),
      });
      if (res.ok) {
        const list = await res.json();
        setContactLists([list, ...contactLists]);
        setListName("");
        setListDesc("");
        setShowCreateList(false);
      }
    } catch {}
    setSaving(false);
  };

  const handleCreateCampaign = async () => {
    if (!campName || !campListId || campMessages.length === 0) return;
    setSaving(true);
    try {
      const res = await dfetch(`${API_BASE}/api/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          name: campName,
          listId: campListId,
          messages: campMessages,
          scheduledAt: campScheduledAt || undefined,
          recurrence: campRecurrence,
        }),
      });
      if (res.ok) {
        const camp = await res.json();
        const list = contactLists.find(l => l.id === campListId);
        setCampaigns([{ ...camp, listName: list?.name || 'Unknown' }, ...campaigns]);
        resetCampaignForm();
        setShowCreateCampaign(false);
      }
    } catch {}
    setSaving(false);
  };

  const handleSendCampaign = async (id: string) => {
    try {
      await dfetch(`${API_BASE}/api/campaigns/${id}/send`, { method: "POST" });
      const res = await dfetch(`${API_BASE}/api/campaigns/${tenantId}`);
      const data = await res.json();
      if (Array.isArray(data)) setCampaigns(data);
    } catch {}
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await dfetch(`${API_BASE}/api/campaigns/${id}`, { method: "DELETE" });
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch {}
  };

  const handleDeleteList = async (id: string) => {
    try {
      await dfetch(`${API_BASE}/api/contact-lists/${id}`, { method: "DELETE" });
      setContactLists(contactLists.filter(l => l.id !== id));
    } catch {}
  };

  const handleImportCustomers = async (listId: string) => {
    try {
      const res = await dfetch(`${API_BASE}/api/contact-lists/${listId}/import-customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      if (res.ok) {
        const result = await res.json();
        const listsRes = await dfetch(`${API_BASE}/api/contact-lists/${tenantId}`);
        const listsData = await listsRes.json();
        if (Array.isArray(listsData)) setContactLists(listsData);
      }
    } catch {}
  };

  const handleImportExcel = async (listId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await dfetch(`${API_BASE}/api/contact-lists/${listId}/import-excel`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const result = await res.json();
        setImportResult(result);
        setImportingListId(null);
        const listsRes = await dfetch(`${API_BASE}/api/contact-lists/${tenantId}`);
        const listsData = await listsRes.json();
        if (Array.isArray(listsData)) setContactLists(listsData);
      }
    } catch {}
  };

  const handleDownloadTemplate = () => {
    window.open(`${API_BASE}/api/contact-lists/template`, "_blank");
  };

  const resetCampaignForm = () => {
    setCampName("");
    setCampListId("");
    setCampMessages([{ text: "", active: true }]);
    setCampScheduledAt("");
    setCampRecurrence("once");
  };

  const addMessage = () => {
    if (campMessages.length < 5) {
      setCampMessages([...campMessages, { text: "", active: true }]);
    }
  };

  const updateMessage = (index: number, text: string) => {
    const updated = [...campMessages];
    updated[index].text = text;
    setCampMessages(updated);
  };

  const toggleMessage = (index: number) => {
    const updated = [...campMessages];
    updated[index].active = !updated[index].active;
    setCampMessages(updated);
  };

  const removeMessage = (index: number) => {
    if (campMessages.length > 1) {
      setCampMessages(campMessages.filter((_, i) => i !== index));
    }
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: "Borrador", color: "#8b8b9e", icon: Clock },
    scheduled: { label: "Programada", color: "#3b82f6", icon: Calendar },
    running: { label: "Enviando", color: "#f59e0b", icon: Loader2 },
    paused: { label: "Pausada", color: "#f59e0b", icon: Pause },
    completed: { label: "Completada", color: "#22c55e", icon: CheckCircle2 },
    cancelled: { label: "Cancelada", color: "#ef4444", icon: XCircle },
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#f59e0b] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Campañas</h1>
          <p className="mt-1 text-sm text-[#8b8b9e]">Envía mensajes masivos a tus contactos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateList(true)} className="btn-secondary flex items-center gap-2">
            <Users className="h-4 w-4" />
            Nueva Lista
          </button>
          <button onClick={() => setShowCreateCampaign(true)} className="btn-primary flex items-center gap-2">
            <Send className="h-4 w-4" />
            Nueva Campaña
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#161822] rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "campaigns" ? "bg-[#252536] text-white" : "text-[#8b8b9e] hover:text-white"
          }`}
        >
          <Send className="h-4 w-4 inline mr-2" />
          Campañas ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab("lists")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "lists" ? "bg-[#252536] text-white" : "text-[#8b8b9e] hover:text-white"
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Listas ({contactLists.length})
        </button>
        <button
          onClick={() => setActiveTab("segmented")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "segmented" ? "bg-[#252536] text-white" : "text-[#8b8b9e] hover:text-white"
          }`}
        >
          <Sliders className="h-4 w-4 inline mr-2" />
          Segmentadas
        </button>
      </div>

      {/* Campaigns Tab */}
      {activeTab === "campaigns" && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#252536] text-left text-xs font-semibold uppercase tracking-wider text-[#8b8b9e]">
                  <th className="px-6 py-3">Campaña</th>
                  <th className="px-6 py-3">Lista</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Contactos</th>
                  <th className="px-6 py-3">Enviados</th>
                  <th className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252536]">
                {campaigns.map((camp) => {
                  const status = statusConfig[camp.status] || statusConfig.draft;
                  return (
                    <tr key={camp.id} className="table-row">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-sm">{camp.name}</p>
                          <p className="text-xs text-[#5a5a6e]">{camp.messages.length} variaciones de mensaje</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#8b8b9e]">{camp.listName}</td>
                      <td className="px-6 py-4">
                        <span className={`badge flex items-center gap-1 w-fit`} style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                          <status.icon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{camp.totalContacts}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <span className="text-[#22c55e]">{camp.sentCount}</span>
                          {camp.failedCount > 0 && (
                            <span className="text-[#ef4444] ml-1">({camp.failedCount} fallidos)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {camp.status === 'draft' && (
                            <button
                              onClick={() => handleSendCampaign(camp.id)}
                              className="p-1.5 rounded hover:bg-[#22c55e]/10 text-[#22c55e]"
                              title="Enviar"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCampaign(camp.id)}
                            className="p-1.5 rounded hover:bg-[#ef4444]/10 text-[#5a5a6e] hover:text-[#ef4444]"
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Send className="h-10 w-10 mx-auto text-[#5a5a6e] mb-3" />
                      <p className="text-sm text-[#8b8b9e]">No hay campañas creadas</p>
                      <p className="text-xs text-[#5a5a6e] mt-1">Crea tu primera campaña para enviar mensajes masivos</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lists Tab */}
      {activeTab === "lists" && (
        <div>
          <button
            onClick={handleDownloadTemplate}
            className="text-xs text-[#f59e0b] hover:underline mb-2 inline-flex items-center gap-1"
          >
            <Upload className="h-3 w-3" />
            Descargar plantilla Excel
          </button>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contactLists.map((list) => (
            <div key={list.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{list.name}</h3>
                  {list.description && (
                    <p className="text-xs text-[#5a5a6e] mt-0.5">{list.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteList(list.id)}
                  className="p-1.5 rounded hover:bg-[#ef4444]/10 text-[#5a5a6e] hover:text-[#ef4444]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#8b8b9e] mb-4">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {list.contactCount} contactos
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleImportCustomers(list.id)}
                    className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
                  >
                    <Upload className="h-3 w-3" />
                    Importar clientes
                  </button>
                  <button
                    onClick={() => {
                      setImportingListId(list.id);
                      setImportResult(null);
                      fileInputRef.current?.click();
                    }}
                    className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5"
                  >
                    <BarChart3 className="h-3 w-3" />
                    Importar Excel
                  </button>
                </div>
              </div>
            </div>
          ))}
          {contactLists.length === 0 && (
            <div className="col-span-full glass-card p-8 text-center">
              <Users className="h-10 w-10 mx-auto text-[#5a5a6e] mb-3" />
              <p className="text-sm text-[#8b8b9e]">No hay listas de contactos</p>
              <p className="text-xs text-[#5a5a6e] mt-1">Crea una lista para organizar tus contactos</p>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Segmented Campaigns Tab */}
      {activeTab === "segmented" && tenantId && (
        <CampaignDashboard />
      )}

      {/* Create Campaign Modal */}
      {showCreateCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Nueva Campaña</h3>
              <button onClick={() => { setShowCreateCampaign(false); resetCampaignForm(); }} className="text-[#8b8b9e] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8b8b9e] mb-1.5">Nombre de campaña</label>
                <input
                  type="text"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="Promo verano 2026..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm text-[#8b8b9e] mb-1.5">Lista de contactos</label>
                <select
                  value={campListId}
                  onChange={(e) => setCampListId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Seleccionar lista...</option>
                  {contactLists.map(list => (
                    <option key={list.id} value={list.id}>{list.name} ({list.contactCount} contactos)</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-[#8b8b9e]">Mensajes (hasta 5 variaciones)</label>
                  <button
                    onClick={addMessage}
                    disabled={campMessages.length >= 5}
                    className="text-xs text-[#f59e0b] hover:underline disabled:opacity-50"
                  >
                    + Agregar variación
                  </button>
                </div>
                <div className="space-y-2">
                  {campMessages.map((msg, idx) => (
                    <div key={idx} className="flex gap-2">
                      <textarea
                        value={msg.text}
                        onChange={(e) => updateMessage(idx, e.target.value)}
                        placeholder={`MSG ${idx + 1}: Hola {{nombre}}, tenemos una promo especial para ti...`}
                        rows={2}
                        className="input-field flex-1 resize-none text-sm"
                      />
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => toggleMessage(idx)}
                          className={`p-1.5 rounded ${msg.active ? 'bg-[#22c55e]/10 text-[#22c55e]' : 'bg-[#252536] text-[#5a5a6e]'}`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        {campMessages.length > 1 && (
                          <button
                            onClick={() => removeMessage(idx)}
                            className="p-1.5 rounded hover:bg-[#ef4444]/10 text-[#5a5a6e]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#5a5a6e] mt-1">
                  Variables: {`{{nombre}}`}, {`{{telefono}}`} + variables custom
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#8b8b9e] mb-1.5">Programar (opcional)</label>
                  <input
                    type="datetime-local"
                    value={campScheduledAt}
                    onChange={(e) => setCampScheduledAt(e.target.value)}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#8b8b9e] mb-1.5">Recurrencia</label>
                  <select
                    value={campRecurrence}
                    onChange={(e) => setCampRecurrence(e.target.value)}
                    className="input-field"
                  >
                    <option value="once">Única vez</option>
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="monthly">Mensual</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowCreateCampaign(false); resetCampaignForm(); }} className="btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCampaign}
                  disabled={saving || !campName || !campListId || campMessages.every(m => !m.text)}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Crear Campaña
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create List Modal */}
      {showCreateList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Nueva Lista de Contactos</h3>
              <button onClick={() => setShowCreateList(false)} className="text-[#8b8b9e] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8b8b9e] mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="Clientes VIP, Promoción verano..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-[#8b8b9e] mb-1.5">Descripción</label>
                <input
                  type="text"
                  value={listDesc}
                  onChange={(e) => setListDesc(e.target.value)}
                  placeholder="Lista de clientes frecuentes..."
                  className="input-field"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCreateList(false)} className="btn-secondary">Cancelar</button>
                <button
                  onClick={handleCreateList}
                  disabled={saving || !listName}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && importingListId) {
            handleImportExcel(importingListId, file);
            e.target.value = "";
          }
        }}
      />

      {importResult && (
        <div className="fixed bottom-4 right-4 z-50 glass-card p-4 flex items-center gap-3 animate-in">
          <CheckCircle2 className="h-5 w-5 text-[#22c55e]" />
          <div>
            <p className="text-sm font-medium">Importación exitosa</p>
            <p className="text-xs text-[#8b8b9e]">
              {importResult.imported} importados, {importResult.skipped} omitidos
            </p>
          </div>
          <button onClick={() => setImportResult(null)} className="text-[#5a5a6e] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
