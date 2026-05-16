"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Instagram, Facebook, Music,
  RefreshCw, Link2, CheckCircle2, XCircle, Loader2,
  X, Eye, EyeOff, Unplug, Smartphone, Wifi, Check,
  SmartphoneIcon,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { API_BASE, dfetch, getTenantId } from "@/lib/api";

const API = API_BASE;

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const channels = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    color: "#25D366",
    colorLight: "#25D366",
    description: "Conecta vía Evolution API o WAHA",
    statusEndpoint: "/api/channels/whatsapp/status",
    connectEndpoint: "/api/channels/whatsapp/connect",
    disconnectEndpoint: "/api/channels/whatsapp/disconnect",
    qrEndpoint: "/api/channels/whatsapp/qr",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "#E1306C",
    colorLight: "#E1306C",
    description: "DM y comentarios automatizados",
    statusEndpoint: "/api/channels/instagram/status",
    connectEndpoint: "/api/channels/instagram/connect",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    colorLight: "#1877F2",
    description: "Messenger automatizado",
    statusEndpoint: "/api/channels/facebook/status",
    connectEndpoint: "/api/channels/facebook/connect",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: Music,
    color: "#FE2C55",
    colorLight: "#FE2C55",
    description: "Respuesta a comentarios",
    statusEndpoint: "/api/channels/tiktok/status",
    connectEndpoint: "/api/channels/tiktok/connect",
  },
];

type ChannelStatus = "connected" | "disconnected" | "connecting" | "error";

interface ChannelState {
  id: string;
  status: ChannelStatus;
  info?: string;
}

const QR_STEPS = ["Genera QR", "Escanea", "¡Listo!"];

export default function ChannelsPage() {
  const [tenantId, setTenantId] = useState("");
  const [channelStates, setChannelStates] = useState<Record<string, ChannelState>>({});
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrStep, setQrStep] = useState(0);
  const [qrPolling, setQrPolling] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const [igUsername, setIgUsername] = useState("");
  const [igPassword, setIgPassword] = useState("");
  const [igTwoFA, setIgTwoFA] = useState("");

  const [fbPageId, setFbPageId] = useState("");
  const [fbAccessToken, setFbAccessToken] = useState("");

  const [ttUsername, setTtUsername] = useState("");
  const [ttCookies, setTtCookies] = useState("");

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setQrPolling(false);
  }, []);

  useEffect(() => {
    const id = getTenantId();
    if (id) {
      setTenantId(id);
      loadStatuses(id);
    } else {
      setLoading(false);
    }
    return () => stopPolling();
  }, [stopPolling]);

  const fetchWithTimeout = (url: string, options?: RequestInit, timeout = 5000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return dfetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  const loadStatuses = async (id: string) => {
    setLoading(true);
    const states: Record<string, ChannelState> = {};

    for (const ch of channels) {
      try {
        const res = await fetchWithTimeout(`${API}${ch.statusEndpoint}/${id}`);
        const data = await res.json();
        states[ch.id] = {
          id: ch.id,
          status: data.status || "disconnected",
          info: data.status === "connected" ? "Activo y recibiendo mensajes" : undefined,
        };
      } catch {
        states[ch.id] = { id: ch.id, status: "disconnected" };
      }
    }

    setChannelStates(states);
    setLoading(false);
  };

  const startQrPolling = useCallback(
    (tid: string) => {
      stopPolling();
      setQrPolling(true);

      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await dfetch(`${API}/api/channels/whatsapp/status/${tid}`);
          const statusData = await statusRes.json();

          if (statusData.status === "connected" || statusData.status === "open") {
            stopPolling();
            setQrStep(2);
            setQrCode(null);
            setTimeout(() => {
              setActiveModal(null);
              loadStatuses(tid);
            }, 1500);
            return;
          }

          if (attempts % 3 === 0) {
            try {
              const qrRes = await dfetch(`${API}/api/channels/whatsapp/qr/${tid}`);
              const qrData = await qrRes.json();
              if (qrData.qr && qrData.qr !== qrCode) {
                setQrCode(qrData.qr);
                setQrStep(1);
              }
            } catch {}
          }

          if (attempts > 30) {
            stopPolling();
            setQrError("Tiempo de espera agotado. Intenta de nuevo.");
          }
        } catch {}
      }, 3000);
    },
    [qrCode, stopPolling],
  );

  const handleConnect = async (channelId: string) => {
    if (channelId === "whatsapp") {
      setConnecting(true);
      setQrError(null);
      setQrCode(null);
      setQrStep(0);
      try {
        await dfetch(`${API}/api/channels/whatsapp/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenantId }),
        });

        setActiveModal("whatsapp");

        await new Promise((r) => setTimeout(r, 2000));

        try {
          const qrRes = await dfetch(`${API}/api/channels/whatsapp/qr/${tenantId}`);
          const qrData = await qrRes.json();
          if (qrData.qr) {
            setQrCode(qrData.qr);
            setQrStep(1);
          }
        } catch {}

        startQrPolling(tenantId);
      } catch {
        setQrError("Error al conectar. Verifica que el servicio esté activo.");
      }
      setConnecting(false);
    } else {
      setActiveModal(channelId);
    }
  };

  const handleDisconnect = async (channelId: string) => {
    const ch = channels.find((c) => c.id === channelId);
    if (!ch?.disconnectEndpoint) return;
    try {
      await dfetch(`${API}${ch.disconnectEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      loadStatuses(tenantId);
    } catch {}
  };

  const closeModal = () => {
    stopPolling();
    setActiveModal(null);
    setQrCode(null);
    setQrError(null);
    setQrStep(0);
  };

  const handleInstagramConnect = async () => {
    if (!igUsername || !igPassword) return;
    setConnecting(true);
    try {
      const res = await dfetch(`${API}/api/channels/instagram/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, username: igUsername, password: igPassword, twoFACode: igTwoFA }),
      });
      if (res.ok) {
        closeModal();
        loadStatuses(tenantId);
      }
    } catch {}
    setConnecting(false);
  };

  const handleFacebookConnect = async () => {
    if (!fbPageId || !fbAccessToken) return;
    setConnecting(true);
    try {
      const res = await dfetch(`${API}/api/channels/facebook/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, pageId: fbPageId, accessToken: fbAccessToken }),
      });
      if (res.ok) {
        closeModal();
        loadStatuses(tenantId);
      }
    } catch {}
    setConnecting(false);
  };

  const handleTikTokConnect = async () => {
    if (!ttUsername || !ttCookies) return;
    setConnecting(true);
    try {
      const res = await dfetch(`${API}/api/channels/tiktok/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, username: ttUsername, sessionCookies: ttCookies }),
      });
      if (res.ok) {
        closeModal();
        loadStatuses(tenantId);
      }
    } catch {}
    setConnecting(false);
  };

  const statusBadge = (status: ChannelStatus) => {
    if (status === "connected") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/12 px-2.5 py-0.5 text-xs font-semibold text-[#10B981]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          Conectado
        </span>
      );
    }
    if (status === "connecting") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F59E0B]/12 px-2.5 py-0.5 text-xs font-semibold text-[#F59E0B]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Conectando...
        </span>
      );
    }
    if (status === "error") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EF4444]/12 px-2.5 py-0.5 text-xs font-semibold text-[#EF4444]">
          <XCircle className="h-3 w-3" />
          Error
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-surface-3)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]" />
        Desconectado
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Canales
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Conecta tus redes sociales y canales de mensajería
          </p>
        </div>
        <button
          onClick={() => loadStatuses(tenantId)}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {channels.map((ch) => {
          const state = channelStates[ch.id] || { status: "disconnected" };
          const isConnected = state.status === "connected";
          const Icon = ch.icon;

          return (
            <motion.div key={ch.id} variants={staggerItem}>
              <GlassCard
                hover
                className="p-6 relative overflow-hidden"
                glow={isConnected ? "success" : "none"}
              >
                {isConnected && (
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.04]"
                    style={{
                      background: `radial-gradient(ellipse at 50% 0%, ${ch.color}, transparent 70%)`,
                    }}
                  />
                )}

                <div className="relative flex items-start gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                    style={{
                      background: `${ch.color}18`,
                      boxShadow: isConnected ? `0 0 24px ${ch.color}20` : "none",
                    }}
                  >
                    <Icon className="h-6 w-6" style={{ color: ch.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-[var(--text-primary)]">{ch.name}</h3>
                      {statusBadge(state.status)}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)] leading-snug">
                      {ch.description}
                    </p>
                  </div>
                </div>

                <div className="relative mt-5">
                  {isConnected ? (
                    <div className="flex gap-2">
                      <div
                        className="flex-1 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
                        style={{
                          background: `${ch.color}08`,
                          border: `1px solid ${ch.color}20`,
                          color: ch.color,
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span className="font-medium">Canal activo</span>
                      </div>
                      <button
                        onClick={() => handleDisconnect(ch.id)}
                        className="rounded-xl border border-[var(--border-default)] p-2.5 text-[var(--text-tertiary)] hover:bg-[rgba(239,68,68,0.08)] hover:text-[#EF4444] hover:border-[rgba(239,68,68,0.25)] transition-all"
                        title="Desconectar"
                      >
                        <Unplug className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(ch.id)}
                      disabled={connecting}
                      className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${ch.color}, ${ch.color}cc)`,
                        boxShadow: `0 4px 14px ${ch.color}25`,
                      }}
                    >
                      {connecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      Conectar {ch.name}
                    </button>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </motion.div>

      <AnimatePresence>
        {activeModal === "whatsapp" && (
          <div className="modal-backdrop" onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="modal-content max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{ background: "#25D36615" }}
                  >
                    <MessageCircle className="h-4 w-4 text-[#25D366]" />
                  </div>
                  <h3 className="text-lg font-bold">Conectar WhatsApp</h3>
                </div>
                <button onClick={closeModal} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 mb-6">
                {QR_STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-500"
                      style={{
                        background: i <= qrStep ? "#25D366" : "var(--bg-surface-3)",
                        color: i <= qrStep ? "white" : "var(--text-tertiary)",
                      }}
                    >
                      {i < qrStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span
                      className="text-xs font-medium transition-colors"
                      style={{
                        color: i <= qrStep ? "#25D366" : "var(--text-tertiary)",
                      }}
                    >
                      {step}
                    </span>
                    {i < QR_STEPS.length - 1 && (
                      <div
                        className="h-px w-6 transition-colors duration-500"
                        style={{
                          background: i < qrStep ? "#25D366" : "var(--border-default)",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {qrError ? (
                <div className="py-6 text-center">
                  <XCircle className="h-10 w-10 text-[#EF4444] mx-auto mb-3" />
                  <p className="text-sm text-[#EF4444]">{qrError}</p>
                  <button
                    onClick={() => handleConnect("whatsapp")}
                    className="btn-primary mt-4 text-sm"
                  >
                    Reintentar
                  </button>
                </div>
              ) : qrStep === 2 ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="py-8 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366]/15">
                    <Check className="h-8 w-8 text-[#25D366]" />
                  </div>
                  <p className="text-lg font-bold text-[#25D366]">Conectado</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    WhatsApp está listo para recibir mensajes
                  </p>
                </motion.div>
              ) : qrCode ? (
                <div className="text-center">
                  <div className="mx-auto w-56 h-56 relative mb-5">
                    <div className="absolute inset-0 rounded-2xl" style={{
                      background: "conic-gradient(from 0deg, #25D366, #128C7E, #25D366)",
                      padding: 2,
                      animation: "spin 3s linear infinite",
                    }}>
                      <div className="h-full w-full rounded-2xl bg-white p-3">
                        <img
                          src={qrCode}
                          alt="QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-1 font-medium">
                    Escanea con WhatsApp
                  </p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    WhatsApp → Dispositivos vinculados → Vincular dispositivo
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-[#F59E0B]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-medium">Esperando vinculación...</span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 w-48 h-48 rounded-2xl border-2 border-dashed border-[var(--border-default)] flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-[#25D366]" />
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">Generando código QR...</p>
                  <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                    Esto puede tardar unos segundos
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {activeModal === "instagram" && (
          <div className="modal-backdrop" onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "#E1306C15" }}>
                    <Instagram className="h-4 w-4 text-[#E1306C]" />
                  </div>
                  <h3 className="text-lg font-bold">Conectar Instagram</h3>
                </div>
                <button onClick={closeModal} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Usuario de Instagram</label>
                  <input
                    type="text"
                    value={igUsername}
                    onChange={(e) => setIgUsername(e.target.value)}
                    placeholder="@tu_usuario"
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={igPassword}
                      onChange={(e) => setIgPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      className="input-field pr-10"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Código 2FA (opcional)</label>
                  <input
                    type="text"
                    value={igTwoFA}
                    onChange={(e) => setIgTwoFA(e.target.value)}
                    placeholder="Código de verificación"
                    className="input-field"
                  />
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Las credenciales se usan para acceder a los DMs. Recomendamos usar una cuenta dedicada para el negocio.
                </p>
                <button
                  onClick={handleInstagramConnect}
                  disabled={connecting || !igUsername || !igPassword}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #E1306C, #C13584)" }}
                >
                  {connecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Conectando...
                    </span>
                  ) : (
                    "Conectar Instagram"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === "facebook" && (
          <div className="modal-backdrop" onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "#1877F215" }}>
                    <Facebook className="h-4 w-4 text-[#1877F2]" />
                  </div>
                  <h3 className="text-lg font-bold">Conectar Facebook</h3>
                </div>
                <button onClick={closeModal} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-1)] p-4">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Conecta tu página de Facebook con la API de Meta. Necesitas el ID de la página y el token de acceso de página permanente.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Page ID</label>
                  <input
                    type="text"
                    value={fbPageId}
                    onChange={(e) => setFbPageId(e.target.value)}
                    placeholder="123456789012345"
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Access Token de Página</label>
                  <input
                    type="password"
                    value={fbAccessToken}
                    onChange={(e) => setFbAccessToken(e.target.value)}
                    placeholder="EAAxxxxxxxx..."
                    className="input-field"
                  />
                </div>
                <button
                  onClick={handleFacebookConnect}
                  disabled={connecting || !fbPageId || !fbAccessToken}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #1877F2, #1565C0)" }}
                >
                  {connecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Conectando...
                    </span>
                  ) : (
                    "Conectar Facebook"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeModal === "tiktok" && (
          <div className="modal-backdrop" onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "#FE2C5515" }}>
                    <Music className="h-4 w-4 text-[#FE2C55]" />
                  </div>
                  <h3 className="text-lg font-bold">Conectar TikTok</h3>
                </div>
                <button onClick={closeModal} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-1)] p-4">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Pega las cookies de sesión de TikTok para habilitar la respuesta automática
                    a comentarios en tus videos. Puedes obtenerlas desde las herramientas de
                    desarrollador de tu navegador.
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label">Usuario TikTok</label>
                  <input
                    type="text"
                    value={ttUsername}
                    onChange={(e) => setTtUsername(e.target.value)}
                    placeholder="@miusuario"
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cookies de sesión</label>
                  <textarea
                    value={ttCookies}
                    onChange={(e) => setTtCookies(e.target.value)}
                    placeholder='[{"name":"sessionid","value":"...","domain":".tiktok.com"}]'
                    rows={4}
                    className="input-field resize-none font-[var(--font-mono)] text-xs"
                  />
                </div>
                <button
                  onClick={handleTikTokConnect}
                  disabled={connecting || !ttUsername || !ttCookies}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #25F4EE, #FE2C55)" }}
                >
                  {connecting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Conectando...
                    </span>
                  ) : (
                    "Conectar TikTok"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
