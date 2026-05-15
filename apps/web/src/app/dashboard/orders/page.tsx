"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCOP, formatDate } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import {
  Package, TrendingUp, Clock, Ban, CalendarDays,
  Search, Filter, ChevronDown, ChevronUp, ShoppingBag,
  Hash, Users, DollarSign, Loader2, Receipt, FileText,
  MoreHorizontal, X, Plus
} from "lucide-react";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  status: string;
  total: string;
  items?: OrderItem[];
  notes?: string;
  createdAt: string;
  itemsCount?: number;
}

import { API_BASE } from "@/lib/api";
const API = `${API_BASE}/api`;

const statusConfig: Record<string, { label: string; variant: "amber" | "blue" | "purple" | "green" | "red" | "gray" }> = {
  pending: { label: "Pendiente", variant: "amber" },
  confirmed: { label: "Confirmado", variant: "blue" },
  preparing: { label: "Preparando", variant: "purple" },
  ready: { label: "Listo", variant: "amber" },
  delivered: { label: "Entregado", variant: "green" },
  cancelled: { label: "Cancelado", variant: "red" },
};

const statusOrder = ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/tenants`)
      .then((r) => r.json())
      .then((tenants) => {
        if (Array.isArray(tenants) && tenants.length > 0) {
          const id = tenants[0].id;
          setTenantId(id);
          return fetch(`${API}/orders?tenantId=${id}`).then((r) => r.json());
        }
        throw new Error("No tenants");
      })
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => {
        setOrders([]);
        toast.error("Error al cargar pedidos");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (order: Order, newStatus: string) => {
    setChangingStatus(order.id);
    try {
      const res = await fetch(`${API}/orders/${tenantId}/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setOrders(orders.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o)));
      toast.success(`Pedido ${order.orderNumber}: estado actualizado`);
    } catch {
      toast.error("Error al cambiar estado");
    }
    setChangingStatus(null);
  };

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      false;
    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const revenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + Number(o.total || 0), 0);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const cancelledCount = orders.filter((o) => o.status === "cancelled").length;
  const todayCount = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const stats = [
    { icon: Package, label: "Total Pedidos", value: orders.length, color: "var(--accent-info)" },
    { icon: TrendingUp, label: "Ingresos", value: formatCOP(revenue), color: "var(--accent-success)" },
    { icon: Clock, label: "Pendientes", value: pendingCount, color: "var(--accent-amber)" },
    { icon: Ban, label: "Cancelados", value: cancelledCount, color: "var(--accent-danger)" },
  ];

  if (loading) return <OrdersSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">
            Pedidos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {orders.length} {orders.length === 1 ? "pedido" : "pedidos"} registrados
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="h-4 w-4" />
          Nuevo Pedido
        </button>
      </div>

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {stats.map((s) => (
          <GlassCard key={s.label} className="p-5">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: `${s.color}15` }}
              >
                <s.icon className="h-5 w-5" style={{ color: s.color }} />
              </div>
              <div>
                <p className="text-xs text-[var(--text-secondary)]">{s.label}</p>
                <p className="text-xl font-bold font-[family-name:var(--font-mono)] text-[var(--text-primary)]">
                  {s.value}
                </p>
              </div>
            </div>
          </GlassCard>
        ))}
      </motion.div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Buscar por #pedido o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-44"
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
            <Receipt className="h-8 w-8 text-[var(--text-tertiary)]" />
          </div>
          <h3 className="text-lg font-semibold font-[family-name:var(--font-display)] mb-1">
            {search || statusFilter ? "Sin resultados" : "No hay pedidos"}
          </h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {search || statusFilter
              ? "Intenta con otros filtros de búsqueda"
              : "Los pedidos de tus clientes aparecerán aquí"}
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {statusOrder.map((status) => {
            const statusOrders = filtered.filter((o) => o.status === status);
            if (statusOrders.length === 0) return null;
            const config = statusConfig[status] || statusConfig.pending;

            return (
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: statusOrder.indexOf(status) * 0.05 }}
              >
                <GlassCard className="overflow-hidden">
                  <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)]" />
                    <h3 className="text-sm font-semibold font-[family-name:var(--font-display)]">
                      <Badge variant={config.variant} className="text-xs">{config.label}</Badge>
                    </h3>
                    <span className="text-xs text-[var(--text-tertiary)] ml-auto">
                      {statusOrders.length} pedidos
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                          <th className="px-5 py-3">Pedido</th>
                          <th className="px-5 py-3">Cliente</th>
                          <th className="px-5 py-3">Items</th>
                          <th className="px-5 py-3">Total</th>
                          <th className="px-5 py-3">Fecha</th>
                          <th className="px-5 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {statusOrders.map((order) => (
                          <>
                            <motion.tr
                              key={order.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="table-row cursor-pointer"
                              onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            >
                              <td className="px-5 py-4">
                                <span className="font-medium font-[family-name:var(--font-mono)] text-sm">
                                  #{order.orderNumber}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[#8B5CF6] flex items-center justify-center text-[10px] font-bold text-white">
                                    {order.customerName?.charAt(0)?.toUpperCase() || "C"}
                                  </div>
                                  <span className="text-sm">
                                    {order.customerName || "Sin nombre"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                                {order.itemsCount ?? order.items?.length ?? 0}
                              </td>
                              <td className="px-5 py-4">
                                <span className="font-bold font-[family-name:var(--font-mono)] text-sm">
                                  {formatCOP(Number(order.total) || 0)}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                                {formatDate(order.createdAt)}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center justify-end gap-1">
                                  <select
                                    value={order.status}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(order, e.target.value);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="input-field text-xs py-1 px-2 w-32"
                                    disabled={changingStatus === order.id}
                                  >
                                    {statusOrder.map((s) => (
                                      <option key={s} value={s}>
                                        {statusConfig[s]?.label || s}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="ml-2">
                                    {expandedId === order.id ? (
                                      <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
                                    )}
                                  </span>
                                </div>
                              </td>
                            </motion.tr>
                            {expandedId === order.id && (
                              <motion.tr
                                key={`${order.id}-expanded`}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                              >
                                <td colSpan={6} className="px-5 py-4 bg-[var(--bg-surface-1)]">
                                  <div className="space-y-3">
                                    {order.items && order.items.length > 0 ? (
                                      <>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                                          Items del pedido
                                        </p>
                                        <div className="space-y-1.5">
                                          {order.items.map((item) => (
                                            <div
                                              key={item.id}
                                              className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-surface-2)]"
                                            >
                                              <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-[var(--bg-surface-3)] flex items-center justify-center">
                                                  <Package className="h-4 w-4 text-[var(--text-tertiary)]" />
                                                </div>
                                                <div>
                                                  <p className="text-sm font-medium">{item.productName}</p>
                                                  <p className="text-xs text-[var(--text-tertiary)]">
                                                    {item.quantity} x {formatCOP(item.unitPrice)}
                                                  </p>
                                                </div>
                                              </div>
                                              <span className="text-sm font-bold font-[family-name:var(--font-mono)]">
                                                {formatCOP(item.quantity * item.unitPrice)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
                                          <span className="text-sm font-bold font-[family-name:var(--font-mono)]">
                                            Total: {formatCOP(Number(order.total) || 0)}
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                                        Sin items detallados
                                      </p>
                                    )}

                                    {order.notes && (
                                      <div className="pt-3 border-t border-[var(--border-subtle)]">
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
                                          Notas
                                        </p>
                                        <p className="text-sm text-[var(--text-secondary)]">{order.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
