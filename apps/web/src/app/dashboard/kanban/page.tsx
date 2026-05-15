"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import { 
  Plus, MoreHorizontal, MessageSquare, Phone, User, Calendar,
  ChevronDown, Filter, Search, Loader2, X, GripVertical
} from "lucide-react";

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isFinal: boolean;
}

interface KanbanConversation {
  id: string;
  customerName: string;
  customerPhone: string;
  channel: string;
  lastMessage: string;
  lastMessageAt: string;
  potentialValue: number;
  assignedAgentId: string;
  agentName: string | null;
  kanbanColumnId: string | null;
  status: string;
}

export default function KanbanPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [conversations, setConversations] = useState<KanbanConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColColor, setNewColColor] = useState("#6366F1");
  const [saving, setSaving] = useState(false);
  const [filterChannel, setFilterChannel] = useState<string>("");
  const [draggedConv, setDraggedConv] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/tenants`)
      .then((r) => r.json())
      .then((tenants) => {
        if (tenants.length > 0) {
          const id = tenants[0].id;
          setTenantId(id);
          return Promise.all([
            fetch(`${API_BASE}/api/kanban/columns/${id}`).then((r) => r.json()),
            fetch(`${API_BASE}/api/kanban/conversations/${id}`).then((r) => r.json()),
          ]);
        }
        throw new Error("No tenants");
      })
      .then(([colsData, convsData]) => {
        setColumns(Array.isArray(colsData) ? colsData : []);
        setConversations(Array.isArray(convsData) ? convsData : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCreateColumn = async () => {
    if (!newColName) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/kanban/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          name: newColName,
          color: newColColor,
        }),
      });
      if (res.ok) {
        const col = await res.json();
        setColumns([...columns, col]);
        setNewColName("");
        setShowAddColumn(false);
      }
    } catch {}
    setSaving(false);
  };

  const handleDeleteColumn = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/kanban/columns/${id}`, { method: "DELETE" });
      setColumns(columns.filter((c) => c.id !== id));
      // Move conversations from deleted column to unassigned
      setConversations(conversations.map(c => 
        c.kanbanColumnId === id ? { ...c, kanbanColumnId: null } : c
      ));
    } catch {}
  };

  const handleDragStart = (convId: string) => {
    setDraggedConv(convId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (!draggedConv) return;
    
    try {
      await fetch(`${API_BASE}/api/kanban/conversations/${draggedConv}/move`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnId }),
      });
      
      setConversations(conversations.map(c => 
        c.id === draggedConv ? { ...c, kanbanColumnId: columnId } : c
      ));
    } catch {}
    
    setDraggedConv(null);
  };

  const getConversationsForColumn = (columnId: string | null) => {
    let filtered = conversations.filter(c => c.kanbanColumnId === columnId);
    if (filterChannel) {
      filtered = filtered.filter(c => c.channel === filterChannel);
    }
    return filtered;
  };

  const channelColors: Record<string, string> = {
    whatsapp: "#22c55e",
    instagram: "#ec4899",
    facebook: "#3b82f6",
    tiktok: "#f1f1f4",
  };

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#f59e0b] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>Kanban</h1>
          <p className="mt-1 text-sm text-[#8b8b9e]">Gestiona conversaciones por etapa</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filterChannel}
            onChange={(e) => setFilterChannel(e.target.value)}
            className="input-field text-sm py-1.5"
          >
            <option value="">Todos los canales</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
          </select>
          <button onClick={() => setShowAddColumn(true)} className="btn-secondary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Columna
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {/* Unassigned column */}
        <div 
          className="flex-shrink-0 w-72"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop("")}
        >
          <div className="glass-card h-full flex flex-col">
            <div className="p-3 border-b border-[#252536] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#5a5a6e]" />
                <span className="text-sm font-medium">Sin asignar</span>
                <span className="text-xs text-[#5a5a6e] bg-[#161822] px-1.5 py-0.5 rounded">
                  {getConversationsForColumn(null).length}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {getConversationsForColumn(null).map((conv) => (
                <div
                  key={conv.id}
                  draggable
                  onDragStart={() => handleDragStart(conv.id)}
                  className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[#252536]/80 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ec4899] flex items-center justify-center text-xs font-bold">
                        {conv.customerName?.charAt(0)?.toUpperCase() || "C"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{conv.customerName}</p>
                        <div className="flex items-center gap-1">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ background: channelColors[conv.channel] }} />
                          <span className="text-[10px] text-[#5a5a6e]">{conv.channel}</span>
                        </div>
                      </div>
                    </div>
                    <button className="p-1 rounded hover:bg-[#252536] text-[#5a5a6e]">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-[#8b8b9e] line-clamp-2 mb-2">{conv.lastMessage}</p>
                  {conv.potentialValue > 0 && (
                    <p className="text-xs font-medium text-[#f59e0b]">{formatCOP(conv.potentialValue)}</p>
                  )}
                  {conv.agentName && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <User className="h-3 w-3 text-[#5a5a6e]" />
                      <span className="text-[10px] text-[#5a5a6e]">{conv.agentName}</span>
                    </div>
                  )}
                </div>
              ))}
              {getConversationsForColumn(null).length === 0 && (
                <div className="py-8 text-center text-xs text-[#5a5a6e]">
                  Sin conversaciones
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kanban columns */}
        {columns.map((col) => {
          const colConvs = getConversationsForColumn(col.id);
          const totalValue = colConvs.reduce((sum, c) => sum + (c.potentialValue || 0), 0);
          
          return (
            <div 
              key={col.id} 
              className="flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="glass-card h-full flex flex-col">
                <div className="p-3 border-b border-[#252536] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-sm font-medium">{col.name}</span>
                    <span className="text-xs text-[#5a5a6e] bg-[#161822] px-1.5 py-0.5 rounded">
                      {colConvs.length}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleDeleteColumn(col.id)}
                    className="p-1 rounded hover:bg-[#ef4444]/10 text-[#5a5a6e] hover:text-[#ef4444]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {totalValue > 0 && (
                  <div className="px-3 py-1.5 border-b border-[#252536] bg-[#161822]">
                    <p className="text-xs text-[#8b8b9e]">Total: <span className="font-medium text-[#f59e0b]">{formatCOP(totalValue)}</span></p>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {colConvs.map((conv) => (
                    <div
                      key={conv.id}
                      draggable
                      onDragStart={() => handleDragStart(conv.id)}
                      className="glass-card p-3 cursor-grab active:cursor-grabbing hover:border-[#252536]/80 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ec4899] flex items-center justify-center text-xs font-bold">
                            {conv.customerName?.charAt(0)?.toUpperCase() || "C"}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{conv.customerName}</p>
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-1.5 rounded-full" style={{ background: channelColors[conv.channel] }} />
                              <span className="text-[10px] text-[#5a5a6e]">{conv.channel}</span>
                            </div>
                          </div>
                        </div>
                        <button className="p-1 rounded hover:bg-[#252536] text-[#5a5a6e]">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-[#8b8b9e] line-clamp-2 mb-2">{conv.lastMessage}</p>
                      {conv.potentialValue > 0 && (
                        <p className="text-xs font-medium text-[#f59e0b]">{formatCOP(conv.potentialValue)}</p>
                      )}
                      {conv.agentName && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <User className="h-3 w-3 text-[#5a5a6e]" />
                          <span className="text-[10px] text-[#5a5a6e]">{conv.agentName}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {colConvs.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#5a5a6e]">
                      Sin conversaciones
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add column button */}
        <div className="flex-shrink-0 w-72">
          <button
            onClick={() => setShowAddColumn(true)}
            className="w-full h-full min-h-[200px] glass-card flex flex-col items-center justify-center gap-2 text-[#5a5a6e] hover:text-[#8b8b9e] hover:border-[#252536]/80 transition-colors"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm">Agregar columna</span>
          </button>
        </div>
      </div>

      {/* Add Column Modal */}
      {showAddColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Nueva Columna</h3>
              <button onClick={() => setShowAddColumn(false)} className="text-[#8b8b9e] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8b8b9e] mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="Nuevo, En conversación, Cerrado..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-[#8b8b9e] mb-1.5">Color</label>
                <div className="flex gap-2">
                  {['#6366F1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewColColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newColColor === color ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowAddColumn(false)} className="btn-secondary">Cancelar</button>
                <button
                  onClick={handleCreateColumn}
                  disabled={saving || !newColName}
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
    </div>
  );
}
