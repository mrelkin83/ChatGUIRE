"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCOP, formatDate } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import {
  CalendarDays, Clock, User, Phone, Plus, CheckCircle2,
  Play, XCircle, Search, Filter, ArrowRight, Scissors,
  ChevronDown, Loader2, Calendar as CalendarIcon,
  AlertCircle, CheckCheck, Timer
} from "lucide-react";

interface Appointment {
  id: string;
  customerName?: string;
  customerPhone?: string;
  serviceName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  notes?: string;
}

import { API_BASE } from "@/lib/api";
const API = `${API_BASE}/api`;

const statusConfig: Record<string, { label: string; variant: "amber" | "blue" | "purple" | "green" | "red" | "gray" }> = {
  pending: { label: "Pendiente", variant: "amber" },
  confirmed: { label: "Confirmada", variant: "blue" },
  in_progress: { label: "En Progreso", variant: "purple" },
  completed: { label: "Completada", variant: "green" },
  cancelled: { label: "Cancelada", variant: "red" },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [changingId, setChangingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/tenants`)
      .then((r) => r.json())
      .then((tenants) => {
        if (Array.isArray(tenants) && tenants.length > 0) {
          const id = tenants[0].id;
          setTenantId(id);
          return fetch(`${API}/appointments?tenantId=${id}`).then((r) => r.json());
        }
        throw new Error("No tenants");
      })
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .catch(() => {
        setAppointments([]);
        toast.error("Error al cargar citas");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (apt: Appointment, newStatus: string) => {
    setChangingId(apt.id);
    try {
      const res = await fetch(`${API}/appointments/${tenantId}/${apt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setAppointments(appointments.map((a) => (a.id === apt.id ? { ...a, status: newStatus } : a)));
      const statusLabel = statusConfig[newStatus]?.label || newStatus;
      toast.success(`Cita marcada como "${statusLabel}"`);
    } catch {
      toast.error("Error al actualizar la cita");
    }
    setChangingId(null);
  };

  const filtered = appointments
    .filter((a) => {
      const matchSearch =
        a.serviceName?.toLowerCase().includes(search.toLowerCase()) ||
        a.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        false;
      const matchStatus = !statusFilter || a.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const upcoming = filtered.filter((a) => a.status === "pending" || a.status === "confirmed");

  if (loading) return <AppointmentsSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">
            Citas
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {appointments.length} {appointments.length === 1 ? "cita" : "citas"} programadas
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" />
          Nueva Cita
        </button>
      </div>

      <GlassCard className="p-5 flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-primary-subtle)]">
          <CalendarDays className="h-6 w-6 text-[var(--accent-primary)]" />
        </div>
        <div>
          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Hoy</p>
          <p className="text-lg font-semibold font-[family-name:var(--font-display)] capitalize">
            {today}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold font-[family-name:var(--font-mono)]">{upcoming.length}</p>
            <p className="text-xs text-[var(--text-tertiary)]">pendientes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold font-[family-name:var(--font-mono)]">
              {filtered.filter((a) => a.status === "completed").length}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">completadas</p>
          </div>
        </div>
      </GlassCard>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Buscar por cliente o servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value="">Todos los estados</option>
          {Object.entries(statusConfig).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-[var(--bg-surface-3)] flex items-center justify-center mb-4">
            <CalendarDays className="h-8 w-8 text-[var(--text-tertiary)]" />
          </div>
          <h3 className="text-lg font-semibold font-[family-name:var(--font-display)] mb-1">
            {search || statusFilter ? "Sin resultados" : "No hay citas"}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {search || statusFilter
              ? "Intenta con otros filtros de búsqueda"
              : "Programa tu primera cita para comenzar"}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {upcoming.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                Próximas Citas ({upcoming.length})
              </h3>
            </div>
          )}

          {filtered.map((apt, idx) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <GlassCard
                hover
                glow={
                  apt.status === "pending" ? "amber" : apt.status === "confirmed" ? "primary" : "none"
                }
                className="p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
                        apt.status === "pending"
                          ? "bg-[rgba(245,158,11,0.12)]"
                          : apt.status === "confirmed"
                          ? "bg-[var(--accent-primary-subtle)]"
                          : apt.status === "in_progress"
                          ? "bg-[rgba(139,92,246,0.12)]"
                          : apt.status === "completed"
                          ? "bg-[rgba(16,185,129,0.12)]"
                          : "bg-[rgba(255,255,255,0.04)]"
                      )}
                    >
                      <Scissors
                        className={cn(
                          "h-6 w-6",
                          apt.status === "pending"
                            ? "text-[var(--accent-amber)]"
                            : apt.status === "confirmed"
                            ? "text-[var(--accent-primary)]"
                            : apt.status === "in_progress"
                            ? "text-[#8B5CF6]"
                            : apt.status === "completed"
                            ? "text-[var(--accent-success)]"
                            : "text-[var(--text-tertiary)]"
                        )}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-[var(--text-primary)] font-[family-name:var(--font-display)]">
                          {apt.serviceName}
                        </h4>
                        <Badge variant={statusConfig[apt.status]?.variant || "gray"} className="text-[10px]">
                          {statusConfig[apt.status]?.label || apt.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                        {apt.customerName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3 text-[var(--text-tertiary)]" />
                            {apt.customerName}
                          </span>
                        )}
                        {apt.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-[var(--text-tertiary)]" />
                            {apt.customerPhone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3 text-[var(--text-tertiary)]" />
                          {formatDate(apt.scheduledAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3 text-[var(--text-tertiary)]" />
                          {apt.durationMinutes} min
                        </span>
                      </div>

                      {apt.notes && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-1.5 line-clamp-1">
                          {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 lg:self-center">
                    {apt.status === "pending" && (
                      <button
                        onClick={() => handleStatusChange(apt, "confirmed")}
                        disabled={changingId === apt.id}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        {changingId === apt.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Confirmar
                      </button>
                    )}
                    {(apt.status === "pending" || apt.status === "confirmed") && (
                      <>
                        <button
                          onClick={() => handleStatusChange(apt, "in_progress")}
                          disabled={changingId === apt.id}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Iniciar
                        </button>
                        <button
                          onClick={() => handleStatusChange(apt, "cancelled")}
                          disabled={changingId === apt.id}
                          className="btn-ghost text-xs py-1.5 px-3 text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.12)]"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                      </>
                    )}
                    {apt.status === "in_progress" && (
                      <button
                        onClick={() => handleStatusChange(apt, "completed")}
                        disabled={changingId === apt.id}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        {changingId === apt.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCheck className="h-3.5 w-3.5" />
                        )}
                        Completar
                      </button>
                    )}
                    {apt.status === "completed" && (
                      <span className="flex items-center gap-1 text-xs text-[var(--accent-success)]">
                        <CheckCheck className="h-4 w-4" />
                        Completada
                      </span>
                    )}
                    {apt.status === "cancelled" && (
                      <span className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
                        <AlertCircle className="h-4 w-4" />
                        Cancelada
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function AppointmentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-24" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
