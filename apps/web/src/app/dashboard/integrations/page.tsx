"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import {
  BrainCircuit, Workflow, MessageCircle, Star, Plug,
  CheckCircle2, Trash2, Settings, Eye, EyeOff,
  Loader2, X, AlertTriangle, ExternalLink, Zap,
  BarChart3, Database, Webhook, Shield, Globe
} from "lucide-react";

interface IntegrationSpec {
  label: string;
  category: string;
  icon: string;
  fields: { key: string; label: string; type: string; placeholder: string }[];
}

interface Integration {
  id: string;
  provider: string;
  category: string;
  label: string;
  config: Record<string, string>;
  isActive: boolean;
  isPrimary: boolean;
}

import { API_BASE, dfetch, getTenantId } from "@/lib/api";
const API = `${API_BASE}/api`;

const categoryConfig: Record<string, { label: string; icon: any; desc: string }> = {
  llm: { label: "LLM / IA", icon: BrainCircuit, desc: "Modelos de lenguaje e inteligencia artificial" },
  automation: { label: "Automatización", icon: Workflow, desc: "Webhooks, n8n y servicios de automatización" },
  crm: { label: "CRM / Soporte", icon: MessageCircle, desc: "Integraciones con CRMs y plataformas de soporte" },
};

export default function IntegrationsPage() {
  const [specs, setSpecs] = useState<Record<string, IntegrationSpec>>({});
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const id = getTenantId();
    if (id) {
      setTenantId(id);
      Promise.all([
        dfetch(`${API}/integrations/specs`).then((r) => r.json()),
        dfetch(`${API}/integrations/${id}`).then((r) => r.json()),
      ])
        .then(([specsData, intData]) => {
          setSpecs(specsData || {});
          setIntegrations(Array.isArray(intData) ? intData : []);
        })
        .catch(() => toast.error("Error al cargar integraciones"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const getIntegration = (provider: string) =>
    integrations.find((i) => i.provider === provider);

  const handleOpenModal = (provider: string) => {
    const existing = getIntegration(provider);
    setSelectedProvider(provider);
    setFormConfig(existing?.config || {});
    setIsActive(existing?.isActive ?? true);
    setIsPrimary(existing?.isPrimary ?? false);
    setShowPasswords({});
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await dfetch(`${API}/integrations/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          config: formConfig,
          isActive,
          isPrimary,
        }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setIntegrations((prev) => {
        const idx = prev.findIndex((i) => i.provider === selectedProvider);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = result;
          return updated;
        }
        return [...prev, result];
      });
      toast.success("Integración guardada");
      setShowModal(false);
    } catch {
      toast.error("Error al guardar integración");
    }
    setSaving(false);
  };

  const handleDelete = async (provider: string) => {
    try {
      const res = await dfetch(`${API}/integrations/${tenantId}/${provider}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setIntegrations(integrations.filter((i) => i.provider !== provider));
      toast.success("Integración removida");
    } catch {
      toast.error("Error al remover integración");
    }
  };

  if (loading) return <IntegrationsSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">
            Integraciones
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Conecta servicios externos a ChatGÜIRE
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <Plug className="h-4 w-4" />
          {integrations.filter((i) => i.isActive).length} conectadas ·{" "}
          {Object.keys(specs).length} disponibles
        </div>
      </div>

      {Object.entries(categoryConfig).map(([catKey, cat]) => {
        const categorySpecs = Object.entries(specs).filter(
          ([_, spec]) => spec.category === catKey
        );
        if (categorySpecs.length === 0) return null;

        return (
          <motion.section
            key={catKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-primary-subtle)]">
                <cat.icon className="h-4 w-4 text-[var(--accent-primary)]" />
              </div>
              <div>
                <h3 className="font-semibold font-[family-name:var(--font-display)]">
                  {cat.label}
                </h3>
                <p className="text-xs text-[var(--text-tertiary)]">{cat.desc}</p>
              </div>
              <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                {categorySpecs.length} integraciones
              </span>
            </div>

            <motion.div layout className="grid gap-4 lg:grid-cols-2">
              {categorySpecs.map(([provider, spec]) => {
                const integration = getIntegration(provider);
                const isConnected = integration?.isActive;

                return (
                  <motion.div
                    key={provider}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <GlassCard
                      hover
                      glow={isConnected ? "primary" : "none"}
                      className="p-5"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--bg-surface-3)] text-lg">
                            {spec.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm font-[family-name:var(--font-display)]">
                                {spec.label}
                              </h4>
                              {integration?.isPrimary && (
                                <Star className="h-3.5 w-3.5 text-[var(--accent-amber)] fill-[var(--accent-amber)]" />
                              )}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)]">
                              {isConnected ? (
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-success)]" />
                                  Conectado
                                  {integration?.config?.model && (
                                    <span className="text-[var(--text-tertiary)]">
                                      · {integration.config.model}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]" />
                                  No configurado
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full shrink-0 mt-1",
                            isConnected ? "bg-[var(--accent-success)]" : "bg-[var(--text-tertiary)]"
                          )}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenModal(provider)}
                          className="btn-secondary text-xs flex-1"
                        >
                          <Settings className="h-3.5 w-3.5" />
                          {isConnected ? "Editar" : "Configurar"}
                        </button>
                        {isConnected && (
                          <button
                            onClick={() => handleDelete(provider)}
                            className="btn-ghost text-xs text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.12)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Quitar
                          </button>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.section>
        );
      })}

      {selectedProvider && specs[selectedProvider] && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center", showModal ? "" : "hidden")}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="relative z-10 w-full max-w-lg bg-[var(--bg-surface-2)] border border-[var(--border-default)] rounded-[var(--radius-xl)] p-6 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <span className="text-xl">{specs[selectedProvider].icon}</span>
                <h3 className="text-lg font-bold font-[family-name:var(--font-display)]">
                  {specs[selectedProvider].label}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {specs[selectedProvider].fields.map((field) => (
                <div key={field.key}>
                  <label className="text-[13px] text-[var(--text-secondary)] font-medium mb-1.5 block">
                    {field.label}
                  </label>
                  <div className="relative">
                    <input
                      type={
                        field.type === "password" && !showPasswords[field.key]
                          ? "password"
                          : "text"
                      }
                      value={formConfig[field.key] || ""}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, [field.key]: e.target.value })
                      }
                      placeholder={field.placeholder}
                      className="input-field pr-10"
                    />
                    {field.type === "password" && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            [field.key]: !showPasswords[field.key],
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                      >
                        {showPasswords[field.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[var(--bg-surface-1)]">
                <span className="text-sm text-[var(--text-secondary)]">Activo</span>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className={cn(
                    "w-10 h-5 rounded-full relative transition-colors",
                    isActive ? "bg-[var(--accent-primary)]" : "bg-[var(--bg-surface-3)]"
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                      isActive ? "left-[22px]" : "left-0.5"
                    )}
                  />
                </button>
              </div>

              {specs[selectedProvider].category === "llm" && (
                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-[var(--bg-surface-1)]">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)]">LLM Principal</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Usar como modelo principal para el chatbot
                    </p>
                  </div>
                  <button
                    onClick={() => setIsPrimary(!isPrimary)}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-colors",
                      isPrimary ? "bg-[#8B5CF6]" : "bg-[var(--bg-surface-3)]"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                        isPrimary ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" loading={saving} onClick={handleSave}>
                  <CheckCircle2 className="h-4 w-4" />
                  Guardar
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function IntegrationsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-44 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
      {[1, 2, 3].map((s) => (
        <div key={s} className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2].map((c) => (
              <div key={c} className="glass-card p-5 space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="h-11 w-11 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
