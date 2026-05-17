"use client";

import { useState, useEffect } from "react";
import { API_BASE, dfetch, getTenantId } from "@/lib/api";
import { 
  UserPlus, Mail, Shield, Crown, UserCheck, UserCircle, 
  Plus, Users, Building2, Trash2, Edit2, X, Loader2,
  Circle, CircleDot, CircleOff, Clock
} from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: string;
  agentStatus: string;
  isActive: boolean;
  currentChatCount: number;
  maxConcurrentChats: number;
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
}

interface DepartmentMember {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string;
  agentStatus: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "departments">("members");
  const [showAddDept, setShowAddDept] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("agent");
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [newDeptColor, setNewDeptColor] = useState("#6366F1");
  const [saving, setSaving] = useState(false);
  const [showDeptMembers, setShowDeptMembers] = useState<string | null>(null);
  const [showAddDeptMember, setShowAddDeptMember] = useState<string | null>(null);

  useEffect(() => {
    const id = getTenantId();
    if (id) {
      setTenantId(id);
      Promise.all([
        dfetch(`${API_BASE}/api/users/${id}`).then((r) => r.json()),
        dfetch(`${API_BASE}/api/departments/${id}`).then((r) => r.json()),
      ])
        .then(([usersData, deptsData]) => {
          setMembers(Array.isArray(usersData) ? usersData : []);
          setDepartments(Array.isArray(deptsData) ? deptsData : []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleCreateDepartment = async () => {
    if (!newDeptName) return;
    setSaving(true);
    try {
      const res = await dfetch(`${API_BASE}/api/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          name: newDeptName,
          description: newDeptDesc,
          color: newDeptColor,
        }),
      });
      if (res.ok) {
        const dept = await res.json();
        setDepartments([...departments, { ...dept, memberCount: 0, members: [] }]);
        setNewDeptName("");
        setNewDeptDesc("");
        setShowAddDept(false);
      }
    } catch {}
    setSaving(false);
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await dfetch(`${API_BASE}/api/departments/${id}`, { method: "DELETE" });
      setDepartments(departments.filter((d) => d.id !== id));
    } catch {}
  };

  const handleUpdateAgentStatus = async (userId: string, status: string) => {
    try {
      await dfetch(`${API_BASE}/api/users/${userId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setMembers(members.map(m => m.id === userId ? { ...m, agentStatus: status } : m));
    } catch {}
  };

  const handleInviteMember = async () => {
    if (!newMemberName || !newMemberEmail || !tenantId) return;
    setSaving(true);
    try {
      const res = await dfetch(`${API_BASE}/api/users/${tenantId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: newMemberName, email: newMemberEmail, role: newMemberRole }),
      });
      if (res.ok) {
        const user = await res.json();
        setMembers([...members, { ...user, agentStatus: "offline", currentChatCount: 0, maxConcurrentChats: 5 }]);
        setNewMemberName("");
        setNewMemberEmail("");
        setNewMemberRole("agent");
        setShowAddMember(false);
      }
    } catch {}
    setSaving(false);
  };

  const handleAddDeptMember = async (deptId: string, userId: string) => {
    try {
      await dfetch(`${API_BASE}/api/departments/${deptId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const deptsRes = await dfetch(`${API_BASE}/api/departments/${tenantId}`);
      const deptsData = await deptsRes.json();
      if (Array.isArray(deptsData)) setDepartments(deptsData);
      setShowAddDeptMember(null);
    } catch {}
  };

  const handleRemoveDeptMember = async (deptId: string, memberId: string) => {
    try {
      await dfetch(`${API_BASE}/api/departments/${deptId}/members/${memberId}`, { method: "DELETE" });
      const deptsRes = await dfetch(`${API_BASE}/api/departments/${tenantId}`);
      const deptsData = await deptsRes.json();
      if (Array.isArray(deptsData)) setDepartments(deptsData);
    } catch {}
  };

  const roleConfig: Record<string, { label: string; icon: any; cls: string }> = {
    owner: { label: "Propietario", icon: Crown, cls: "badge-amber" },
    admin: { label: "Admin", icon: Shield, cls: "badge-blue" },
    agent: { label: "Agente", icon: UserCheck, cls: "badge-green" },
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    available: { label: "Disponible", color: "#22c55e", icon: CircleDot },
    busy: { label: "Ocupado", color: "#f59e0b", icon: Circle },
    away: { label: "Ausente", color: "#8b8b9e", icon: Clock },
    offline: { label: "Offline", color: "#5a5a6e", icon: CircleOff },
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#f59e0b] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="mt-1 text-sm text-[#8b8b9e]">Gestiona agentes y departamentos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddMember(true)} className="btn-primary flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invitar Agente
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#161822] rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "members" ? "bg-[#252536] text-white" : "text-[#8b8b9e] hover:text-white"
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Agentes ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("departments")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "departments" ? "bg-[#252536] text-white" : "text-[#8b8b9e] hover:text-white"
          }`}
        >
          <Building2 className="h-4 w-4 inline mr-2" />
          Departamentos ({departments.length})
        </button>
      </div>

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#252536] text-left text-xs font-semibold uppercase tracking-wider text-[#8b8b9e]">
                  <th className="px-6 py-3">Agente</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Rol</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3">Chats</th>
                  <th className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252536]">
                {members.map((member) => {
                  const role = roleConfig[member.role] || { label: member.role, icon: UserCircle, cls: "badge-gray" };
                  const status = statusConfig[member.agentStatus] || statusConfig.offline;
                  return (
                    <tr key={member.id} className="table-row">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] text-sm font-bold">
                            {member.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{member.fullName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#8b8b9e]">{member.email}</td>
                      <td className="px-6 py-4">
                        <span className={`badge ${role.cls} flex items-center gap-1 w-fit`}>
                          <role.icon className="h-3 w-3" />
                          {role.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={member.agentStatus}
                          onChange={(e) => handleUpdateAgentStatus(member.id, e.target.value)}
                          className="input-field text-sm py-1 px-2"
                        >
                          <option value="available">Disponible</option>
                          <option value="busy">Ocupado</option>
                          <option value="away">Ausente</option>
                          <option value="offline">Offline</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#8b8b9e]">
                        {member.currentChatCount}/{member.maxConcurrentChats}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          <button className="p-1.5 rounded hover:bg-[#252536] text-[#8b8b9e]">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {members.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-[#8b8b9e]">No hay agentes en el equipo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Departments Tab */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAddDept(true)} className="btn-secondary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Departamento
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {departments.map((dept) => (
              <div key={dept.id} className="glass-card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                    <div>
                      <h3 className="font-semibold">{dept.name}</h3>
                      {dept.description && (
                        <p className="text-xs text-[#5a5a6e] mt-0.5">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDepartment(dept.id)}
                    className="p-1.5 rounded hover:bg-[#ef4444]/10 text-[#5a5a6e] hover:text-[#ef4444]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#8b8b9e] mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {dept.memberCount} miembros
                  </span>
                  <span className={`flex items-center gap-1 ${dept.autoAssign ? 'text-[#22c55e]' : 'text-[#5a5a6e]'}`}>
                    <CircleDot className="h-3 w-3" />
                    Auto-asignaciÃ³n {dept.autoAssign ? 'activa' : 'inactiva'}
                  </span>
                  <button onClick={() => setShowDeptMembers(dept.id)} className="ml-auto text-[#3b82f6] hover:underline flex items-center gap-1">
                    <UserPlus className="h-3 w-3" />
                    Gestionar
                  </button>
                </div>

                {dept.members.length > 0 && (
                  <div className="space-y-1.5">
                    {dept.members.slice(0, 3).map((member) => {
                      const status = statusConfig[member.agentStatus] || statusConfig.offline;
                      return (
                        <div key={member.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-[#161822]">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
                            <span className="text-xs">{member.name}</span>
                          </div>
                          <span className="text-xs text-[#5a5a6e]">{member.role}</span>
                        </div>
                      );
                    })}
                    {dept.members.length > 3 && (
                      <p className="text-xs text-[#5a5a6e] text-center">+{dept.members.length - 3} mÃ¡s</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {departments.length === 0 && (
              <div className="col-span-2 glass-card p-8 text-center">
                <Building2 className="h-10 w-10 mx-auto text-[#5a5a6e] mb-3" />
                <p className="text-sm text-[#8b8b9e]">No hay departamentos creados</p>
                <p className="text-xs text-[#5a5a6e] mt-1">Crea departamentos para organizar a tu equipo</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Nuevo Departamento</h3>
              <button onClick={() => setShowAddDept(false)} className="text-[#8b8b9e] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8b8b9e] mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Ventas, Soporte, FacturaciÃ³n..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-[#8b8b9e] mb-1.5">DescripciÃ³n</label>
                <input
                  type="text"
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  placeholder="Departamento encargado de..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-[#8b8b9e] mb-1.5">Color</label>
                <div className="flex gap-2">
                  {['#6366F1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewDeptColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newDeptColor === color ? 'border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowAddDept(false)} className="btn-secondary">Cancelar</button>
                <button
                  onClick={handleCreateDepartment}
                  disabled={saving || !newDeptName}
                  className="btn-primary flex items-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Crear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showAddMember && (
        <div className="modal-backdrop" onClick={() => setShowAddMember(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold">Invitar Agente</h3>
              <button onClick={() => setShowAddMember(false)} className="text-[#8b8b9e] hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="MarÃ­a GarcÃ­a" className="input-field" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="maria@ejemplo.com" className="input-field" />
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} className="input-field">
                  <option value="agent">Agente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAddMember(false)} className="btn-secondary">Cancelar</button>
                <button onClick={handleInviteMember} disabled={saving || !newMemberName || !newMemberEmail} className="btn-primary disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Invitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Members Modal */}
      {showDeptMembers && (() => {
        const dept = departments.find((d) => d.id === showDeptMembers);
        if (!dept) return null;
        const availableToAdd = members.filter((m) => !dept.members.some((dm) => dm.userId === m.id));
        return (
          <div className="modal-backdrop" onClick={() => setShowDeptMembers(null)}>
            <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                  <h3 className="text-lg font-semibold">{dept.name}</h3>
                </div>
                <button onClick={() => setShowDeptMembers(null)} className="text-[#8b8b9e] hover:text-white"><X className="h-5 w-5" /></button>
              </div>

              {dept.members.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-[#5a5a6e] font-medium uppercase">Miembros actuales</p>
                  {dept.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#161822]">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: statusConfig[member.agentStatus]?.color || "#5a5a6e" }} />
                        <span className="text-sm">{member.name}</span>
                        <span className="text-[10px] text-[#5a5a6e]">{member.role}</span>
                      </div>
                      <button onClick={() => handleRemoveDeptMember(dept.id, member.id)} className="p-1 rounded text-[#8b8b9e] hover:text-[#ef4444] hover:bg-[#ef4444]/10">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {availableToAdd.length > 0 && (
                <div>
                  <p className="text-xs text-[#5a5a6e] font-medium uppercase mb-2">Agregar agentes</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {availableToAdd.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => handleAddDeptMember(dept.id, member.id)}
                        className="w-full flex items-center gap-2 py-2 px-3 rounded-lg border border-[#252536] bg-[#0f0f16] hover:border-[#22c55e]/30 hover:bg-[#22c55e]/5 transition-all text-left"
                      >
                        <Plus className="h-3.5 w-3.5 text-[#22c55e]" />
                        <span className="text-sm">{member.fullName}</span>
                        <span className="text-[10px] text-[#5a5a6e] ml-auto">{member.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {dept.members.length === 0 && availableToAdd.length === 0 && (
                <p className="text-sm text-[#8b8b9e] text-center py-4">No hay agentes para agregar. Invita agentes primero.</p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
