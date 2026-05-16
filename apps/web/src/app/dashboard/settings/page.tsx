"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Building2, Briefcase, Clock, CreditCard, BrainCircuit,
  BookOpen, Bell, Palette, Eye, EyeOff, Copy, Plus,
  Pencil, Trash2, Check, Loader2, X, Upload, Globe
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { API_BASE, dfetch, getTenantId } from "@/lib/api";
const API = `${API_BASE}/api`;

const NAV_SECTIONS = [
  { id: "negocio", label: "Negocio", icon: Building2 },
  { id: "actividad", label: "Actividad", icon: Briefcase },
  { id: "horarios", label: "Horarios", icon: Clock },
  { id: "pagos", label: "Pagos", icon: CreditCard },
  { id: "agente", label: "Agente IA", icon: BrainCircuit },
  { id: "conocimiento", label: "Base C.", icon: BookOpen },
  { id: "notificaciones", label: "Notificac.", icon: Bell },
  { id: "apariencia", label: "Apariencia", icon: Palette },
];

const BUSINESS_TYPES = [
  { key: "restaurante", label: "Restaurante", icon: "🍽️" },
  { key: "ropa", label: "Ropa/Moda", icon: "👗" },
  { key: "salon", label: "Salón Belleza", icon: "💇" },
  { key: "tecnologia", label: "Tecnología", icon: "💻" },
  { key: "salud", label: "Salud", icon: "🏥" },
  { key: "educacion", label: "Educación", icon: "📚" },
  { key: "legal", label: "Legal", icon: "⚖️" },
  { key: "inmobiliaria", label: "Inmobiliaria", icon: "🏠" },
  { key: "automotriz", label: "Automotriz", icon: "🚗" },
  { key: "fitness", label: "Fitness", icon: "🏋️" },
  { key: "fotografia", label: "Fotografía", icon: "📸" },
  { key: "eventos", label: "Eventos", icon: "🎉" },
  { key: "alimentos", label: "Alimentos", icon: "🍔" },
  { key: "supermercado", label: "Supermercado", icon: "🛒" },
  { key: "farmacia", label: "Farmacia", icon: "💊" },
  { key: "veterinaria", label: "Veterinaria", icon: "🐾" },
  { key: "construccion", label: "Construcción", icon: "🏗️" },
  { key: "consultoria", label: "Consultoría", icon: "💼" },
  { key: "marketing", label: "Marketing", icon: "📈" },
  { key: "turismo", label: "Turismo", icon: "✈️" },
];

const CAPABILITIES = [
  { key: "delivery", label: "Delivery", desc: "Envíos a domicilio" },
  { key: "citas", label: "Citas", desc: "Agenda y reservas" },
  { key: "catalogo", label: "Catálogo", desc: "Productos/servicios" },
  { key: "pagos_online", label: "Pagos online", desc: "Links de pago Wompi" },
  { key: "pedidos", label: "Pedidos", desc: "Carrito de compras" },
  { key: "escalamiento", label: "Escalamiento humano", desc: "Agente real disponible" },
  { key: "multi_agente", label: "Multi-agente", desc: "Varios agentes IA" },
  { key: "campanas", label: "Campañas", desc: "Mensajes masivos" },
];

const DAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"] as const;
const DAY_LABELS: Record<string, string> = {
  lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
  jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
};

interface KnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category?: string;
  keywords?: string[];
}

interface UnansweredQuestion {
  id: string;
  question: string;
  count: number;
  lastAsked: string;
}

interface Settings {
  name: string;
  phone: string;
  timezone: string;
  address: string;
  description: string;
  website: string;
  logoUrl: string;
  businessType: string;
  capabilities: string[];
  schedule: Record<string, { open: string; close: string; active: boolean }>;
  wompiMode: "sandbox" | "production";
  wompiPublicKey: string;
  wompiPrivateKey: string;
  ai_agentName: string;
  ai_model: string;
  ai_tone: string;
  ai_temperature: number;
  ai_maxTokens: number;
  ai_historyMessages: number;
  ai_escalateAfter: number;
  ai_additionalInstructions: string;
  knowledge: KnowledgeEntry[];
  unanswered: UnansweredQuestion[];
  notif_paymentReceived: boolean;
  notif_escalation: boolean;
  notif_newAppointment: boolean;
  notif_dailySummary: boolean;
  notif_alertEmail: string;
  notif_alertWhatsApp: string;
  theme: "dark" | "light";
}

const defaultSchedule = () => {
  const s: Record<string, { open: string; close: string; active: boolean }> = {};
  DAYS.forEach((d, i) => {
    s[d] = {
      open: i < 5 ? "08:00" : "09:00",
      close: i < 5 ? "18:00" : "13:00",
      active: i < 6,
    };
  });
  return s;
};

const defaultSettings = (): Settings => ({
  name: "", phone: "", timezone: "America/Bogota", address: "",
  description: "", website: "", logoUrl: "", businessType: "restaurante",
  capabilities: ["catalogo", "pagos_online"],
  schedule: defaultSchedule(),
  wompiMode: "sandbox", wompiPublicKey: "", wompiPrivateKey: "",
  ai_agentName: "", ai_model: "gpt-4o-mini", ai_tone: "Semiformal",
  ai_temperature: 0.7, ai_maxTokens: 500, ai_historyMessages: 10,
  ai_escalateAfter: 3, ai_additionalInstructions: "",
  knowledge: [], unanswered: [],
  notif_paymentReceived: true, notif_escalation: true,
  notif_newAppointment: true, notif_dailySummary: false,
  notif_alertEmail: "", notif_alertWhatsApp: "",
  theme: "dark",
});

function GradientSlider({
  value, min, max, step, onChange, label, displayValue,
}: {
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; label: string; displayValue: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[var(--text-secondary)] font-medium">{label}</span>
        <span className="text-sm font-[var(--font-mono)] text-[var(--accent-primary)] font-semibold tabular-nums">
          {displayValue}
        </span>
      </div>
      <div className="relative h-2 flex items-center">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-[var(--bg-surface-3)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-x-0 w-full h-2 opacity-0 cursor-pointer z-10"
        />
        <div
          className="absolute w-4 h-4 rounded-full bg-white shadow-[0_0_0_2px_var(--accent-primary),0_2px_8px_rgba(0,0,0,0.3)] pointer-events-none transition-all duration-75"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold font-[var(--font-display)] text-[var(--text-primary)]">
        {children}
      </h2>
      <div className="mt-2 h-px bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-primary)]/30 to-transparent" />
    </div>
  );
}

function SkeletonShimmer() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded-lg bg-[var(--bg-surface-3)]" />
      <div className="h-px bg-[var(--bg-surface-3)]" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-10 rounded-lg bg-[var(--bg-surface-3)]" />
        <div className="h-10 rounded-lg bg-[var(--bg-surface-3)]" />
        <div className="col-span-2 h-24 rounded-lg bg-[var(--bg-surface-3)]" />
      </div>
      <div className="h-10 w-32 rounded-lg bg-[var(--bg-surface-3)] self-end" />
    </div>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("negocio");
  const [settings, setSettings] = useState<Settings>(defaultSettings());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [showPublic, setShowPublic] = useState(false);
  const [showPrivate, setShowPrivate] = useState(false);
  const [knowledgeModal, setKnowledgeModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [entryForm, setEntryForm] = useState({ question: "", answer: "", category: "general", keywords: "" });
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const id = getTenantId();
        if (!id) { setLoading(false); return; }
        setTenantId(id);
        const [cfgRes, tenantsRes] = await Promise.all([
          dfetch(`${API}/tenant-config/${id}`),
          dfetch(`${API}/tenants`),
        ]);
        const cfg = await cfgRes.json();
        const tenantsData = await tenantsRes.json();
        const t = (Array.isArray(tenantsData) ? tenantsData[0] : tenantsData) || {};
        setSettings((s) => ({
          ...s,
          name: t.name || cfg.name || "",
          phone: cfg.business_info?.phone || "",
          address: cfg.business_info?.address || "",
          description: cfg.business_info?.description || "",
          website: cfg.business_info?.website || "",
          businessType: cfg.business_type?.key || "restaurante",
          capabilities: cfg.business_type?.capabilities || ["catalogo", "pagos_online"],
          schedule: cfg.schedule || s.schedule,
          wompiMode: cfg.wompi?.mode || "sandbox",
          wompiPublicKey: cfg.wompi?.publicKey || "",
          wompiPrivateKey: cfg.wompi?.privateKey || "",
          ai_agentName: cfg.ai_config?.agentName || "",
          ai_model: t.ai_model || "gpt-4o-mini",
          ai_temperature: t.ai_temperature != null ? Number(t.ai_temperature) : 0.7,
          ai_maxTokens: t.ai_max_tokens ?? 500,
          ai_tone: cfg.ai_config?.tone || "Semiformal",
          ai_historyMessages: cfg.ai_config?.historyMessages ?? 10,
          ai_escalateAfter: cfg.ai_config?.escalateAfter ?? 3,
          ai_additionalInstructions: cfg.ai_config?.additionalInstructions || "",
          notif_paymentReceived: cfg.notifications?.paymentReceived ?? true,
          notif_escalation: cfg.notifications?.escalation ?? true,
          notif_newAppointment: cfg.notifications?.newAppointment ?? true,
          notif_dailySummary: cfg.notifications?.dailySummary ?? false,
          notif_alertEmail: cfg.notifications?.alertEmail || "",
          notif_alertWhatsApp: cfg.notifications?.alertWhatsApp || "",
          theme: cfg.appearance?.theme || "dark",
        }));
      } catch {
        toast.error("Error cargando configuración");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const loadKnowledge = useCallback(async () => {
    if (!tenantId) return;
    try {
      const [kRes, uRes] = await Promise.all([
        dfetch(`${API}/ai/knowledge/${tenantId}`).then((r) => r.json()),
        dfetch(`${API}/ai/unanswered/${tenantId}`).then((r) => r.json()),
      ]);
      setSettings((s) => ({ ...s, knowledge: Array.isArray(kRes) ? kRes : [], unanswered: Array.isArray(uRes) ? uRes : [] }));
    } catch {}
  }, [tenantId]);

  useEffect(() => {
    if (activeSection === "conocimiento") loadKnowledge();
  }, [activeSection, loadKnowledge]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const updateSchedule = (day: string, field: string, value: string | boolean) => {
    setSettings((s) => ({
      ...s,
      schedule: { ...s.schedule, [day]: { ...s.schedule[day], [field]: value } },
    }));
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      await dfetch(`${API}/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settings.name,
          timezone: settings.timezone,
          ai_model: settings.ai_model,
          ai_temperature: settings.ai_temperature,
          ai_max_tokens: settings.ai_maxTokens,
        }),
      });
      await dfetch(`${API}/tenant-config/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_info: {
            phone: settings.phone,
            address: settings.address,
            description: settings.description,
            website: settings.website,
          },
          business_type: {
            key: settings.businessType,
            label: BUSINESS_TYPES.find((b) => b.key === settings.businessType)?.label || "Otro",
            capabilities: settings.capabilities,
          },
          schedule: settings.schedule,
          wompi: {
            mode: settings.wompiMode,
            publicKey: settings.wompiPublicKey,
            privateKey: settings.wompiPrivateKey,
          },
          ai_config: {
            agentName: settings.ai_agentName,
            tone: settings.ai_tone,
            historyMessages: settings.ai_historyMessages,
            escalateAfter: settings.ai_escalateAfter,
            additionalInstructions: settings.ai_additionalInstructions,
          },
          notifications: {
            paymentReceived: settings.notif_paymentReceived,
            escalation: settings.notif_escalation,
            newAppointment: settings.notif_newAppointment,
            dailySummary: settings.notif_dailySummary,
            alertEmail: settings.notif_alertEmail,
            alertWhatsApp: settings.notif_alertWhatsApp,
          },
          appearance: { theme: settings.theme },
        }),
      });
      toast.success("Guardado");
    } catch {
      toast.error("Error al guardar");
    }
    setSaving(false);
  };

  const handleSaveKnowledge = async () => {
    if (!tenantId) return;
    try {
      const payload = {
        question: entryForm.question,
        answer: entryForm.answer,
        category: entryForm.category,
        keywords: entryForm.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      };
      if (editingEntry) {
        await dfetch(`${API}/ai/knowledge/${tenantId}/${editingEntry.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await dfetch(`${API}/ai/knowledge/${tenantId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      toast.success("Entrada guardada");
      setKnowledgeModal(false);
      setEditingEntry(null);
      setEntryForm({ question: "", answer: "", category: "general", keywords: "" });
      loadKnowledge();
    } catch {
      toast.error("Error guardando entrada");
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!tenantId) return;
    try {
      await dfetch(`${API}/ai/knowledge/${tenantId}/${id}`, { method: "DELETE" });
      toast.success("Entrada eliminada");
      loadKnowledge();
    } catch {
      toast.error("Error eliminando");
    }
  };

  const handleResolveUnanswered = async (q: UnansweredQuestion) => {
    setEditingEntry(null);
    setEntryForm({ question: q.question, answer: "", category: "general", keywords: "" });
    setKnowledgeModal(true);
  };

  const webhookUrl = `${API_BASE}/api/webhooks/wompi`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada");
  };

  const sectionVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const renderNegocio = () => (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-6">
        <SectionHeading>Información del negocio</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <Input label="Nombre del negocio" value={settings.name}
              onChange={(e) => update("name", e.target.value)} placeholder="Mi Negocio S.A.S" />
          </div>
          <div className="flex items-start gap-5 md:col-span-2">
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-[var(--border-default)] bg-[var(--bg-surface-1)] flex items-center justify-center text-[var(--text-tertiary)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5" />
                )}
              </div>
              <span className="text-[11px] text-[var(--text-tertiary)]">Logo</span>
            </div>
            <div className="flex-1">
              <Input label="Sitio web" value={settings.website}
                onChange={(e) => update("website", e.target.value)} placeholder="https://minegocio.com"
                icon={<Globe className="w-4 h-4" />} />
            </div>
          </div>
          <Input label="Teléfono" value={settings.phone}
            onChange={(e) => update("phone", e.target.value)} placeholder="+57 300 000 0000" />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-[var(--text-secondary)] font-medium">Zona horaria</label>
            <select
              value={settings.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              className="bg-[var(--bg-surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] py-2.5 px-3 rounded-[var(--radius-md)] text-sm w-full transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--accent-primary-subtle)]"
            >
              <option value="America/Bogota">Bogotá (GMT-5)</option>
              <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
              <option value="America/Lima">Lima (GMT-5)</option>
              <option value="America/Santiago">Santiago (GMT-4)</option>
              <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Input label="Dirección" value={settings.address}
              onChange={(e) => update("address", e.target.value)} placeholder="Calle 123, Bogotá" />
          </div>
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[13px] text-[var(--text-secondary)] font-medium">Descripción</label>
            <textarea
              value={settings.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe tu negocio... La IA usa esta información."
              rows={3}
              className="bg-[var(--bg-surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] py-2.5 px-3 rounded-[var(--radius-md)] text-sm w-full transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--accent-primary-subtle)] placeholder:text-[var(--text-tertiary)] resize-none"
            />
            <p className="text-[11px] text-[var(--text-tertiary)]">La IA usa esta descripción para responder a los clientes</p>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} loading={saving} icon={<Check className="w-4 h-4" />}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </GlassCard>
  );

  const renderActividad = () => (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-6">
        <SectionHeading>Actividad económica</SectionHeading>
        <p className="text-sm text-[var(--text-tertiary)] mb-4">Selecciona el tipo de negocio</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-8">
          {BUSINESS_TYPES.map((bt) => (
            <motion.button
              key={bt.key}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => update("businessType", bt.key)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3.5 rounded-xl border text-center transition-all",
                settings.businessType === bt.key
                  ? "border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)] shadow-[0_0_0_1px_var(--accent-primary)]"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface-1)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface-2)]"
              )}
            >
              <span className="text-2xl">{bt.icon}</span>
              <span className={cn(
                "text-xs font-medium leading-tight",
                settings.businessType === bt.key ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)]"
              )}>
                {bt.label}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="h-px bg-[var(--border-subtle)] mb-6" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Capacidades</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CAPABILITIES.map((cap) => {
            const active = settings.capabilities.includes(cap.key);
            return (
              <div
                key={cap.key}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border transition-all",
                  active
                    ? "border-[var(--accent-primary)]/30 bg-[var(--accent-primary-subtle)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface-1)]"
                )}
              >
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{cap.label}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">{cap.desc}</div>
                </div>
                <Toggle
                  checked={active}
                  onChange={() => update(
                    "capabilities",
                    active
                      ? settings.capabilities.filter((c) => c !== cap.key)
                      : [...settings.capabilities, cap.key]
                  )}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} loading={saving} icon={<Check className="w-4 h-4" />}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </GlassCard>
  );

  const renderHorarios = () => (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-6">
        <SectionHeading>Horarios de atención</SectionHeading>
        <div className="space-y-1">
          <div className="grid grid-cols-[120px_1fr_1fr_60px] gap-3 items-center px-3 pb-2">
            <span className="text-[11px] text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">Día</span>
            <span className="text-[11px] text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">Apertura</span>
            <span className="text-[11px] text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">Cierre</span>
            <span className="text-[11px] text-[var(--text-tertiary)] font-semibold uppercase tracking-wider text-center">Activo</span>
          </div>
          {DAYS.map((day) => {
            const sch = settings.schedule[day] || { open: "08:00", close: "18:00", active: true };
            return (
              <motion.div
                key={day}
                initial={false}
                animate={{ opacity: sch.active ? 1 : 0.45 }}
                className={cn(
                  "grid grid-cols-[120px_1fr_1fr_60px] gap-3 items-center p-3 rounded-xl transition-colors",
                  sch.active ? "bg-[var(--bg-surface-1)]" : "bg-transparent"
                )}
              >
                <span className="text-sm font-medium text-[var(--text-primary)]">{DAY_LABELS[day]}</span>
                <input
                  type="time" value={sch.open} disabled={!sch.active}
                  onChange={(e) => updateSchedule(day, "open", e.target.value)}
                  className="bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] py-2 px-3 rounded-lg text-sm font-[var(--font-mono)] text-center transition-all focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <input
                  type="time" value={sch.close} disabled={!sch.active}
                  onChange={(e) => updateSchedule(day, "close", e.target.value)}
                  className="bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] py-2 px-3 rounded-lg text-sm font-[var(--font-mono)] text-center transition-all focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <div className="flex justify-center">
                  <Toggle checked={sch.active} onChange={(v) => updateSchedule(day, "active", v)} />
                </div>
              </motion.div>
            );
          })}
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} loading={saving} icon={<Check className="w-4 h-4" />}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </GlassCard>
  );

  const renderPagos = () => (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-6">
        <SectionHeading>Pagos Wompi</SectionHeading>
        <div className="flex gap-1 p-1 bg-[var(--bg-surface-1)] rounded-xl w-fit mb-6">
          {(["sandbox", "production"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => update("wompiMode", mode)}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-medium transition-all",
                settings.wompiMode === mode
                  ? "bg-[var(--accent-primary)] text-white shadow-[var(--shadow-glow-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {mode === "sandbox" ? "Sandbox" : "Producción"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-[var(--text-secondary)] font-medium">Public Key</label>
            <div className="relative">
              <input
                type={showPublic ? "text" : "password"}
                value={settings.wompiPublicKey}
                onChange={(e) => update("wompiPublicKey", e.target.value)}
                placeholder="pub_test_xxxxxxxx"
                className="bg-[var(--bg-surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] py-2.5 px-3 pr-10 rounded-[var(--radius-md)] text-sm w-full font-[var(--font-mono)] transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--accent-primary-subtle)]"
              />
              <button onClick={() => setShowPublic(!showPublic)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                {showPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-[var(--text-secondary)] font-medium">Private Key</label>
            <div className="relative">
              <input
                type={showPrivate ? "text" : "password"}
                value={settings.wompiPrivateKey}
                onChange={(e) => update("wompiPrivateKey", e.target.value)}
                placeholder="prv_test_xxxxxxxx"
                className="bg-[var(--bg-surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] py-2.5 px-3 pr-10 rounded-[var(--radius-md)] text-sm w-full font-[var(--font-mono)] transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--accent-primary-subtle)]"
              />
              <button onClick={() => setShowPrivate(!showPrivate)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                {showPrivate ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] text-[var(--text-secondary)] font-medium">Webhook URL</label>
          <div className="flex items-center gap-2">
            <input
              readOnly value={webhookUrl}
              className="flex-1 bg-[var(--bg-surface-1)] border border-[var(--border-default)] text-[var(--text-tertiary)] py-2.5 px-3 rounded-[var(--radius-md)] text-sm font-[var(--font-mono)] cursor-default"
            />
            <Button variant="secondary" size="md" onClick={copyWebhook} icon={<Copy className="w-4 h-4" />}>
              Copiar
            </Button>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)]">Configura esta URL en tu panel de Wompi</p>
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} loading={saving} icon={<Check className="w-4 h-4" />}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </GlassCard>
  );

  const renderAgente = () => (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-6">
        <SectionHeading>Agente IA</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input label="Nombre del agente" value={settings.ai_agentName}
            onChange={(e) => update("ai_agentName", e.target.value)} placeholder="Asistente virtual" />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-[var(--text-secondary)] font-medium">Modelo</label>
            <select
              value={settings.ai_model}
              onChange={(e) => update("ai_model", e.target.value)}
              className="bg-[var(--bg-surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] py-2.5 px-3 rounded-[var(--radius-md)] text-sm w-full transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--accent-primary-subtle)]"
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini-latest">GPT-4o Mini Latest</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-[var(--text-secondary)] font-medium">Tono</label>
            <div className="flex gap-1 p-1 bg-[var(--bg-surface-1)] rounded-xl">
              {(["Formal", "Semiformal", "Casual"] as const).map((tone) => (
                <button
                  key={tone}
                  onClick={() => update("ai_tone", tone)}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    settings.ai_tone === tone
                      ? "bg-[var(--accent-primary)] text-white shadow-[var(--shadow-glow-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
          <div />
          <div className="md:col-span-2">
            <GradientSlider
              label="Temperatura" min={0} max={1} step={0.1}
              value={settings.ai_temperature}
              onChange={(v) => update("ai_temperature", v)}
              displayValue={settings.ai_temperature.toFixed(1)}
            />
          </div>
          <div className="md:col-span-2">
            <GradientSlider
              label="Max tokens" min={100} max={2000} step={100}
              value={settings.ai_maxTokens}
              onChange={(v) => update("ai_maxTokens", v)}
              displayValue={String(settings.ai_maxTokens)}
            />
          </div>
          <div className="md:col-span-2">
            <GradientSlider
              label="Ventana historial" min={5} max={20} step={1}
              value={settings.ai_historyMessages}
              onChange={(v) => update("ai_historyMessages", v)}
              displayValue={`${settings.ai_historyMessages} mensajes`}
            />
          </div>
          <div className="md:col-span-2">
            <GradientSlider
              label="Umbral escalamiento" min={1} max={5} step={1}
              value={settings.ai_escalateAfter}
              onChange={(v) => update("ai_escalateAfter", v)}
              displayValue={`${settings.ai_escalateAfter} intentos`}
            />
          </div>
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className="text-[13px] text-[var(--text-secondary)] font-medium">Instrucciones adicionales</label>
            <textarea
              value={settings.ai_additionalInstructions}
              onChange={(e) => update("ai_additionalInstructions", e.target.value)}
              placeholder="Ej: Solicitar cédula antes de agendar cita. Siempre saludar con el nombre del cliente..."
              rows={3}
              className="bg-[var(--bg-surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] py-2.5 px-3 rounded-[var(--radius-md)] text-sm w-full transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--accent-primary-subtle)] placeholder:text-[var(--text-tertiary)] resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} loading={saving} icon={<Check className="w-4 h-4" />}>
            Guardar cambios
          </Button>
        </div>
      </div>
    </GlassCard>
  );

  const renderConocimiento = () => (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-6">
        <SectionHeading>Base de conocimiento</SectionHeading>
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-[var(--text-tertiary)]">
            {settings.knowledge.length} entradas configuradas
          </p>
          <Button
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingEntry(null);
              setEntryForm({ question: "", answer: "", category: "general", keywords: "" });
              setKnowledgeModal(true);
            }}
          >
            Agregar entrada
          </Button>
        </div>
        {settings.knowledge.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-tertiary)]">No hay entradas aún. Agrega preguntas frecuentes para tu IA.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {settings.knowledge.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group flex items-start gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] hover:border-[var(--border-default)] transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{entry.question}</p>
                    {entry.category && <Badge variant="primary">{entry.category}</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] line-clamp-2">{entry.answer}</p>
                  {entry.keywords && entry.keywords.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {entry.keywords.map((kw, i) => (
                        <Badge key={i} variant="gray">{kw}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditingEntry(entry);
                      setEntryForm({
                        question: entry.question,
                        answer: entry.answer,
                        category: entry.category || "general",
                        keywords: entry.keywords?.join(", ") || "",
                      });
                      setKnowledgeModal(true);
                    }}
                    className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary-subtle)] transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.08)] transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {settings.unanswered.length > 0 && (
          <>
            <div className="h-px bg-[var(--border-subtle)] my-6" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              Preguntas sin respuesta
              <Badge variant="amber">{settings.unanswered.length}</Badge>
            </h3>
            <div className="space-y-2">
              {settings.unanswered.map((q) => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm text-[var(--text-primary)] truncate">{q.question}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">Preguntada {q.count} veces</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => handleResolveUnanswered(q)}>
                      Resolver
                    </Button>
                    <Button size="sm" variant="ghost" onClick={async () => {
                      try {
                        await dfetch(`${API}/ai/unanswered/${q.id}/ignore`, { method: "POST" });
                      } catch {}
                      setSettings((s) => ({ ...s, unanswered: s.unanswered.filter((u) => u.id !== q.id) }));
                      toast.success("Ignorada");
                    }}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal open={knowledgeModal} onClose={() => { setKnowledgeModal(false); setEditingEntry(null); }}
        title={editingEntry ? "Editar entrada" : "Nueva entrada"} maxWidth="max-w-lg">
        <div className="space-y-4">
          <Input label="Pregunta" value={entryForm.question}
            onChange={(e) => setEntryForm({ ...entryForm, question: e.target.value })}
            placeholder="¿Cuál es el horario de atención?" />
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-[var(--text-secondary)] font-medium">Respuesta</label>
            <textarea
              value={entryForm.answer}
              onChange={(e) => setEntryForm({ ...entryForm, answer: e.target.value })}
              placeholder="Nuestro horario es de lunes a viernes..."
              rows={3}
              className="bg-[var(--bg-surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] py-2.5 px-3 rounded-[var(--radius-md)] text-sm w-full transition-all focus:outline-none focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_3px_var(--accent-primary-subtle)] placeholder:text-[var(--text-tertiary)] resize-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-[var(--text-secondary)] font-medium">Categoría</label>
            <select
              value={entryForm.category}
              onChange={(e) => setEntryForm({ ...entryForm, category: e.target.value })}
              className="bg-[var(--bg-surface-1)] border border-[var(--border-default)] text-[var(--text-primary)] py-2.5 px-3 rounded-[var(--radius-md)] text-sm w-full transition-all focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="general">General</option>
              <option value="productos">Productos</option>
              <option value="servicios">Servicios</option>
              <option value="horarios">Horarios</option>
              <option value="pagos">Pagos</option>
              <option value="ubicacion">Ubicación</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] text-[var(--text-secondary)] font-medium">Keywords (separadas por coma)</label>
            <Input value={entryForm.keywords}
              onChange={(e) => setEntryForm({ ...entryForm, keywords: e.target.value })}
              placeholder="horario, apertura, cierre" />
            {entryForm.keywords && (
              <div className="flex gap-1 flex-wrap mt-1">
                {entryForm.keywords.split(",").map((k, i) => k.trim() && (
                  <Badge key={i} variant="gray">{k.trim()}</Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setKnowledgeModal(false); setEditingEntry(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveKnowledge} disabled={!entryForm.question || !entryForm.answer}>
              {editingEntry ? "Actualizar" : "Crear entrada"}
            </Button>
          </div>
        </div>
      </Modal>
    </GlassCard>
  );

  const renderNotificaciones = () => {
    const toggles = [
      { key: "notif_paymentReceived" as const, label: "Pago recibido", desc: "Notificar cuando un cliente paga por Wompi" },
      { key: "notif_escalation" as const, label: "Escalamiento", desc: "Cuando la IA escala a un agente humano" },
      { key: "notif_newAppointment" as const, label: "Nueva cita", desc: "Cuando se agenda una nueva cita" },
      { key: "notif_dailySummary" as const, label: "Resumen diario", desc: "Reporte diario de actividad" },
    ];
    return (
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-6">
          <SectionHeading>Notificaciones</SectionHeading>
          <div className="space-y-3 mb-6">
            {toggles.map((t) => (
              <div
                key={t.key}
                className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] hover:border-[var(--border-default)] transition-all"
              >
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{t.label}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{t.desc}</div>
                </div>
                <Toggle checked={settings[t.key]} onChange={(v) => update(t.key, v)} />
              </div>
            ))}
          </div>
          <div className="h-px bg-[var(--border-subtle)] mb-5" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input label="Email de alertas" type="email" value={settings.notif_alertEmail}
              onChange={(e) => update("notif_alertEmail", e.target.value)}
              placeholder="alertas@minegocio.com" />
            <Input label="WhatsApp de alertas" value={settings.notif_alertWhatsApp}
              onChange={(e) => update("notif_alertWhatsApp", e.target.value)}
              placeholder="+57 300 000 0000" />
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} loading={saving} icon={<Check className="w-4 h-4" />}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </GlassCard>
    );
  };

  const renderApariencia = () => (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-6">
        <SectionHeading>Apariencia</SectionHeading>
        <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] mb-6">
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">Modo oscuro</div>
            <div className="text-xs text-[var(--text-tertiary)]">Cambiar entre tema claro y oscuro</div>
          </div>
          <Toggle
            checked={settings.theme === "dark"}
            onChange={(v) => {
              const t = v ? "dark" : "light";
              update("theme", t);
              localStorage.setItem("theme", t);
              toast.success(`Tema ${t === "dark" ? "oscuro" : "claro"} activado`);
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={cn(
            "rounded-xl border-2 p-4 transition-all cursor-pointer",
            settings.theme === "light"
              ? "border-[var(--accent-primary)] shadow-[var(--shadow-glow-primary)]"
              : "border-transparent"
          )}
          onClick={() => { update("theme", "light"); localStorage.setItem("theme", "light"); }}
          >
            <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
              <div className="h-2 bg-gray-100" />
              <div className="p-2 space-y-1.5">
                <div className="h-1.5 w-12 rounded bg-gray-300" />
                <div className="h-1 w-20 rounded bg-gray-200" />
                <div className="h-4 rounded bg-gray-100 border border-gray-200" />
                <div className="h-3 rounded bg-blue-500 w-12" />
              </div>
            </div>
            <p className="text-xs text-center mt-2 text-[var(--text-secondary)]">Claro</p>
          </div>
          <div className={cn(
            "rounded-xl border-2 p-4 transition-all cursor-pointer",
            settings.theme === "dark"
              ? "border-[var(--accent-primary)] shadow-[var(--shadow-glow-primary)]"
              : "border-transparent"
          )}
          onClick={() => { update("theme", "dark"); localStorage.setItem("theme", "dark"); }}
          >
            <div className="rounded-lg bg-[#0f1117] border border-gray-800 overflow-hidden">
              <div className="h-2 bg-[#161822]" />
              <div className="p-2 space-y-1.5">
                <div className="h-1.5 w-12 rounded bg-gray-600" />
                <div className="h-1 w-20 rounded bg-gray-700" />
                <div className="h-4 rounded bg-[#161822] border border-gray-800" />
                <div className="h-3 rounded bg-indigo-500 w-12" />
              </div>
            </div>
            <p className="text-xs text-center mt-2 text-[var(--text-secondary)]">Oscuro</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );

  const sectionRenderers: Record<string, () => React.ReactNode> = {
    negocio: renderNegocio,
    actividad: renderActividad,
    horarios: renderHorarios,
    pagos: renderPagos,
    agente: renderAgente,
    conocimiento: renderConocimiento,
    notificaciones: renderNotificaciones,
    apariencia: renderApariencia,
  };

  return (
    <div className="flex gap-0 min-h-full -m-6">
      <nav className="hidden md:flex flex-col w-[200px] flex-shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-surface-1)]/50 py-6 px-3 sticky top-0 self-start">
        <div className="px-3 mb-5">
          <h1 className="text-base font-bold font-[var(--font-display)] text-[var(--text-primary)]">Ajustes</h1>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Configuración general</p>
        </div>
        <div className="space-y-0.5">
          {NAV_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const active = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all text-left relative",
                  active
                    ? "text-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                )}
              >
                {active && (
                  <motion.div
                    layoutId="settings-nav-accent"
                    className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-[var(--accent-primary)]"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                {sec.label}
              </button>
            );
          })}
        </div>
      </nav>

      <nav className="md:hidden flex overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-surface-1)]/50 px-3 pt-3 gap-1 w-full">
        {NAV_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const active = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
                active
                  ? "text-[var(--accent-primary)] bg-[var(--accent-primary-subtle)]"
                  : "text-[var(--text-secondary)]"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {sec.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 min-w-0 p-6 md:p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            variants={sectionVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="max-w-3xl"
          >
            {loading ? (
              <GlassCard className="p-6">
                <SkeletonShimmer />
              </GlassCard>
            ) : (
              sectionRenderers[activeSection]?.()
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
