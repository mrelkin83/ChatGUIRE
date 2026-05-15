"use client";

import { useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  type Variants,
} from "framer-motion";
import {
  MapPin,
  Truck,
  Package,
  Phone,
  User,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Loader2,
  Navigation,
  Home,
  Hash,
  Calendar,
  Filter,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard } from "@/components/ui/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDate, formatRelativeTime } from "@/lib/utils";

import { API_BASE } from "@/lib/api";
const API = API_BASE;

type DeliveryStatus = "pending" | "assigned" | "in_transit" | "delivered" | "cancelled";

interface DeliveryPerson {
  id: string;
  name: string;
  phone: string;
  status: "available" | "busy" | "offline";
}

interface Delivery {
  id: string;
  customerName: string;
  customerPhone: string;
  address: string;
  orderId: string;
  status: DeliveryStatus;
  assignedTo: string | null;
  assignedName: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TABS = [
  { id: "all", label: "Todos" },
  { id: "pending", label: "Pendientes" },
  { id: "assigned", label: "Asignados" },
  { id: "in_transit", label: "En camino" },
  { id: "delivered", label: "Entregados" },
  { id: "cancelled", label: "Cancelados" },
];

const STATUS_CONFIG: Record<DeliveryStatus, { label: string; variant: "amber" | "blue" | "purple" | "green" | "red" }> = {
  pending: { label: "Pendiente", variant: "amber" },
  assigned: { label: "Asignado", variant: "blue" },
  in_transit: { label: "En camino", variant: "purple" },
  delivered: { label: "Entregado", variant: "green" },
  cancelled: { label: "Cancelado", variant: "red" },
};

const DEMO_DELIVERIES: Delivery[] = [
  {
    id: "del_001",
    customerName: "María García",
    customerPhone: "+57 310 123 4567",
    address: "Cra 45 #23-12, Medellín",
    orderId: "PED-2024-0089",
    status: "in_transit",
    assignedTo: "agent_1",
    assignedName: "Carlos Pérez",
    notes: "Entregar en portería, tocar el timbre",
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: "del_002",
    customerName: "Juan López",
    customerPhone: "+57 315 987 6543",
    address: "Cl 80 #12-45, Apto 502, Bogotá",
    orderId: "PED-2024-0088",
    status: "pending",
    assignedTo: null,
    assignedName: null,
    notes: "",
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: "del_003",
    customerName: "Ana Martínez",
    customerPhone: "+57 320 456 7890",
    address: "Av. Regional #45-67, Barranquilla",
    orderId: "PED-2024-0087",
    status: "delivered",
    assignedTo: "agent_2",
    assignedName: "Diana Ruiz",
    notes: "Entregado en recepción",
    createdAt: new Date(Date.now() - 120 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 60000).toISOString(),
  },
  {
    id: "del_004",
    customerName: "Pedro Rojas",
    customerPhone: "+57 301 234 5678",
    address: "Cl 10 #5-23, Cali",
    orderId: "PED-2024-0086",
    status: "assigned",
    assignedTo: "agent_1",
    assignedName: "Carlos Pérez",
    notes: "Llamar antes de llegar",
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
  },
  {
    id: "del_005",
    customerName: "Laura Jiménez",
    customerPhone: "+57 318 876 5432",
    address: "Cra 30 #15-78, Cartagena",
    orderId: "PED-2024-0085",
    status: "cancelled",
    assignedTo: null,
    assignedName: null,
    notes: "Cliente canceló el pedido",
    createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 170 * 60000).toISOString(),
  },
  {
    id: "del_006",
    customerName: "Sofía Torres",
    customerPhone: "+57 312 345 6789",
    address: "Cra 55 #80-32, Medellín",
    orderId: "PED-2024-0084",
    status: "delivered",
    assignedTo: "agent_2",
    assignedName: "Diana Ruiz",
    notes: "",
    createdAt: new Date(Date.now() - 240 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 90 * 60000).toISOString(),
  },
];

const DEMO_PEOPLE: DeliveryPerson[] = [
  { id: "agent_1", name: "Carlos Pérez", phone: "+57 311 111 2222", status: "busy" },
  { id: "agent_2", name: "Diana Ruiz", phone: "+57 311 333 4444", status: "available" },
  { id: "agent_3", name: "Miguel Ángel", phone: "+57 311 555 6666", status: "available" },
];

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.06 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const pulseAnimation = `
  @keyframes delivery-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes truck-move {
    0% { transform: translateX(-2px); }
    50% { transform: translateX(2px); }
    100% { transform: translateX(-2px); }
  }
  .animate-delivery-pulse {
    animation: delivery-pulse 2s ease-in-out infinite;
  }
  .animate-truck-bounce {
    animation: truck-move 0.8s ease-in-out infinite;
  }
`;

export default function DeliveriesPage() {
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>(DEMO_DELIVERIES);
  const [deliveryPeople] = useState<DeliveryPerson[]>(DEMO_PEOPLE);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newCustomer, setNewCustomer] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newAssigned, setNewAssigned] = useState("");
  const [newOrderId, setNewOrderId] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tenantsRes = await fetch(`${API}/api/tenants`);
        const tenants = await tenantsRes.json();
        if (tenants.length > 0 && mounted) {
          try {
            const deliveriesRes = await fetch(`${API}/api/deliveries/${tenants[0].id}`);
            const data = await deliveriesRes.json();
            if (Array.isArray(data) && data.length > 0) {
              setDeliveries(data);
            }
          } catch {}
        }
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const filteredDeliveries = deliveries
    .filter((d) => {
      if (activeTab !== "all") return d.status === activeTab;
      return true;
    })
    .filter((d) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        d.customerName.toLowerCase().includes(q) ||
        d.customerPhone.includes(q) ||
        d.address.toLowerCase().includes(q) ||
        d.orderId.toLowerCase().includes(q)
      );
    });

  const counts = deliveries.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleStatusChange = async (deliveryId: string, newStatus: DeliveryStatus) => {
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? { ...d, status: newStatus, updatedAt: new Date().toISOString() }
          : d
      )
    );
    toast.success(
      `Domicilio ${newStatus === "in_transit" ? "en camino" : STATUS_CONFIG[newStatus].label.toLowerCase()}`
    );
  };

  const handleAssign = async (deliveryId: string, personId: string) => {
    const person = deliveryPeople.find((p) => p.id === personId);
    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === deliveryId
          ? {
              ...d,
              assignedTo: personId,
              assignedName: person?.name || null,
              status: "assigned" as DeliveryStatus,
              updatedAt: new Date().toISOString(),
            }
          : d
      )
    );
    toast.success(`Domicilio asignado a ${person?.name}`);
  };

  const handleCreateDelivery = async () => {
    if (!newCustomer || !newAddress) {
      toast.error("Nombre del cliente y dirección son requeridos");
      return;
    }
    setSaving(true);
    const newDelivery: Delivery = {
      id: `del_${Date.now()}`,
      customerName: newCustomer,
      customerPhone: newPhone,
      address: newAddress,
      orderId: newOrderId || `PED-${Date.now().toString(36).toUpperCase()}`,
      status: "pending",
      assignedTo: newAssigned || null,
      assignedName: newAssigned
        ? deliveryPeople.find((p) => p.id === newAssigned)?.name || null
        : null,
      notes: newNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDeliveries((prev) => [newDelivery, ...prev]);
    setNewCustomer("");
    setNewPhone("");
    setNewAddress("");
    setNewNotes("");
    setNewAssigned("");
    setNewOrderId("");
    setShowNewModal(false);
    setSaving(false);
    toast.success("Domicilio creado correctamente");
  };

  const handleDeleteDelivery = (id: string) => {
    setDeliveries((prev) => prev.filter((d) => d.id !== id));
    toast.success("Domicilio eliminado");
  };

  const getStatusIcon = (status: DeliveryStatus) => {
    const icons: Record<DeliveryStatus, React.ReactNode> = {
      pending: <AlertCircle className="h-3.5 w-3.5" />,
      assigned: <User className="h-3.5 w-3.5" />,
      in_transit: (
        <Truck className="h-3.5 w-3.5 animate-truck-bounce" />
      ),
      delivered: <CheckCircle2 className="h-3.5 w-3.5" />,
      cancelled: <XCircle className="h-3.5 w-3.5" />,
    };
    return icons[status];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-9 w-40 rounded-[var(--radius-md)]" />
        </div>
        <div className="skeleton h-10 w-full max-w-md rounded-[var(--radius-md)]" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-[var(--radius-lg)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{pulseAnimation}</style>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Domicilios
          </h1>
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-xs font-bold text-white"
            style={{ background: "var(--accent-primary)" }}
          >
            {deliveries.length}
          </motion.span>
        </div>
        <Button
          onClick={() => setShowNewModal(true)}
          icon={<Plus className="h-4 w-4" />}
        >
          Nuevo Domicilio
        </Button>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          />
          <input
            type="text"
            placeholder="Buscar por cliente, dirección, pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 text-sm"
          />
        </div>
        <Tabs
          tabs={STATUS_TABS.map((tab) => ({
            id: tab.id,
            label: tab.label,
            count: tab.id === "all" ? deliveries.length : counts[tab.id] || 0,
          }))}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {filteredDeliveries.length > 0 ? (
            filteredDeliveries.map((delivery) => {
              const statusCfg = STATUS_CONFIG[delivery.status];
              const isPending = delivery.status === "pending";
              const isAssigned = delivery.status === "assigned";
              const isInTransit = delivery.status === "in_transit";
              const isDelivered = delivery.status === "delivered";
              const isCancelled = delivery.status === "cancelled";
              const isActive = !isDelivered && !isCancelled;

              return (
                <motion.div
                  key={delivery.id}
                  variants={staggerItem}
                  layout
                  exit={{ opacity: 0, y: -10 }}
                >
                  <GlassCard
                    hover
                    className={cn(
                      "p-5",
                      !isActive && "opacity-60"
                    )}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                              isPending && "animate-delivery-pulse"
                            )}
                            style={{
                              background: isActive
                                ? "var(--accent-primary-subtle)"
                                : "var(--bg-surface-3)",
                            }}
                          >
                            <Package
                              className="h-5 w-5"
                              style={{
                                color: isActive
                                  ? "var(--accent-primary)"
                                  : "var(--text-tertiary)",
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold">
                                {delivery.customerName}
                              </h3>
                              <Badge
                                variant={statusCfg.variant}
                                icon={getStatusIcon(delivery.status)}
                              >
                                {statusCfg.label}
                              </Badge>
                              {isInTransit && (
                                <span className="animate-delivery-pulse">
                                  <Badge variant="purple" icon={<Navigation className="h-3 w-3" />}>
                                    En ruta
                                  </Badge>
                                </span>
                              )}
                            </div>

                            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Phone className="h-3.5 w-3.5" style={{ color: "var(--text-tertiary)" }} />
                                <span style={{ color: "var(--text-secondary)" }}>
                                  {delivery.customerPhone}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <MapPin className="h-3.5 w-3.5" style={{ color: "var(--text-tertiary)" }} />
                                <span className="truncate" style={{ color: "var(--text-secondary)" }}>
                                  {delivery.address}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Hash className="h-3.5 w-3.5" style={{ color: "var(--text-tertiary)" }} />
                                <span style={{ color: "var(--text-secondary)" }}>
                                  {delivery.orderId}
                                </span>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center gap-3 flex-wrap">
                              {delivery.assignedName && (
                                <span
                                  className="flex items-center gap-1 text-xs font-medium"
                                  style={{ color: "var(--accent-info)" }}
                                >
                                  <User className="h-3 w-3" />
                                  {delivery.assignedName}
                                </span>
                              )}
                              <span
                                className="flex items-center gap-1 text-xs"
                                style={{ color: "var(--text-tertiary)" }}
                              >
                                <Clock className="h-3 w-3" />
                                {formatRelativeTime(delivery.createdAt)}
                              </span>
                              {delivery.notes && (
                                <span
                                  className="flex items-center gap-1 text-xs truncate max-w-[200px]"
                                  style={{ color: "var(--text-tertiary)" }}
                                >
                                  <MessageSquare className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{delivery.notes}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {isActive && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isPending && (
                            <div className="flex items-center gap-1.5">
                              <select
                                value={delivery.assignedTo || ""}
                                onChange={(e) => handleAssign(delivery.id, e.target.value)}
                                className="input-field text-xs py-1.5 px-2 w-auto"
                                style={{ minWidth: "130px" }}
                              >
                                <option value="">Asignar...</option>
                                {deliveryPeople
                                  .filter((p) => p.status !== "offline")
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}

                          {isAssigned && (
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={<Truck className="h-3.5 w-3.5" />}
                              onClick={() => handleStatusChange(delivery.id, "in_transit")}
                            >
                              Iniciar
                            </Button>
                          )}

                          {isInTransit && (
                            <Button
                              size="sm"
                              variant="primary"
                              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                              onClick={() => handleStatusChange(delivery.id, "delivered")}
                            >
                              Completar
                            </Button>
                          )}

                          {!isDelivered && (
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<XCircle className="h-3.5 w-3.5" />}
                              onClick={() => handleStatusChange(delivery.id, "cancelled")}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "var(--bg-surface-2)" }}
              >
                <Truck className="h-8 w-8" style={{ color: "var(--text-tertiary)" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                Sin domicilios
              </p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {search ? "No hay resultados para esta búsqueda" : `No hay domicilios ${activeTab !== "all" ? STATUS_TABS.find((t) => t.id === activeTab)?.label.toLowerCase() : ""}`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <Modal
        open={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Nuevo Domicilio"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            label="Cliente"
            value={newCustomer}
            onChange={(e) => setNewCustomer(e.target.value)}
            placeholder="Nombre completo del cliente"
            icon={<User className="h-4 w-4" />}
          />
          <Input
            label="Teléfono"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+57 300 123 4567"
            icon={<Phone className="h-4 w-4" />}
          />
          <Input
            label="Dirección"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Cra 12 #34-56, Bogotá"
            icon={<MapPin className="h-4 w-4" />}
          />
          <Input
            label="Pedido (opcional)"
            value={newOrderId}
            onChange={(e) => setNewOrderId(e.target.value)}
            placeholder="PED-2024-XXXX"
            icon={<Hash className="h-4 w-4" />}
          />
          <div>
            <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
              Notas
            </label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Instrucciones de entrega..."
              rows={3}
              className="input-field resize-none"
            />
          </div>
          <div>
            <label className="text-[13px] text-[var(--text-secondary)] font-medium block mb-1.5">
              Domiciliario
            </label>
            <select
              value={newAssigned}
              onChange={(e) => setNewAssigned(e.target.value)}
              className="input-field"
            >
              <option value="">Sin asignar</option>
              {deliveryPeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === "busy" ? "(Ocupado)" : p.status === "offline" ? "(Offline)" : "(Disponible)"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowNewModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateDelivery}
              loading={saving}
              icon={<Plus className="h-4 w-4" />}
            >
              Crear Domicilio
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
