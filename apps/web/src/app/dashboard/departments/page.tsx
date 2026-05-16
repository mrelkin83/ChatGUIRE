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
  Building2, Users, Plus, Trash2, UserPlus, X,
  Search, Loader2, Shield, UserCheck, Crown,
  Hash, Layers
} from "lucide-react";

interface DepartmentMember {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string;
  agentStatus: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
  color: string;
  autoAssign: boolean;
  isActive: boolean;
  memberCount: number;
  members: DepartmentMember[];
  queueOrder?: number;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  agentStatus: string;
}

import { API_BASE, dfetch, getTenantId } from "@/lib/api";
const API = `${API_BASE}/api`;

const memberRoleColors: Record<string, string> = {
  owner: "var(--accent-amber)",
  admin: "var(--accent-info)",
  agent: "var(--accent-success)",
};

const deptColors = ["#6366F1", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#8B5CF6", "#14B8A6"];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", description: "", color: "#6366F1" });

  useEffect(() => {
    const id = getTenantId();
    if (id) {
      setTenantId(id);
      Promise.all([
        dfetch(`${API}/departments/${id}`).then((r) => r.json()),
        dfetch(`${API}/users/${id}`).then((r) => r.json()),
      ])
        .then(([deptsData, usersData]) => {
          setDepartments(Array.isArray(deptsData) ? deptsData : []);
          setUsers(Array.isArray(usersData) ? usersData : []);
        })
        .catch(() => toast.error("Error al cargar datos"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loadDepartments = async () => {
    try {
      const res = await dfetch(`${API}/departments/${tenantId}`);
      const data = await res.json();
      if (Array.isArray(data)) setDepartments(data);
    } catch {}
  };

  const handleCreateDepartment = async () => {
    if (!newDept.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const res = await dfetch(`${API}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          name: newDept.name,
          description: newDept.description,
          color: newDept.color,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Departamento creado");
      setShowCreateModal(false);
      setNewDept({ name: "", description: "", color: "#6366F1" });
      await loadDepartments();
    } catch {
      toast.error("Error al crear departamento");
    }
    setSaving(false);
  };

  const handleDeleteDepartment = async (deptId: string) => {
    try {
      const res = await dfetch(`${API}/departments/${deptId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDepartments(departments.filter((d) => d.id !== deptId));
      setShowManageModal(false);
      setShowDeleteConfirm(false);
      setSelectedDeptId(null);
      toast.success("Departamento eliminado");
    } catch {
      toast.error("Error al eliminar departamento");
    }
  };

  const handleAddMember = async (deptId: string, userId: string) => {
    try {
      const res = await dfetch(`${API}/departments/${deptId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: "agent" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Miembro agregado");
      await loadDepartments();
    } catch {
      toast.error("Error al agregar miembro");
    }
  };

  const handleRemoveMember = async (deptId: string, userId: string) => {
    try {
      const res = await dfetch(`${API}/departments/${deptId}/members/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Miembro removido");
      await loadDepartments();
    } catch {
      toast.error("Error al remover miembro");
    }
  };

  const selectedDept = departments.find((d) => d.id === selectedDeptId);
  const availableUsers = selectedDept
    ? users.filter((u) => !selectedDept.members.some((m) => m.userId === u.id))
    : [];

  if (loading) return <DepartmentsSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-display)]">
            Departamentos
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {departments.length} {departments.length === 1 ? "departamento" : "departamentos"}
          </p>
        </div>
        <button
          onClick={() => {
            setNewDept({ name: "", description: "", color: "#6366F1" });
            setShowCreateModal(true);
          }}
          className="btn-primary"
        >
          <Building2 className="h-4 w-4" />
          Crear Departamento
        </button>
      </div>

      {departments.length === 0 ? (
        <GlassCard className="p-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-[var(--bg-surface-3)] flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-[var(--text-tertiary)]" />
          </div>
          <h3 className="text-lg font-semibold font-[family-name:var(--font-display)] mb-1">
            No hay departamentos
          </h3>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-4">
            Organiza a tu equipo creando departamentos para Ventas, Soporte, Facturación y más
          </p>
          <button
            onClick={() => {
              setNewDept({ name: "", description: "", color: "#6366F1" });
              setShowCreateModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="h-4 w-4" />
            Crear Departamento
          </button>
        </GlassCard>
      ) : (
        <motion.div
          layout
          className="grid gap-5 lg:grid-cols-2"
        >
          {departments.map((dept, idx) => (
            <motion.div
              key={dept.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <GlassCard hover className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                    <div>
                      <h3 className="font-semibold font-[family-name:var(--font-display)]">
                        {dept.name}
                      </h3>
                      {dept.description && (
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 line-clamp-1">
                          {dept.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDeptId(dept.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.12)] transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {dept.memberCount} miembros
                  </span>
                  {dept.queueOrder != null && (
                    <span className="flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      Cola #{dept.queueOrder}
                    </span>
                  )}
                </div>

                {dept.members.length > 0 && (
                  <div className="flex items-center gap-1 mb-4">
                    <div className="flex -space-x-2">
                      {dept.members.slice(0, 5).map((m) => (
                        <div
                          key={m.id}
                          className="h-7 w-7 rounded-full border-2 border-[var(--bg-surface-2)] flex items-center justify-center text-[9px] font-bold text-white"
                          style={{
                            background: `linear-gradient(135deg, ${dept.color}, ${
                              memberRoleColors[m.role] || "var(--bg-surface-3)"
                            })`,
                          }}
                          title={m.name}
                        >
                          {getInitials(m.name)}
                        </div>
                      ))}
                      {dept.members.length > 5 && (
                        <div className="h-7 w-7 rounded-full border-2 border-[var(--bg-surface-2)] bg-[var(--bg-surface-3)] flex items-center justify-center text-[9px] font-bold text-[var(--text-tertiary)]">
                          +{dept.members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedDeptId(dept.id);
                    setShowManageModal(true);
                  }}
                  className="btn-secondary w-full text-sm"
                >
                  <Users className="h-4 w-4" />
                  Gestionar Miembros
                </button>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Crear Departamento">
        <div className="space-y-4">
          <Input
            label="Nombre"
            placeholder="Ventas, Soporte, Facturación..."
            value={newDept.name}
            onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
          />
          <div>
            <label className="text-[13px] text-[var(--text-secondary)] font-medium mb-1.5 block">
              Descripción
            </label>
            <textarea
              placeholder="Departamento encargado de..."
              value={newDept.description}
              onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
              rows={3}
              className="input-field resize-none"
            />
          </div>
          <div>
            <label className="text-[13px] text-[var(--text-secondary)] font-medium mb-1.5 block">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {deptColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewDept({ ...newDept, color })}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    newDept.color === color
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-surface-2)] scale-110"
                      : "hover:scale-105"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={saving} onClick={handleCreateDepartment}>
              <Plus className="h-4 w-4" />
              Crear Departamento
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showManageModal}
        onClose={() => {
          setShowManageModal(false);
          setSelectedDeptId(null);
          setShowDeleteConfirm(false);
        }}
        title={selectedDept ? selectedDept.name : "Gestionar Miembros"}
        maxWidth="max-w-xl"
      >
        {selectedDept && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-[var(--border-subtle)]">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedDept.color }} />
              <div>
                <p className="font-semibold font-[family-name:var(--font-display)]">{selectedDept.name}</p>
                {selectedDept.description && (
                  <p className="text-xs text-[var(--text-tertiary)]">{selectedDept.description}</p>
                )}
              </div>
              <span className="ml-auto text-xs text-[var(--text-tertiary)]">
                {selectedDept.members.length} miembros
              </span>
            </div>

            {selectedDept.members.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">
                  Miembros Actuales
                </p>
                {selectedDept.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--bg-surface-1)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[#8B5CF6] flex items-center justify-center text-[10px] font-bold text-white">
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{member.email}</p>
                      </div>
                      <Badge
                        variant={member.role === "owner" ? "amber" : member.role === "admin" ? "blue" : "green"}
                        className="text-[10px]"
                      >
                        {member.role === "owner" ? "Propietario" : member.role === "admin" ? "Admin" : "Agente"}
                      </Badge>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(selectedDept.id, member.userId)}
                      className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.12)] transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4 bg-[var(--bg-surface-1)] rounded-lg">
                No hay miembros en este departamento
              </p>
            )}

            {availableUsers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-wider">
                  Agregar Agentes
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAddMember(selectedDept.id, user.id)}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-1)] hover:border-[var(--accent-success)]/30 hover:bg-[rgba(16,185,129,0.04)] transition-all text-left"
                    >
                      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[#8B5CF6] flex items-center justify-center text-[9px] font-bold text-white">
                        {getInitials(user.fullName)}
                      </div>
                      <span className="text-sm flex-1">{user.fullName}</span>
                      <span className="text-[10px] text-[var(--text-tertiary)]">{user.role}</span>
                      <Plus className="h-4 w-4 text-[var(--accent-success)]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showDeleteConfirm && (
              <div className="p-4 rounded-lg border border-[rgba(239,68,68,0.20)] bg-[rgba(239,68,68,0.06)] space-y-3">
                <p className="text-sm text-[var(--accent-danger)] font-medium">
                  Eliminar este departamento
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Esta acción no se puede deshacer. Los miembros no serán eliminados del sistema.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleDeleteDepartment(selectedDept.id)}
                    className="btn-danger text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              {!showDeleteConfirm && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-ghost text-sm text-[var(--accent-danger)] hover:bg-[rgba(239,68,68,0.12)]"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar Departamento
                </button>
              )}
              <button
                onClick={() => {
                  setShowManageModal(false);
                  setSelectedDeptId(null);
                  setShowDeleteConfirm(false);
                }}
                className="btn-secondary ml-auto"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DepartmentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-5 space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-60" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
