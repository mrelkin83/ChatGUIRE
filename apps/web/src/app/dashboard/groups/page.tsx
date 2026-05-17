"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import {
  Users, Send, RefreshCw, Search, MessageCircle,
  Loader2, X, CheckCircle2, AlertTriangle,
  Hash, PhoneCall, WifiOff
} from "lucide-react";

interface WAGroup {
  id: string;
  name: string;
  description?: string;
  participants?: number;
  owner?: string;
}

import { API_BASE, dfetch, getTenantId } from "@/lib/api";
const API = `${API_BASE}/api`;

export default function GroupsPage() {
  const [groups, setGroups] = useState<WAGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [search, setSearch] = useState("");
  const [wahaAvailable, setWahaAvailable] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<WAGroup | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const id = getTenantId();
    if (id) {
      setTenantId(id);
      (async () => {
        try {
          const healthRes = await dfetch(`${API}/channels/whatsapp-waha/health`);
          const healthData = await healthRes.json();
          if (healthData.available) {
            setWahaAvailable(true);
            const groupsRes = await dfetch(`${API}/channels/whatsapp-waha/groups/${id}`);
            const groupsData = await groupsRes.json();
            setGroups(Array.isArray(groupsData) ? groupsData : []);
          }
        } catch {
          toast.error("Error al conectar con el servidor");
        }
        setLoading(false);
      })();
    } else {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const healthRes = await dfetch(`${API}/channels/whatsapp-waha/health`);
      const healthData = await healthRes.json();
      if (healthData.available) {
        setWahaAvailable(true);
        const groupsRes = await dfetch(`${API}/channels/whatsapp-waha/groups/${tenantId}`);
        const groupsData = await groupsRes.json();
        setGroups(Array.isArray(groupsData) ? groupsData : []);
        toast.success("Grupos actualizados");
      } else {
        setWahaAvailable(false);
        toast.error("WAHA no disponible");
      }
    } catch {
      toast.error("Error al refrescar grupos");
    }
    setRefreshing(false);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedGroup) return;
    setSending(true);
    setSent(false);
    try {
      const res = await dfetch(`${API}/channels/whatsapp-waha/groups/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          groupId: selectedGroup.id,
          text: messageText,
        }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      toast.success("Mensaje enviado al grupo");
      setTimeout(() => {
        setSent(false);
        setShowSendModal(false);
        setMessageText("");
      }, 2000);
    } catch {
      toast.error("Error al enviar mensaje");
    }
    setSending(false);
  };

  const filtered = groups.filter((g) =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <GroupsSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Grupos WhatsApp
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Gestiona y envÃ­a mensajes a grupos de WhatsApp
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Actualizar
        </button>
      </div>

      {!wahaAvailable && (
        <GlassCard className="border-l-4 border-l-[var(--accent-amber)] p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(245,158,11,0.12)] shrink-0">
              <WifiOff className="h-5 w-5 text-[var(--accent-amber)]" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--accent-amber)]">
                WAHA no estÃ¡ disponible
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Los grupos de WhatsApp requieren el servicio WAHA activo. InÃ­cialo con
              </p>
              <code className="inline-block mt-1.5 px-2 py-1 bg-[var(--bg-surface-3)] rounded text-xs text-[var(--accent-amber)] font-[family-name:var(--font-mono)]">
                docker compose up waha
              </code>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Buscar grupo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {filtered.length === 0 && wahaAvailable ? (
        <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-[var(--bg-surface-3)] flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-[var(--text-tertiary)]" />
          </div>
          <h3 className="text-lg font-semibold mb-1">
            {search ? "Sin resultados" : "No se encontraron grupos"}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm">
            {search
              ? `No hay grupos que coincidan con "${search}"`
              : "AsegÃºrate de que tu WhatsApp estÃ© en los grupos y la sesiÃ³n estÃ© activa"}
          </p>
        </GlassCard>
      ) : (
        <motion.div
          layout
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filtered.map((group, idx) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <GlassCard hover className="p-5 h-full flex flex-col">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-success)]/10 shrink-0">
                    <Users className="h-5 w-5 text-[var(--accent-success)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-1">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-4">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {group.participants ?? "??"} participantes
                  </span>
                  {group.owner && (
                    <span className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5" />
                      {group.owner}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedGroup(group);
                    setMessageText("");
                    setSent(false);
                    setShowSendModal(true);
                  }}
                  className="btn-primary w-full text-sm mt-auto"
                >
                  <Send className="h-4 w-4" />
                  Enviar mensaje
                </button>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal
        open={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          setMessageText("");
          setSent(false);
        }}
        title="Enviar mensaje al grupo"
      >
        {selectedGroup && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-surface-1)] border border-[var(--border-subtle)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-success)]/10">
                <Users className="h-4 w-4 text-[var(--accent-success)]" />
              </div>
              <div>
                <p className="text-sm font-medium">{selectedGroup.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {selectedGroup.participants ?? "?"} participantes
                </p>
              </div>
            </div>

            <div>
              <label className="text-[13px] text-[var(--text-secondary)] font-medium mb-1.5 block">
                Mensaje
              </label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={5}
                placeholder="Escribe el mensaje que quieres enviar a este grupo..."
                className="input-field resize-none"
              />
            </div>

            {sent && (
              <div className="flex items-center gap-2 rounded-lg border border-[rgba(16,185,129,0.20)] bg-[rgba(16,185,129,0.06)] p-3 text-sm text-[var(--accent-success)]">
                <CheckCircle2 className="h-4 w-4" />
                Mensaje enviado exitosamente
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowSendModal(false);
                  setMessageText("");
                  setSent(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSendMessage}
                loading={sending}
                disabled={!messageText.trim()}
              >
                <Send className="h-4 w-4" />
                Enviar al grupo
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function GroupsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-card p-5 space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
