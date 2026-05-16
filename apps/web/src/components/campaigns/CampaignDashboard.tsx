'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE, dfetch, getTenantId } from '@/lib/api';
import { Loader2, Pause, Play, X, Send, BarChart3, ChevronRight } from 'lucide-react';

interface CampaignAdv {
  id: string;
  name: string;
  channel: 'whatsapp' | 'email' | 'sms';
  status: 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed' | 'cancelled';
  estimatedAudience: number;
  actualAudience: number | null;
  createdAt: string;
  scheduledAt?: string | null;
  metrics?: {
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    pending: number;
    replied: number;
    cancelled: number;
  };
  progress?: string;
}

interface FormData {
  name: string;
  channel: 'whatsapp' | 'email';
  content: string;
  segment: { includeInactive: boolean };
  schedule: { type: 'immediate' | 'scheduled'; sendAt?: string };
  throttle: { messagesPerMinute: number; dailyLimit: number };
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#8b8b9e',
  scheduled: '#3b82f6',
  sending: '#f59e0b',
  paused: '#f97316',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  sending: 'Enviando...',
  paused: 'Pausada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export default function CampaignDashboard() {
  const [tenantId, setTenantId] = useState('');
  const [campaigns, setCampaigns] = useState<CampaignAdv[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<CampaignAdv | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchCampaigns = useCallback(async (tid: string) => {
    try {
      const res = await dfetch(`${API_BASE}/api/campaigns-adv/${tid}`);
      if (!res.ok) throw new Error('Error al cargar campañas');
      const data = await res.json();
      setCampaigns(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tid = getTenantId();
    if (tid) {
      setTenantId(tid);
      fetchCampaigns(tid);
    } else {
      setLoading(false);
    }
  }, [fetchCampaigns]);

  // Polling cada 10s si hay campañas activas
  useEffect(() => {
    if (!tenantId) return;
    const hasActive = campaigns.some((c) => ['sending', 'scheduled'].includes(c.status));
    if (!hasActive) return;
    const interval = setInterval(() => fetchCampaigns(tenantId), 10_000);
    return () => clearInterval(interval);
  }, [campaigns, tenantId, fetchCampaigns]);

  const handleCreate = async (form: FormData) => {
    setSaving(true);
    try {
      const res = await dfetch(`${API_BASE}/api/campaigns-adv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tenantId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear campaña');
      }
      setShowForm(false);
      await fetchCampaigns(tenantId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      const res = await dfetch(`${API_BASE}/api/campaigns-adv/${tenantId}/${id}/${action}`, { method: 'POST' });
      if (!res.ok) throw new Error('Acción fallida');
      await fetchCampaigns(tenantId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const openDetails = async (c: CampaignAdv) => {
    try {
      const res = await dfetch(`${API_BASE}/api/campaigns-adv/${tenantId}/${c.id}`);
      if (!res.ok) throw new Error('Error al cargar detalles');
      const data = await res.json();
      setSelected(data.campaign ? { ...data.campaign, metrics: data.metrics, progress: data.progress } : c);
    } catch {
      setSelected(c);
    }
  };

  const stats = {
    active: campaigns.filter((c) => c.status === 'sending').length,
    scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    drafts: campaigns.filter((c) => c.status === 'draft').length,
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 items-center justify-center text-sm" style={{ color: '#ef4444' }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Campañas segmentadas
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Envía mensajes a segmentos dinámicos de clientes
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Send className="h-4 w-4" />
          Nueva campaña
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Activas', value: stats.active, color: '#f59e0b' },
          { label: 'Programadas', value: stats.scheduled, color: '#3b82f6' },
          { label: 'Completadas', value: stats.completed, color: '#22c55e' },
          { label: 'Borradores', value: stats.drafts, color: '#8b8b9e' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Canal</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Audiencia</th>
                <th className="px-5 py-3">Progreso</th>
                <th className="px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer transition-colors hover:bg-[var(--bg-surface-2)]"
                  onClick={() => openDetails(c)}
                >
                  <td className="px-5 py-3">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(c.createdAt).toLocaleDateString('es-CO')}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: c.channel === 'whatsapp' ? '#22c55e20' : '#8b5cf620',
                        color: c.channel === 'whatsapp' ? '#22c55e' : '#8b5cf6',
                      }}>
                      {c.channel === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: `${STATUS_COLORS[c.status]}20`, color: STATUS_COLORS[c.status] }}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {c.actualAudience ?? c.estimatedAudience}
                  </td>
                  <td className="px-5 py-3 min-w-[120px]">
                    {c.metrics ? (
                      <div>
                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                          <span>{c.metrics.sent + c.metrics.failed}</span>
                          <span>{c.progress || '0.0'}%</span>
                        </div>
                        <div className="w-full rounded-full h-1.5" style={{ background: 'var(--bg-surface-3)' }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${c.progress || 0}%`,
                              background: 'var(--accent-primary)',
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1.5">
                      {c.status === 'sending' && (
                        <button
                          onClick={() => handleAction(c.id, 'pause')}
                          className="p-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--bg-surface-3)]"
                          style={{ color: '#f59e0b' }}
                          title="Pausar"
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {c.status === 'paused' && (
                        <button
                          onClick={() => handleAction(c.id, 'resume')}
                          className="p-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--bg-surface-3)]"
                          style={{ color: '#3b82f6' }}
                          title="Reanudar"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {['draft', 'scheduled', 'sending', 'paused'].includes(c.status) && (
                        <button
                          onClick={() => handleAction(c.id, 'cancel')}
                          className="p-1.5 rounded-lg text-xs transition-colors hover:bg-red-500/10"
                          style={{ color: 'var(--text-tertiary)' }}
                          title="Cancelar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openDetails(c)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-surface-3)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Detalles"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <BarChart3 className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      No hay campañas segmentadas
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                      Crea una campaña para enviar mensajes a clientes por segmento
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showForm && (
        <CreateCampaignModal
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
          saving={saving}
        />
      )}

      {/* Detail Modal */}
      {selected && (
        <CampaignDetailModal
          campaign={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateCampaignModal({
  onClose,
  onSubmit,
  saving,
}: {
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormData>({
    name: '',
    channel: 'whatsapp',
    content: '',
    segment: { includeInactive: false },
    schedule: { type: 'immediate' },
    throttle: { messagesPerMinute: 30, dailyLimit: 1000 },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Nueva campaña segmentada
          </h3>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre</label>
            <input
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Promo mayo 2026"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Canal</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as any })}
                className="input-field"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Programación</label>
              <select
                value={form.schedule.type}
                onChange={(e) => setForm({ ...form, schedule: { type: e.target.value as any } })}
                className="input-field"
              >
                <option value="immediate">Inmediata</option>
                <option value="scheduled">Programada</option>
              </select>
            </div>
          </div>

          {form.schedule.type === 'scheduled' && (
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Fecha y hora</label>
              <input
                type="datetime-local"
                required
                onChange={(e) => setForm({ ...form, schedule: { ...form.schedule, sendAt: e.target.value } })}
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Contenido del mensaje
            </label>
            <textarea
              required
              maxLength={4000}
              rows={5}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Hola {{name}}, tenemos una oferta especial para ti..."
              className="input-field resize-none font-mono text-sm"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Variables: {'{{name}}'}, {'{{phone}}'}, {'{{email}}'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mensajes/min</label>
              <input
                type="number"
                min={1}
                max={60}
                value={form.throttle.messagesPerMinute}
                onChange={(e) => setForm({ ...form, throttle: { ...form.throttle, messagesPerMinute: parseInt(e.target.value) } })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>Límite diario</label>
              <input
                type="number"
                min={1}
                max={10000}
                value={form.throttle.dailyLimit}
                onChange={(e) => setForm({ ...form, throttle: { ...form.throttle, dailyLimit: parseInt(e.target.value) } })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeInactive"
              checked={form.segment.includeInactive}
              onChange={(e) => setForm({ ...form, segment: { ...form.segment, includeInactive: e.target.checked } })}
            />
            <label htmlFor="includeInactive" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Incluir clientes inactivos
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !form.name || !form.content}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Crear campaña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function CampaignDetailModal({ campaign, onClose }: { campaign: CampaignAdv; onClose: () => void }) {
  const m = campaign.metrics;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{campaign.name}</h3>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {m ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <MetricBox label="Enviados" value={m.sent} color="#3b82f6" />
                <MetricBox label="Entregados" value={m.delivered} color="#22c55e" />
                <MetricBox label="Leídos" value={m.read} color="#8b5cf6" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MetricBox label="Respondidos" value={m.replied} color="#f59e0b" />
                <MetricBox label="Fallidos" value={m.failed} color="#ef4444" />
                <MetricBox label="Pendientes" value={m.pending} color="#8b8b9e" />
              </div>
              <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Entrega: {m.total > 0 ? Math.round((m.delivered / m.total) * 100) : 0}%
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Lectura: {m.delivered > 0 ? Math.round((m.read / m.delivered) * 100) : 0}%
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Respuesta: {m.read > 0 ? Math.round((m.replied / m.read) * 100) : 0}%
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
              Métricas no disponibles
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-surface-2)' }}>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
    </div>
  );
}
