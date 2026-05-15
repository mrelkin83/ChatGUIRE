"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Check,
  Key,
  Shield,
  Wallet,
  Globe,
  Lock,
  Settings,
  X,
  Loader2,
  ExternalLink,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatCOP, formatDate } from "@/lib/utils";

import { API_BASE } from "@/lib/api";
const API = API_BASE;

interface TransactionRecord {
  id: string;
  amount: number;
  status: "approved" | "pending" | "declined" | "voided";
  createdAt: string;
  reference: string;
  paymentMethod: string;
}

interface PaymentConfig {
  wompi_public_key: string;
  wompi_private_key: string;
  wompi_environment: "sandbox" | "production";
  wompi_webhook_url: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "green" | "amber" | "red" | "gray" }> = {
  approved: { label: "Aprobado", variant: "green" },
  pending: { label: "Pendiente", variant: "amber" },
  declined: { label: "Rechazado", variant: "red" },
  voided: { label: "Anulado", variant: "gray" },
};

const DEMO_TRANSACTIONS: TransactionRecord[] = [
  {
    id: "wompi_trx_8F3A2B1C9D",
    amount: 185000,
    status: "approved",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    reference: "PED-2024-0042",
    paymentMethod: "Nequi",
  },
  {
    id: "wompi_trx_4E7D9F6A2B",
    amount: 95000,
    status: "pending",
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    reference: "PED-2024-0041",
    paymentMethod: "Bancolombia",
  },
  {
    id: "wompi_trx_1C3B5A8F7D",
    amount: 320000,
    status: "approved",
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    reference: "PED-2024-0040",
    paymentMethod: "Daviplata",
  },
  {
    id: "wompi_trx_9D2F6E1A4C",
    amount: 67500,
    status: "declined",
    createdAt: new Date(Date.now() - 30 * 3600000).toISOString(),
    reference: "PED-2024-0039",
    paymentMethod: "Tarjeta de crédito",
  },
  {
    id: "wompi_trx_7B5E8C3F1A",
    amount: 250000,
    status: "approved",
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    reference: "PED-2024-0038",
    paymentMethod: "PSE",
  },
  {
    id: "wompi_trx_2A9C4D6E8F",
    amount: 150000,
    status: "voided",
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    reference: "PED-2024-0037",
    paymentMethod: "Nequi",
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

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [publicKey, setPublicKey] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [showPublic, setShowPublic] = useState(false);
  const [showPrivate, setShowPrivate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  const webhookUrl = tenantId
    ? `${window.location.origin}/api/webhooks/wompi/${tenantId}`
    : "https://app.chatuire.com/api/webhooks/wompi/tu-id";

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
              if (config.wompi_public_key) setPublicKey(config.wompi_public_key);
              if (config.wompi_private_key) setPrivateKey(config.wompi_private_key);
              if (config.wompi_environment) setEnvironment(config.wompi_environment);
              setIsConfigured(!!config.wompi_public_key && !!config.wompi_private_key);
            }
          } catch {}

          try {
            const trxRes = await fetch(`${API}/api/transactions/${id}`);
            const trxData = await trxRes.json();
            if (Array.isArray(trxData) && trxData.length > 0) {
              setTransactions(trxData);
            } else {
              setTransactions(DEMO_TRANSACTIONS);
            }
          } catch {
            setTransactions(DEMO_TRANSACTIONS);
          }
        }
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const handleSave = async () => {
    if (!publicKey || !privateKey) {
      toast.error("Debes ingresar las llaves pública y privada");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/tenants/${tenantId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wompi_public_key: publicKey,
          wompi_private_key: privateKey,
          wompi_environment: environment,
        }),
      });
      if (res.ok) {
        setIsConfigured(true);
        toast.success("Configuración de Wompi guardada correctamente");
      } else {
        toast.error("Error al guardar la configuración");
      }
    } catch {
      toast.error("Error de conexión al guardar");
    }
    setSaving(false);
  };

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success("Webhook URL copiada al portapapeles");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-6 w-72" />
        <div className="skeleton h-20 w-64 rounded-[var(--radius-lg)]" />
        <div className="skeleton h-96 rounded-[var(--radius-lg)]" />
        <div className="skeleton h-64 rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Pagos
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Configura tu pasarela de pagos Wompi
        </p>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem}>
          <GlassCard className="p-5" glow={isConfigured ? "success" : "none"}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="h-11 w-11 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--accent-primary-subtle)" }}
                >
                  <Wallet className="h-5 w-5" style={{ color: "var(--accent-primary)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Pasarela de pagos</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Wompi {environment === "production" ? "Producción" : "Sandbox"}
                  </p>
                </div>
              </div>
              <Badge variant={isConfigured ? "green" : "gray"}>
                {isConfigured ? "Activado" : "No configurado"}
              </Badge>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem}>
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2
                  className="text-base font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Configuración de Wompi
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Conecta tu cuenta de Wompi para recibir pagos
                </p>
              </div>
              <a
                href="https://comercios.wompi.co"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: "var(--accent-primary)" }}
              >
                <ExternalLink className="h-3 w-3" />
                Ir a Wompi
              </a>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] text-[var(--text-secondary)] font-medium">
                  Entorno
                </label>
                <div
                  className="relative flex w-fit rounded-full p-1"
                  style={{ background: "var(--bg-surface-3)" }}
                >
                  <button
                    onClick={() => setEnvironment("sandbox")}
                    className={cn(
                      "relative z-10 px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-200",
                      environment === "sandbox"
                        ? "text-white"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    )}
                  >
                    Sandbox
                  </button>
                  <button
                    onClick={() => setEnvironment("production")}
                    className={cn(
                      "relative z-10 px-5 py-2 text-sm font-semibold rounded-full transition-colors duration-200",
                      environment === "production"
                        ? "text-white"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    )}
                  >
                    Producción
                  </button>
                  <motion.div
                    layoutId="env-indicator"
                    className="absolute top-1 z-0 h-[calc(100%-8px)] rounded-full"
                    style={{
                      background:
                        environment === "production"
                          ? "var(--accent-success)"
                          : "var(--bg-surface-2)",
                      width:
                        environment === "production"
                          ? "calc(50% - 4px)"
                          : "calc(50% - 4px)",
                      left: environment === "production"
                        ? "calc(50% + 0px)"
                        : "0px",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="relative">
                  <Input
                    label="Llave Pública"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder={environment === "sandbox" ? "pub_test_xxxxx" : "pub_prod_xxxxx"}
                    icon={<Key className="h-4 w-4" />}
                    type={showPublic ? "text" : "password"}
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                  <button
                    onClick={() => setShowPublic(!showPublic)}
                    className="absolute right-3 bottom-2.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPublic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="relative">
                  <Input
                    label="Llave Privada"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder={environment === "sandbox" ? "prv_test_xxxxx" : "prv_prod_xxxxx"}
                    icon={<Lock className="h-4 w-4" />}
                    type={showPrivate ? "text" : "password"}
                    style={{ fontFamily: "var(--font-mono)" }}
                  />
                  <button
                    onClick={() => setShowPrivate(!showPrivate)}
                    className="absolute right-3 bottom-2.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
                  URL del Webhook
                </label>
                <p className="text-[11px] text-[var(--text-tertiary)] mb-2">
                  Configura esta URL en el dashboard de Wompi para recibir notificaciones de pago
                </p>
                <div
                  className="flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 border"
                  style={{
                    background: "var(--bg-surface-1)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Globe className="h-4 w-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    <span
                      className="text-sm truncate"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}
                    >
                      {webhookUrl}
                    </span>
                  </div>
                  <motion.button
                    onClick={handleCopyWebhook}
                    whileTap={{ scale: 0.9 }}
                    animate={copied ? { scale: [1, 1.15, 1] } : {}}
                    className="flex items-center gap-1.5 shrink-0 rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold transition-all duration-200"
                    style={{
                      background: copied
                        ? "var(--accent-success)"
                        : "var(--bg-surface-3)",
                      color: copied ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>

              <div className="pt-3">
                <Button
                  onClick={handleSave}
                  loading={saving}
                  icon={<Settings className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                >
                  Guardar configuración
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show">
        <motion.div variants={staggerItem}>
          <GlassCard className="overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h3
                className="text-sm font-semibold"
                style={{ color: "var(--text-secondary)" }}
              >
                Historial de transacciones
              </h3>
              <Badge variant="gray">
                <Clock className="h-3 w-3" />
                Últimas {transactions.length}
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className="text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <th className="px-5 py-3">ID Transacción</th>
                    <th className="px-5 py-3">Referencia</th>
                    <th className="px-5 py-3">Monto</th>
                    <th className="px-5 py-3">Método</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {transactions.map((trx) => {
                    const statusCfg = STATUS_CONFIG[trx.status] || STATUS_CONFIG.approved;
                    return (
                      <motion.tr
                        key={trx.id}
                        variants={staggerItem}
                        className="table-row"
                      >
                        <td className="px-5 py-3.5">
                          <span
                            className="text-xs"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {trx.id.slice(0, 14)}...
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-medium">{trx.reference}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="text-sm font-semibold"
                            style={{ fontFamily: "var(--font-mono)" }}
                          >
                            {formatCOP(trx.amount)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                            {trx.paymentMethod}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                            {formatDate(trx.createdAt)}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {transactions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-5">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "var(--bg-surface-2)" }}
                >
                  <CreditCard className="h-7 w-7" style={{ color: "var(--text-tertiary)" }} />
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Sin transacciones
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  Las transacciones aparecerán aquí cuando recibas pagos
                </p>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
