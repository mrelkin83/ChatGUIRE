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
  Plus, Pencil, Trash2, Package, Search, Wrench, Clock,
  PackageCheck, BarChart3, Grid3X3, List, ImageOff, Loader2,
  X, Eye, EyeOff
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  type: string;
  categoryName: string;
  isActive: boolean;
  imageUrl?: string;
  stock?: number;
  duration?: number;
}

import { API_BASE, dfetch, getTenantId } from "@/lib/api";
const API = `${API_BASE}/api`;

type TabKey = "todos" | "productos" | "servicios";

const getInitial = (name: string) => (name || "P").charAt(0).toUpperCase();

const gradientBgs = [
  "from-[var(--accent-primary)]/20 to-[var(--accent-primary)]/30",
  "from-[#8B5CF6]/20 to-[#8B5CF6]/30",
  "from-[var(--accent-success)]/20 to-[var(--accent-success)]/30",
  "from-[var(--accent-amber)]/20 to-[var(--accent-amber)]/30",
  "from-[#EC4899]/20 to-[#EC4899]/30",
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradientBgs[Math.abs(hash) % gradientBgs.length];
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("todos");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    type: "product",
    categoryName: "",
    imageUrl: "",
    duration: "",
    stock: "",
  });

  useEffect(() => {
    const id = getTenantId();
    if (id) {
      setTenantId(id);
      loadProducts(id);
    } else {
      setLoading(false);
    }
  }, []);

  const loadProducts = async (id: string) => {
    setLoading(true);
    try {
      const r = await dfetch(`${API}/products/${id}`);
      const data = await r.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
      toast.error("Error al cargar productos");
    }
    setLoading(false);
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description || "",
      price: p.price || "",
      type: p.type || "product",
      categoryName: p.categoryName || "",
      imageUrl: p.imageUrl || "",
      duration: p.duration?.toString() || "",
      stock: p.stock?.toString() || "",
    });
    setShowModal(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price: "",
      type: "product",
      categoryName: "",
      imageUrl: "",
      duration: "",
      stock: "",
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error("Nombre y precio son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const url = editing
        ? `${API}/products/${tenantId}/${editing.id}`
        : `${API}/products/${tenantId}`;
      const method = editing ? "PUT" : "POST";
      const body: Record<string, string> = {
        ...form,
        price: form.price,
      };
      if (form.type === "service") {
        body.duration = form.duration;
        delete (body as any).stock;
      } else {
        body.stock = form.stock;
        delete (body as any).duration;
      }
      const res = await dfetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(editing ? "Producto actualizado" : "Producto creado");
      setShowModal(false);
      setEditing(null);
      loadProducts(tenantId);
    } catch {
      toast.error("Error al guardar el producto");
    }
    setSaving(false);
  };

  const handleToggleActive = async (p: Product) => {
    try {
      const res = await dfetch(`${API}/products/${tenantId}/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, isActive: !p.isActive }),
      });
      if (!res.ok) throw new Error();
      setProducts(products.map((pr) => (pr.id === p.id ? { ...pr, isActive: !pr.isActive } : pr)));
      toast.success(p.isActive ? "Producto desactivado" : "Producto activado");
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      const res = await dfetch(`${API}/products/${tenantId}/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProducts(products.filter((p) => p.id !== productId));
      toast.success("Producto eliminado");
    } catch {
      toast.error("Error al eliminar el producto");
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const tabFiltered =
    activeTab === "todos"
      ? filtered
      : filtered.filter((p) =>
          activeTab === "productos" ? p.type === "product" : p.type === "service"
        );

  const tabs: { key: TabKey; label: string; icon: any; count: number }[] = [
    { key: "todos", label: "Todos", icon: Grid3X3, count: filtered.length },
    { key: "productos", label: "Productos", icon: PackageCheck, count: filtered.filter((p) => p.type === "product").length },
    { key: "servicios", label: "Servicios", icon: Wrench, count: filtered.filter((p) => p.type === "service").length },
  ];

  if (loading) return <CatalogSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">
            Catálogo
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {products.length} {products.length === 1 ? "elemento" : "elementos"} en el catálogo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 w-48 sm:w-64"
            />
          </div>
          <button onClick={handleNew} className="btn-primary">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Agregar Producto</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-[var(--bg-surface-3)] rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              activeTab === t.key
                ? "bg-[var(--bg-surface-1)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className="text-xs bg-[var(--bg-surface-2)] px-1.5 py-0.5 rounded text-[var(--text-tertiary)]">
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tabFiltered.length === 0 ? (
        <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-[var(--bg-surface-3)] flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-[var(--text-tertiary)]" />
          </div>
          <h3 className="text-lg font-semibold font-[family-name:var(--font-display)] mb-1">
            {search ? "Sin resultados" : "Catálogo vacío"}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-4">
            {search
              ? `No se encontraron elementos para "${search}"`
              : "Agrega tu primer producto o servicio para comenzar"}
          </p>
          {!search && (
            <button onClick={handleNew} className="btn-primary">
              <Plus className="h-4 w-4" />
              Agregar Producto
            </button>
          )}
        </GlassCard>
      ) : (
        <motion.div
          layout
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {tabFiltered.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <GlassCard
                hover
                glow={product.isActive ? "primary" : "none"}
                className="h-full flex flex-col"
              >
                <div
                  className={cn(
                    "h-40 rounded-t-[var(--radius-lg)] bg-gradient-to-br flex items-center justify-center relative -mx-0 -mt-0",
                    getGradient(product.name)
                  )}
                  style={{ marginTop: -1, marginLeft: -1, marginRight: -1 }}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover rounded-t-[var(--radius-lg)]"
                    />
                  ) : (
                    <span className="text-5xl font-bold text-white/20 font-[family-name:var(--font-display)]">
                      {getInitial(product.name)}
                    </span>
                  )}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={() => handleToggleActive(product)}
                      className={cn(
                        "w-9 h-5 rounded-full relative transition-colors",
                        product.isActive ? "bg-[var(--accent-success)]" : "bg-[var(--bg-surface-3)]"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                          product.isActive ? "left-[18px]" : "left-0.5"
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--text-primary)] truncate font-[family-name:var(--font-display)]">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-[var(--text-tertiary)] line-clamp-2 mt-0.5">
                          {product.description}
                        </p>
                      )}
                    </div>
                    <div className="group flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--accent-info)] hover:bg-[var(--bg-surface-3)] transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.12)] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-lg font-bold font-[family-name:var(--font-mono)] gradient-text">
                      {formatCOP(Number(product.price) || 0)}
                    </span>
                    <div className="flex items-center gap-2">
                      {product.categoryName && (
                        <Badge variant="gray" className="text-[10px] px-2 py-0.5">
                          {product.categoryName}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                    {product.type === "service" ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {product.duration || "--"} min
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Stock: {product.stock ?? "--"}
                      </span>
                    )}
                    <Badge
                      variant={product.isActive ? "green" : "gray"}
                      className="text-[10px] px-2 py-0.5"
                    >
                      {product.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Editar Producto" : "Agregar Producto"} maxWidth="max-w-xl">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombre"
              placeholder="Nombre del producto"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label="Precio (COP)"
              type="number"
              placeholder="50000"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>

          <div>
            <label className="text-[13px] text-[var(--text-secondary)] font-medium mb-1.5 block">
              Descripción
            </label>
            <textarea
              placeholder="Descripción del producto o servicio..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="text-[13px] text-[var(--text-secondary)] font-medium mb-1.5 block">
              Tipo
            </label>
            <div className="flex gap-3">
              {[
                { value: "product", label: "Producto", icon: PackageCheck },
                { value: "service", label: "Servicio", icon: Wrench },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm({ ...form, type: opt.value })}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all",
                    form.type === opt.value
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  )}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Categoría"
              placeholder="Ej: Electrónicos"
              value={form.categoryName}
              onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
            />
            <Input
              label="URL de Imagen"
              placeholder="https://..."
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </div>

          {form.type === "service" ? (
            <Input
              label="Duración (minutos)"
              type="number"
              placeholder="30"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            />
          ) : (
            <Input
              label="Stock"
              type="number"
              placeholder="100"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {editing ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-36 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-9 w-32" />
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass-card overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
