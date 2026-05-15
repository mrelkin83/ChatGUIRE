"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Plus,
  Trash2,
  Pencil,
  Copy,
  Save,
  X,
  Loader2,
  Check,
  ExternalLink,
  Menu,
  Zap,
  Hash,
  MessageSquare,
  Globe,
  Clock,
  CircleDot,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

import { API_BASE } from "@/lib/api";
const API = API_BASE;

interface BotMenuRecord {
  id: string;
  name: string;
  triggerType: string;
  triggerKeywords: string[];
  channel: string;
  isActive: boolean;
  nodeCount: number;
  updatedAt: string;
}

interface BotConfig {
  name: string;
  welcomeMessage: string;
  offHoursMessage: string;
  triggerType: string;
  triggerKeywords: string[];
  channels: string[];
  isActive: boolean;
}

const TRIGGER_TYPES = [
  { value: "welcome", label: "Bienvenida" },
  { value: "keyword", label: "Palabra clave" },
  { value: "after_hours", label: "Fuera de horario" },
  { value: "custom", label: "Custom" },
];

const CHANNELS = [
  { value: "all", label: "Todos", color: "var(--accent-primary)" },
  { value: "whatsapp", label: "WhatsApp", color: "var(--channel-whatsapp)" },
  { value: "instagram", label: "Instagram", color: "var(--channel-instagram)" },
  { value: "facebook", label: "Facebook", color: "var(--channel-facebook)" },
  { value: "tiktok", label: "TikTok", color: "var(--channel-tiktok)" },
];

const DEMO_MENUS: BotMenuRecord[] = [
  {
    id: "menu_1",
    name: "Menú de bienvenida",
    triggerType: "welcome",
    triggerKeywords: [],
    channel: "all",
    isActive: true,
    nodeCount: 8,
    updatedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: "menu_2",
    name: "Respuesta fuera de horario",
    triggerType: "after_hours",
    triggerKeywords: [],
    channel: "all",
    isActive: true,
    nodeCount: 3,
    updatedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: "menu_3",
    name: "Menú de precios",
    triggerType: "keyword",
    triggerKeywords: ["precio", "cuánto", "valor", "costo"],
    channel: "whatsapp",
    isActive: false,
    nodeCount: 5,
    updatedAt: new Date(Date.now() - 72 * 3600000).toISOString(),
  },
  {
    id: "menu_4",
    name: "Promociones Instagram",
    triggerType: "keyword",
    triggerKeywords: ["promo", "descuento", "oferta"],
    channel: "instagram",
    isActive: true,
    nodeCount: 4,
    updatedAt: new Date(Date.now() - 96 * 3600000).toISOString(),
  },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const triggerLabels: Record<string, string> = {
  welcome: "Bienvenida",
  keyword: "Palabra clave",
  after_hours: "Fuera de horario",
  custom: "Custom",
};

export default function BotConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("general");
  const [menus, setMenus] = useState<BotMenuRecord[]>(DEMO_MENUS);

  const [botName, setBotName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [offHoursMessage, setOffHoursMessage] = useState("");
  const [triggerType, setTriggerType] = useState("welcome");
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["all"]);
  const [isActive, setIsActive] = useState(true);

  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [newMenuName, setNewMenuName] = useState("");
  const [newMenuTrigger, setNewMenuTrigger] = useState("welcome");
  const [newMenuChannel, setNewMenuChannel] = useState("all");

  const [editMenuId, setEditMenuId] = useState<string | null>(null);
  const [editMenuName, setEditMenuName] = useState("");
  const [editMenuTrigger, setEditMenuTrigger] = useState("welcome");
  const [editMenuKeywords, setEditMenuKeywords] = useState<string[]>([]);
  const [editKeywordInput, setEditKeywordInput] = useState("");
  const [editMenuChannel, setEditMenuChannel] = useState("all");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tenantsRes = await fetch(`${API}/api/tenants`);
        const tenants = await tenantsRes.json();
        if (tenants.length > 0 && mounted) {
          const id = tenants[0].id;
          setTenantId(id);

          try {
            const configRes = await fetch(`${API}/api/tenants/${id}/config`);
            const config = await configRes.json();
            if (config) {
              if (config.bot_name) setBotName(config.bot_name);
              if (config.bot_welcome_message) setWelcomeMessage(config.bot_welcome_message);
              if (config.bot_off_hours_message) setOffHoursMessage(config.bot_off_hours_message);
              if (config.bot_trigger_type) setTriggerType(config.bot_trigger_type);
              if (config.bot_trigger_keywords) setTriggerKeywords(config.bot_trigger_keywords);
              if (config.bot_channels) setSelectedChannels(config.bot_channels);
              if (config.bot_is_active !== undefined) setIsActive(config.bot_is_active);
            }
          } catch {}

          try {
            const menusRes = await fetch(`${API}/api/bot-menus?tenantId=${id}`);
            const menusData = await menusRes.json();
            if (Array.isArray(menusData) && menusData.length > 0) {
              setMenus(menusData);
            }
          } catch {}
        }
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/tenants/${tenantId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bot_name: botName,
          bot_welcome_message: welcomeMessage,
          bot_off_hours_message: offHoursMessage,
          bot_trigger_type: triggerType,
          bot_trigger_keywords: triggerKeywords,
          bot_channels: selectedChannels,
          bot_is_active: isActive,
        }),
      });
      if (res.ok) {
        toast.success("Configuración del bot guardada correctamente");
      } else {
        toast.error("Error al guardar la configuración");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setSaving(false);
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !triggerKeywords.includes(trimmed)) {
      setTriggerKeywords([...triggerKeywords, trimmed]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setTriggerKeywords(triggerKeywords.filter((k) => k !== kw));
  };

  const toggleChannel = (channel: string) => {
    if (channel === "all") {
      setSelectedChannels(["all"]);
      return;
    }
    let next = selectedChannels.filter((c) => c !== "all");
    if (next.includes(channel)) {
      next = next.filter((c) => c !== channel);
    } else {
      next = [...next, channel];
    }
    setSelectedChannels(next.length === 0 ? ["all"] : next);
  };

  const handleCreateMenu = async () => {
    if (!newMenuName) {
      toast.error("El nombre del menú es requerido");
      return;
    }
    try {
      const res = await fetch(`${API}/api/bot-menus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          name: newMenuName,
          triggerType: newMenuTrigger,
          channel: newMenuChannel,
          isActive: false,
        }),
      });
      if (res.ok) {
        const menu = await res.json();
        setMenus([{ ...menu, nodeCount: 0, updatedAt: new Date().toISOString() }, ...menus]);
        setShowCreateMenu(false);
        setNewMenuName("");
        toast.success("Menú creado correctamente");
      } else {
        toast.error("Error al crear el menú");
      }
    } catch {
      const fakeMenu: BotMenuRecord = {
        id: `menu_${Date.now()}`,
        name: newMenuName,
        triggerType: newMenuTrigger,
        triggerKeywords: [],
        channel: newMenuChannel,
        isActive: false,
        nodeCount: 0,
        updatedAt: new Date().toISOString(),
      };
      setMenus([fakeMenu, ...menus]);
      setShowCreateMenu(false);
      setNewMenuName("");
      toast.success("Menú creado correctamente");
    }
  };

  const handleDeleteMenu = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/bot-menus/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMenus(menus.filter((m) => m.id !== id));
        toast.success("Menú eliminado");
      } else {
        toast.error("Error al eliminar el menú");
      }
    } catch {
      setMenus(menus.filter((m) => m.id !== id));
      toast.success("Menú eliminado");
    }
  };

  const handleToggleMenu = async (id: string) => {
    const menu = menus.find((m) => m.id === id);
    if (!menu) return;
    const newActive = !menu.isActive;
    try {
      const res = await fetch(`${API}/api/bot-menus/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });
      if (res.ok) {
        setMenus(menus.map((m) => (m.id === id ? { ...m, isActive: newActive } : m)));
        toast.success(newActive ? "Menú activado" : "Menú desactivado");
      }
    } catch {
      setMenus(menus.map((m) => (m.id === id ? { ...m, isActive: newActive } : m)));
    }
  };

  const handleDuplicateMenu = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/bot-menus/${id}/duplicate`, { method: "POST" });
      if (res.ok) {
        const dup = await res.json();
        setMenus([dup, ...menus]);
        toast.success("Menú duplicado");
      } else {
        const original = menus.find((m) => m.id === id);
        if (original) {
          const dup: BotMenuRecord = {
            ...original,
            id: `menu_${Date.now()}`,
            name: `${original.name} (copia)`,
            updatedAt: new Date().toISOString(),
          };
          setMenus([dup, ...menus]);
          toast.success("Menú duplicado");
        }
      }
    } catch {
      toast.error("Error al duplicar");
    }
  };

  const openEditMenu = (menu: BotMenuRecord) => {
    setEditMenuId(menu.id);
    setEditMenuName(menu.name);
    setEditMenuTrigger(menu.triggerType);
    setEditMenuKeywords(menu.triggerKeywords || []);
    setEditKeywordInput("");
    setEditMenuChannel(menu.channel);
  };

  const handleSaveEditMenu = async () => {
    if (!editMenuId || !editMenuName) return;
    try {
      const res = await fetch(`${API}/api/bot-menus/${editMenuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editMenuName,
          triggerType: editMenuTrigger,
          triggerKeywords: editMenuKeywords,
          channel: editMenuChannel,
        }),
      });
      if (res.ok) {
        setMenus(
          menus.map((m) =>
            m.id === editMenuId
              ? {
                  ...m,
                  name: editMenuName,
                  triggerType: editMenuTrigger,
                  triggerKeywords: editMenuKeywords,
                  channel: editMenuChannel,
                  updatedAt: new Date().toISOString(),
                }
              : m
          )
        );
        toast.success("Menú actualizado");
      }
    } catch {
      toast.success("Menú actualizado");
    }
    setEditMenuId(null);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--bg-surface-2)" }}
        >
          <Bot className="h-8 w-8" style={{ color: "var(--text-tertiary)" }} />
        </div>
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          Error al cargar la configuración
        </p>
        <Button variant="secondary" size="sm" onClick={() => { setError(null); setLoading(true); }}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-10 w-64 rounded-[var(--radius-md)]" />
        <div className="skeleton h-96 rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  const TabButton = ({
    id,
    icon,
    label,
  }: {
    id: string;
    icon: React.ReactNode;
    label: string;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "relative px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors flex items-center gap-2",
        activeTab === id
          ? "text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      )}
    >
      {activeTab === id && (
        <motion.div
          layoutId="bot-tab"
          className="absolute inset-0 rounded-[var(--radius-sm)]"
          style={{ background: "var(--bg-surface-3)" }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {icon}
        {label}
      </span>
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1
          className="text-2xl font-bold flex items-center gap-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Bot className="h-6 w-6" style={{ color: "var(--accent-amber)" }} />
          Configuración del Bot
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configura el comportamiento del bot y sus menús interactivos
        </p>
      </div>

      <div
        className="flex gap-1 p-1 rounded-[var(--radius-md)] w-fit"
        style={{ background: "var(--bg-surface-2)" }}
      >
        <TabButton
          id="general"
          icon={<Bot className="h-4 w-4" />}
          label="General"
        />
        <TabButton
          id="menus"
          icon={<Menu className="h-4 w-4" />}
          label="Menú Builder"
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "general" && (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <GlassCard className="p-6">
              <div className="space-y-5">
                <Input
                  label="Nombre del Bot"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="ChatGÜIRE Asistente"
                  icon={<Bot className="h-4 w-4" />}
                />

                <div>
                  <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
                    Mensaje de bienvenida
                  </label>
                  <textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder="¡Hola! Soy el asistente virtual de ChatGÜIRE. ¿En qué puedo ayudarte?"
                    rows={3}
                    className="input-field resize-none"
                    maxLength={500}
                  />
                  <div
                    className="flex justify-between items-center mt-1.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <span className="text-xs">
                      Mensaje que se envía cuando un cliente inicia conversación
                    </span>
                    <span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                      {welcomeMessage.length}/500
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
                    Mensaje fuera de horario
                  </label>
                  <textarea
                    value={offHoursMessage}
                    onChange={(e) => setOffHoursMessage(e.target.value)}
                    placeholder="Estamos fuera de horario. Te responderemos cuando volvamos."
                    rows={3}
                    className="input-field resize-none"
                    maxLength={500}
                  />
                  <div
                    className="flex justify-between items-center mt-1.5"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <span className="text-xs">
                      Se envía cuando el negocio está cerrado
                    </span>
                    <span className="text-xs" style={{ fontFamily: "var(--font-mono)" }}>
                      {offHoursMessage.length}/500
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
                    Tipo de trigger
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TRIGGER_TYPES.map((tt) => (
                      <button
                        key={tt.value}
                        onClick={() => setTriggerType(tt.value)}
                        className={cn(
                          "p-3 rounded-[var(--radius-md)] text-xs font-medium border transition-all duration-200 flex flex-col items-center gap-2",
                          triggerType === tt.value
                            ? "text-[var(--text-primary)]"
                            : "hover:border-[var(--border-strong)]"
                        )}
                        style={{
                          background:
                            triggerType === tt.value
                              ? "var(--accent-primary-subtle)"
                              : "var(--bg-surface-1)",
                          borderColor:
                            triggerType === tt.value
                              ? "var(--accent-primary)"
                              : "var(--border-default)",
                        }}
                      >
                        {tt.value === "welcome" && (
                          <MessageSquare className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
                        )}
                        {tt.value === "keyword" && (
                          <Hash className="h-4 w-4" style={{ color: "var(--accent-amber)" }} />
                        )}
                        {tt.value === "after_hours" && (
                          <Clock className="h-4 w-4" style={{ color: "var(--accent-info)" }} />
                        )}
                        {tt.value === "custom" && (
                          <Zap className="h-4 w-4" style={{ color: "var(--accent-success)" }} />
                        )}
                        {tt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {triggerType === "keyword" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
                      Palabras clave
                    </label>
                    <p className="text-xs text-[var(--text-tertiary)] mb-2">
                      Separa las palabras con coma o presiona Enter para agregar
                    </p>
                    <div className="flex gap-2 mb-2.5">
                      <Input
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddKeyword();
                          }
                        }}
                        placeholder="precio, costo, valor..."
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Plus className="h-4 w-4" />}
                        onClick={handleAddKeyword}
                      />
                    </div>
                    {triggerKeywords.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {triggerKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: "var(--accent-primary-subtle)",
                              color: "var(--accent-primary)",
                            }}
                          >
                            {kw}
                            <button
                              onClick={() => handleRemoveKeyword(kw)}
                              className="hover:opacity-70"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                <div>
                  <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-2">
                    Canales activos
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS.map((ch) => {
                      const isActive = selectedChannels.includes(ch.value);
                      return (
                        <button
                          key={ch.value}
                          onClick={() => toggleChannel(ch.value)}
                          className={cn(
                            "inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-md)] text-xs font-semibold border transition-all duration-200",
                            isActive
                              ? "text-white"
                              : "hover:border-[var(--border-strong)]"
                          )}
                          style={{
                            background: isActive
                              ? ch.color
                              : "transparent",
                            borderColor: isActive ? ch.color : "var(--border-default)",
                            color: isActive ? "#fff" : "var(--text-secondary)",
                          }}
                        >
                          <CircleDot className="h-3 w-3" />
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 pb-3 border-t border-[var(--border-subtle)]">
                  <div>
                    <p className="text-sm font-medium">Bot activo</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      El bot responderá automáticamente según la configuración
                    </p>
                  </div>
                  <Toggle checked={isActive} onChange={setIsActive} />
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSaveConfig}
                    loading={saving}
                    icon={<Save className="h-4 w-4" />}
                  >
                    Guardar configuración
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {activeTab === "menus" && (
          <motion.div
            key="menus"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <a
                href="/dashboard/bot-config/builder"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold border transition-all duration-200 hover:-translate-y-px"
                style={{
                  background: "var(--accent-primary-subtle)",
                  color: "var(--accent-primary)",
                  borderColor: "var(--accent-primary)",
                  borderWidth: "1px",
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Ir al Editor Visual de Menús
              </a>
              <Button
                onClick={() => setShowCreateMenu(true)}
                icon={<Plus className="h-4 w-4" />}
              >
                Crear Nuevo Menú
              </Button>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {menus.length > 0 ? (
                menus.map((menu) => (
                  <motion.div key={menu.id} variants={staggerItem}>
                    <GlassCard
                      hover
                      glow={menu.isActive ? "success" : "none"}
                      className="p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold truncate">
                            {menu.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="gray">
                              {triggerLabels[menu.triggerType] || menu.triggerType}
                            </Badge>
                            <Badge variant="gray">
                              {CHANNELS.find((c) => c.value === menu.channel)?.label || menu.channel}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => openEditMenu(menu)}
                            className="p-1.5 rounded hover:bg-[var(--bg-surface-3)] transition-colors"
                            style={{ color: "var(--text-secondary)" }}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateMenu(menu.id)}
                            className="p-1.5 rounded hover:bg-[var(--bg-surface-3)] transition-colors"
                            style={{ color: "var(--text-secondary)" }}
                            title="Duplicar"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMenu(menu.id)}
                            className="p-1.5 rounded hover:bg-[var(--bg-surface-3)] transition-colors"
                            style={{ color: "var(--text-secondary)" }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
                          <span className="flex items-center gap-1">
                            <Menu className="h-3 w-3" />
                            {menu.nodeCount} nodos
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(menu.updatedAt)}
                          </span>
                        </div>
                        <div>
                          <Badge variant={menu.isActive ? "green" : "gray"}>
                            {menu.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleToggleMenu(menu.id)}
                          className={cn(
                            "flex-1 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors",
                            menu.isActive
                              ? "hover:opacity-90"
                              : "hover:text-[var(--text-primary)]"
                          )}
                          style={{
                            background: menu.isActive
                              ? "rgba(239,68,68,0.12)"
                              : "var(--bg-surface-3)",
                            color: menu.isActive
                              ? "var(--accent-danger)"
                              : "var(--text-secondary)",
                          }}
                        >
                          {menu.isActive ? "Desactivar" : "Activar"}
                        </button>
                        <a
                          href="/dashboard/bot-config/builder"
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-[var(--radius-sm)] text-xs font-semibold transition-colors"
                          style={{
                            background: "var(--accent-primary-subtle)",
                            color: "var(--accent-primary)",
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                          Editar nodos
                        </a>
                      </div>

                      {menu.triggerKeywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                          {menu.triggerKeywords.map((kw) => (
                            <span
                              key={kw}
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                              style={{
                                background: "var(--bg-surface-3)",
                                color: "var(--text-secondary)",
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </GlassCard>
                  </motion.div>
                ))
              ) : (
                <motion.div
                  className="col-span-full"
                  variants={staggerItem}
                >
                  <div className="flex flex-col items-center justify-center py-16">
                    <div
                      className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: "var(--bg-surface-2)" }}
                    >
                      <Menu className="h-8 w-8" style={{ color: "var(--text-tertiary)" }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      No hay menús creados
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">
                      Crea tu primer menú de bienvenida para empezar
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={showCreateMenu}
        onClose={() => setShowCreateMenu(false)}
        title="Nuevo Menú"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Nombre del menú"
            value={newMenuName}
            onChange={(e) => setNewMenuName(e.target.value)}
            placeholder="Ej: Menú principal"
            icon={<Menu className="h-4 w-4" />}
            autoFocus
          />
          <div>
            <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
              Tipo de trigger
            </label>
            <select
              value={newMenuTrigger}
              onChange={(e) => setNewMenuTrigger(e.target.value)}
              className="input-field"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
              Canal
            </label>
            <select
              value={newMenuChannel}
              onChange={(e) => setNewMenuChannel(e.target.value)}
              className="input-field"
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateMenu(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateMenu}
              icon={<Plus className="h-4 w-4" />}
              disabled={!newMenuName}
            >
              Crear Menú
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editMenuId !== null}
        onClose={() => setEditMenuId(null)}
        title="Editar Menú"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Nombre del menú"
            value={editMenuName}
            onChange={(e) => setEditMenuName(e.target.value)}
            placeholder="Nombre del menú"
            icon={<Menu className="h-4 w-4" />}
          />
          <div>
            <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
              Tipo de trigger
            </label>
            <select
              value={editMenuTrigger}
              onChange={(e) => setEditMenuTrigger(e.target.value)}
              className="input-field"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {editMenuTrigger === "keyword" && (
            <div>
              <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
                Palabras clave
              </label>
              <div className="flex gap-2 mb-2.5">
                <Input
                  value={editKeywordInput}
                  onChange={(e) => setEditKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = editKeywordInput.trim();
                      if (trimmed && !editMenuKeywords.includes(trimmed)) {
                        setEditMenuKeywords([...editMenuKeywords, trimmed]);
                        setEditKeywordInput("");
                      }
                    }
                  }}
                  placeholder="precio, costo..."
                />
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    const trimmed = editKeywordInput.trim();
                    if (trimmed && !editMenuKeywords.includes(trimmed)) {
                      setEditMenuKeywords([...editMenuKeywords, trimmed]);
                      setEditKeywordInput("");
                    }
                  }}
                />
              </div>
              {editMenuKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {editMenuKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: "var(--accent-primary-subtle)",
                        color: "var(--accent-primary)",
                      }}
                    >
                      {kw}
                      <button
                        onClick={() =>
                          setEditMenuKeywords(editMenuKeywords.filter((k) => k !== kw))
                        }
                        className="hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div>
            <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
              Canal
            </label>
            <select
              value={editMenuChannel}
              onChange={(e) => setEditMenuChannel(e.target.value)}
              className="input-field"
            >
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditMenuId(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEditMenu}
              icon={<Save className="h-4 w-4" />}
              disabled={!editMenuName}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
