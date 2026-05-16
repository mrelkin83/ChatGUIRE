"use client";

import { useState, useEffect } from "react";
import { API_BASE, dfetch, getTenantId } from "@/lib/api";
import { Save, BrainCircuit, BookOpen, AlertTriangle, Trash2, Plus, X, Loader2, Pencil } from "lucide-react";

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category?: string;
  keywords?: string[];
}

export default function AIConfigPage() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [temperature, setTemperature] = useState(0.7);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [unanswered, setUnanswered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [addingEntry, setAddingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveAnswer, setResolveAnswer] = useState("");

  useEffect(() => {
    const id = getTenantId();
    if (id) {
      setTenantId(id);
      Promise.all([
        dfetch(`${API_BASE}/api/ai/config/${id}`).then((r) => r.json()),
        dfetch(`${API_BASE}/api/ai/knowledge/${id}`).then((r) => r.json()),
        dfetch(`${API_BASE}/api/ai/unanswered/${id}`).then((r) => r.json()),
      ])
        .then(([configRes, kbRes, unRes]) => {
          setSystemPrompt(configRes.systemPrompt || "");
          setModel(configRes.model || "gpt-4o-mini");
          setTemperature(configRes.temperature || 0.7);
          setKnowledge(Array.isArray(kbRes) ? kbRes : []);
          setUnanswered(Array.isArray(unRes) ? unRes : []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await dfetch(`${API_BASE}/api/ai/config/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, temperature, maxTokens: 500 }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const openAddModal = (prefillQuestion?: string) => {
    if (prefillQuestion) {
      setNewQuestion(prefillQuestion);
      setNewAnswer("");
    } else {
      setNewQuestion("");
      setNewAnswer("");
    }
    setNewCategory("general");
    setEditingEntry(null);
    setShowAddModal(true);
  };

  const openEditModal = (entry: KnowledgeEntry) => {
    setNewQuestion(entry.question);
    setNewAnswer(entry.answer);
    setNewCategory(entry.category || "general");
    setEditingEntry(entry);
    setShowAddModal(true);
  };

  const handleAddKnowledge = async () => {
    if (!newQuestion || !newAnswer) return;
    setAddingEntry(true);
    try {
      if (editingEntry) {
        const res = await dfetch(`${API_BASE}/api/ai/knowledge/${tenantId}/${editingEntry.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: newQuestion, answer: newAnswer, category: newCategory }),
        });
        if (res.ok) {
          setKnowledge(knowledge.map((k) => k.id === editingEntry.id ? { ...k, question: newQuestion, answer: newAnswer, category: newCategory } : k));
        }
      } else {
        const res = await dfetch(`${API_BASE}/api/ai/knowledge/${tenantId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: newQuestion, answer: newAnswer, category: newCategory }),
        });
        if (res.ok) {
          const entry = await res.json();
          setKnowledge([entry, ...knowledge]);
        }
      }
      setNewQuestion("");
      setNewAnswer("");
      setNewCategory("general");
      setEditingEntry(null);
      setShowAddModal(false);
    } catch {}
    setAddingEntry(false);
  };

  const handleDeleteKnowledge = async (id: string) => {
    try {
      await dfetch(`${API_BASE}/api/ai/knowledge/${tenantId}/${id}`, { method: "DELETE" });
      setKnowledge(knowledge.filter((k) => k.id !== id));
    } catch {}
  };

  const handleResolveUnanswered = async (id: string) => {
    if (!resolveAnswer) return;
    try {
      const res = await dfetch(`${API_BASE}/api/ai/unanswered/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: resolveAnswer }),
      });
      if (res.ok) {
        setUnanswered(unanswered.filter((u) => u.id !== id));
        setResolvingId(null);
        setResolveAnswer("");
        dfetch(`${API_BASE}/api/ai/knowledge/${tenantId}`)
          .then((r) => r.json())
          .then((kb) => { if (Array.isArray(kb)) setKnowledge(kb); });
      }
    } catch {}
  };

  const handleIgnoreUnanswered = async (id: string) => {
    try {
      await dfetch(`${API_BASE}/api/ai/unanswered/${id}/ignore`, { method: "POST" });
      setUnanswered(unanswered.filter((u) => u.id !== id));
    } catch {}
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
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Configuración IA</h1>
          <p className="mt-1 text-sm text-[#8b8b9e]">Personaliza el comportamiento de tu asistente</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>

      {saved && (
        <div className="rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/5 p-3 text-sm text-[#22c55e]">
          Configuración guardada exitosamente
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="glass-card p-6 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <BrainCircuit className="h-5 w-5 text-[#f59e0b]" />
            System Prompt
          </h3>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={10}
            className="input-field text-sm font-mono leading-relaxed"
            placeholder="Escribe el prompt del sistema..."
          />
        </div>

        <div className="glass-card p-6 space-y-5">
          <h3 className="text-lg font-semibold">Parámetros</h3>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#8b8b9e]">Modelo LLM</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="input-field">
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#8b8b9e]">Temperatura: {temperature.toFixed(1)}</label>
            <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full accent-[#f59e0b]" />
            <div className="mt-1 flex justify-between text-[10px] text-[#5a5a6e]">
              <span>Preciso</span>
              <span>Creativo</span>
            </div>
          </div>
        </div>
      </div>

      {unanswered.length > 0 && (
        <div className="glass-card border-l-4 border-l-[#f59e0b] p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-[#f59e0b]" />
            <span className="font-semibold">{unanswered.length} consultas sin respuesta - Necesitan entrenamiento</span>
          </div>
          <div className="space-y-2">
            {unanswered.slice(0, 10).map((item) => (
              <div key={item.id} className="rounded-lg bg-[#f59e0b]/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.question}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setResolvingId(item.id); setResolveAnswer(""); }}
                      className="text-xs px-3 py-1 rounded bg-[#f59e0b]/20 text-[#f59e0b] hover:bg-[#f59e0b]/30"
                    >
                      Resolver
                    </button>
                    <button
                      onClick={() => handleIgnoreUnanswered(item.id)}
                      className="text-xs px-3 py-1 rounded bg-[#252536] text-[#8b8b9e] hover:bg-[#252536]/80"
                    >
                      Ignorar
                    </button>
                  </div>
                </div>
                {resolvingId === item.id && (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={resolveAnswer}
                      onChange={(e) => setResolveAnswer(e.target.value)}
                      placeholder="Escribe la respuesta para esta consulta..."
                      rows={2}
                      className="input-field resize-none text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setResolvingId(null)} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
                      <button onClick={() => handleResolveUnanswered(item.id)} disabled={!resolveAnswer} className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50">
                        Guardar respuesta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="h-5 w-5 text-[#f59e0b]" />
            Base de Conocimiento ({knowledge.length})
          </h3>
          <button
            onClick={() => openAddModal()}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Agregar
          </button>
        </div>
        <div className="space-y-3">
          {knowledge.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between rounded-xl border border-[#252536] bg-[#0f0f16] p-4">
              <div className="flex-1 min-w-0">
                <p className="mb-1 text-sm font-medium text-[#f1f1f4] truncate">Q: {entry.question}</p>
                <p className="text-sm text-[#8b8b9e] line-clamp-2">{entry.answer}</p>
                {entry.category && (
                  <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded bg-[#252536] text-[#5a5a6e]">
                    {entry.category}
                  </span>
                )}
              </div>
              <div className="flex gap-1 ml-3 shrink-0">
                <button onClick={() => openEditModal(entry)} className="rounded-lg p-2 text-[#8b8b9e] hover:bg-[#252536] hover:text-[#f59e0b] transition-colors">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => handleDeleteKnowledge(entry.id)} className="rounded-lg p-2 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {knowledge.length === 0 && (
            <p className="py-6 text-center text-sm text-[#8b8b9e]">No hay entradas en la base de conocimiento</p>
          )}
        </div>
      </div>

      {/* Add/Edit Knowledge Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-lg">
            <div className="modal-header">
              <h3 className="text-lg font-semibold">{editingEntry ? "Editar entrada" : "Agregar a Base de Conocimiento"}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingEntry(null); }} className="text-[#8b8b9e] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label">Pregunta / Trigger</label>
                <input
                  type="text"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  placeholder="¿Cuánto cuesta una consulta general?"
                  className="input-field"
                />
              </div>
              <div>
                <label className="form-label">Respuesta</label>
                <textarea
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                  placeholder="Una consulta general tiene un costo de $50.000 COP..."
                  rows={4}
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="form-label">Categoría</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="input-field"
                >
                  <option value="general">General</option>
                  <option value="precios">Precios</option>
                  <option value="servicios">Servicios</option>
                  <option value="horarios">Horarios</option>
                  <option value="politicas">Políticas</option>
                  <option value="ubicacion">Ubicación</option>
                </select>
              </div>
              <div className="modal-footer">
                <button onClick={() => { setShowAddModal(false); setEditingEntry(null); }} className="btn-secondary">Cancelar</button>
                <button onClick={handleAddKnowledge} disabled={addingEntry || !newQuestion || !newAnswer} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {addingEntry ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingEntry ? "Guardar Cambios" : "Agregar Entrada"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
