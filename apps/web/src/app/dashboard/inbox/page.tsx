"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatRelativeTime, formatCOP } from "@/lib/utils";
import {
  Search,
  Send,
  Phone,
  User,
  ChevronLeft,
  ArrowRightLeft,
  XCircle,
  Filter,
  Users,
  Bot,
  UserCheck,
  X,
  Loader2,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  Mail,
  Tag,
  ShoppingBag,
  CalendarDays,
  TrendingUp,
  MessageSquare,
  Clock,
  Hash,
  Sparkles,
  AlertCircle,
  Inbox,
} from "lucide-react";

import { API_BASE, dfetch, getTenantId } from "@/lib/api";
import { useInboxSSE } from "@/hooks/useInboxSSE";
const API = `${API_BASE}/api`;

interface Conversation {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  channel: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
  status: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  senderType?: string;
  content: { type: string; text: string };
  timestamp: string;
}

interface Agent {
  id: string;
  fullName: string;
  agentStatus: string;
  currentChatCount: number;
}

interface CustomerProfile {
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  channel: string;
  tags: string[];
  orders: { id: string; amount: number; status: string }[];
  appointments: { id: string; date: string; service: string; status: string }[];
  metrics: {
    totalOrders: number;
    totalSpent: number;
    lastActivity: string;
  };
}

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  instagram: "#E1306C",
  facebook: "#1877F2",
  tiktok: "#FE2C55",
};

const AVATAR_GRADIENTS = [
  "from-indigo-500 to-purple-500",
  "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-cyan-500 to-blue-500",
  "from-violet-500 to-fuchsia-500",
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

type FilterTab = "all" | "unread" | "ai" | "agent";
type MobileView = "list" | "chat" | "profile";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.04 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: "tween", ease: [0.4, 0, 0.2, 1], duration: 0.35 },
  },
};

const msgVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.04, type: "tween" as const, ease: [0.4, 0, 0.2, 1] as const, duration: 0.3 },
  }),
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showProfile, setShowProfile] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [isTyping, setIsTyping] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchData = useCallback(async (tid: string) => {
    try {
      const [convRes, agentsRes] = await Promise.all([
        dfetch(`${API}/conversations/${tid}`),
        dfetch(`${API}/users/${tid}`),
      ]);
      const convData = await convRes.json();
      const agentsData = await agentsRes.json();
      setConversations(Array.isArray(convData) ? convData : []);
      setAgents(Array.isArray(agentsData) ? agentsData : []);
    } catch {}
  }, []);

  useEffect(() => {
    const id = getTenantId();
    if (id) {
      setTenantId(id);
      fetchData(id).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchData]);

  // SSE para actualizaciones en tiempo real — fallback a polling cada 30s
  useInboxSSE({
    onMessage: (msg) => {
      if (!msg.conversationId) return;
      setMessagesMap((prev) => ({
        ...prev,
        [msg.conversationId]: [...(prev[msg.conversationId] || []), msg as any],
      }));
      if (tenantId) fetchData(tenantId);
    },
    onStatus: () => {
      if (tenantId) fetchData(tenantId);
    },
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      if (tenantId) await fetchData(tenantId);
    }, 30000);
    return () => clearInterval(interval);
  }, [tenantId, fetchData]);

  useEffect(() => {
    if (!selectedId || !tenantId) return;
    setCustomerProfile(null);
    dfetch(`${API}/conversations/${tenantId}/${selectedId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        const msgs = Array.isArray(data) ? data : [];
        setMessagesMap((prev) => ({ ...prev, [selectedId]: msgs }));
      })
      .catch(() => {});
    // Load customer profile
    const conv = conversations.find((c) => c.id === selectedId);
    if (conv?.customerId) {
      dfetch(`${API}/customers/${tenantId}/${conv.customerId}/profile`)
        .then((r) => r.json())
        .then((p) => setCustomerProfile(p))
        .catch(() => {});
    }
  }, [selectedId, tenantId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesMap, selectedId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [newMessage]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedId || !tenantId || sending) return;
    const text = newMessage.trim();
    setNewMessage("");
    setSending(true);
    try {
      await dfetch(`${API}/conversations/${tenantId}/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, senderType: "agent" }),
      });
      const r = await dfetch(`${API}/conversations/${tenantId}/${selectedId}/messages`);
      const data = await r.json();
      setMessagesMap((prev) => ({
        ...prev,
        [selectedId!]: Array.isArray(data) ? data : [],
      }));
    } catch {}
    setSending(false);
  };

  const handleTransfer = async (toAgentId: string) => {
    if (!selectedId || !tenantId) return;
    setTransferring(true);
    try {
      await dfetch(`${API}/conversations/${tenantId}/${selectedId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toAgentId }),
      });
      setShowTransfer(false);
      await fetchData(tenantId);
    } catch {}
    setTransferring(false);
  };

  const handleClose = async () => {
    if (!selectedId || !tenantId) return;
    try {
      await dfetch(`${API}/conversations/${tenantId}/${selectedId}/close`, { method: "POST" });
      await fetchData(tenantId);
      setSelectedId(null);
      setMobileView("list");
    } catch {}
  };

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setMobileView("chat");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filtered = conversations
    .filter((c) => {
      if (filterTab === "unread") return c.unread > 0;
      if (filterTab === "ai") return !c.assignedAgentId;
      if (filterTab === "agent") return !!c.assignedAgentId;
      return true;
    })
    .filter((c) => c.customerName?.toLowerCase().includes(search.toLowerCase()));

  const selected = conversations.find((c) => c.id === selectedId);
  const currentMessages = selectedId ? messagesMap[selectedId] || [] : [];
  const assignedAgent = selected?.assignedAgentId
    ? agents.find((a) => a.id === selected.assignedAgentId)
    : null;

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread || 0), 0);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          className="h-10 w-10 rounded-full border-2 border-t-transparent"
          style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-140px)] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface-1)]">
      {/* ===== COLUMN 1: CONVERSATION LIST ===== */}
      <div
        className={cn(
          "w-full shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface-1)] md:w-[340px]",
          mobileView === "list" ? "flex" : "hidden md:flex"
        )}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2
                className="text-xl font-bold tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Inbox
              </h2>
              {totalUnread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                  style={{ background: "var(--accent-primary)" }}
                >
                  {totalUnread}
                </motion.span>
              )}
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--bg-surface-3)]"
              style={{ color: "var(--text-secondary)" }}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--text-tertiary)" }}
            />
            <input
              type="text"
              placeholder="Buscar conversación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 text-sm"
              style={{ background: "var(--bg-surface-2)" }}
            />
          </div>

          {/* Tab bar */}
          <div
            className="flex gap-1 rounded-lg p-1"
            style={{ background: "var(--bg-surface-2)" }}
          >
            {(
              [
                { key: "all", label: "Todos" },
                { key: "unread", label: "Sin leer" },
                { key: "ai", label: "IA" },
                { key: "agent", label: "Agente" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  filterTab === tab.key
                    ? "text-white shadow-sm"
                    : "hover:text-[var(--text-secondary)]"
                )}
                style={
                  filterTab === tab.key
                    ? { background: "var(--accent-primary)", color: "#fff" }
                    : { color: "var(--text-tertiary)" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {filtered.length > 0 ? (
              <motion.div
                key="list"
                variants={staggerContainer}
                initial="hidden"
                animate="show"
              >
                {filtered.map((conv) => {
                  const isActive = selectedId === conv.id;
                  const gradient = getGradient(conv.customerName || "");
                  const channelColor = CHANNEL_COLORS[conv.channel] || "var(--text-tertiary)";

                  return (
                    <motion.button
                      key={conv.id}
                      variants={staggerItem}
                      layout
                      layoutId={`conv-${conv.id}`}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={cn(
                        "group relative flex w-full items-center gap-3 px-5 py-3.5 text-left transition-all duration-200",
                        isActive
                          ? "border-l-2"
                          : "border-l-2 border-l-transparent hover:bg-[var(--bg-surface-2)]"
                      )}
                      style={
                        isActive
                          ? {
                              background: "var(--bg-surface-3)",
                              borderLeftColor: "var(--accent-primary)",
                            }
                          : undefined
                      }
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white",
                            gradient
                          )}
                        >
                          {conv.customerName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2"
                          style={{
                            background: channelColor,
                            borderColor: "var(--bg-surface-1)",
                          }}
                        />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              conv.unread > 0
                                ? "font-semibold"
                                : "font-medium"
                            )}
                            style={{ color: "var(--text-primary)" }}
                          >
                            {conv.customerName}
                          </span>
                          <span
                            className="shrink-0 text-[11px]"
                            style={{ color: "var(--text-tertiary)" }}
                          >
                            {formatRelativeTime(conv.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p
                            className="truncate text-xs"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {conv.lastMessage}
                          </p>
                          {conv.unread > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                              className="flex h-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                              style={{ background: "var(--accent-primary)" }}
                            >
                              {conv.unread}
                            </motion.span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {conv.assignedAgentId ? (
                            <span
                              className="flex items-center gap-1 text-[10px]"
                              style={{ color: "var(--accent-primary)" }}
                            >
                              <UserCheck className="h-3 w-3" />
                              {conv.assignedAgentName || "Agente"}
                            </span>
                          ) : (
                            <span
                              className="flex items-center gap-1 text-[10px]"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              <Bot className="h-3 w-3" />
                              IA
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 px-6"
              >
                <div
                  className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: "var(--bg-surface-3)" }}
                >
                  <Inbox className="h-7 w-7" style={{ color: "var(--text-tertiary)" }} />
                </div>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  No hay conversaciones
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {search ? "Intenta con otra búsqueda" : "Las nuevas conversaciones aparecerán aquí"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===== COLUMN 2: CONVERSATION PANEL ===== */}
      <div
        className={cn(
          "flex-1 flex-col bg-[var(--bg-root)] min-w-0",
          mobileView === "chat" ? "flex" : "hidden md:flex"
        )}
      >
        {selected ? (
          <>
            {/* Chat Header */}
            <div
              className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3 md:px-6"
              style={{ background: "var(--bg-surface-1)" }}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileView("list")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--bg-surface-3)] md:hidden"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white",
                    getGradient(selected.customerName || "")
                  )}
                >
                  {selected.customerName?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {selected.customerName}
                  </p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: CHANNEL_COLORS[selected.channel] || "var(--text-tertiary)" }}
                    />
                    <span className="uppercase">{selected.channel}</span>
                    {assignedAgent ? (
                      <span className="badge-primary badge text-[10px]">
                        <UserCheck className="h-3 w-3" />
                        {assignedAgent.fullName}
                      </span>
                    ) : (
                      <span
                        className="flex items-center gap-1 text-[10px] font-medium"
                        style={{ color: "var(--accent-primary)" }}
                      >
                        <Sparkles className="h-3 w-3" />
                        IA
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMobileView("profile")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--bg-surface-3)] md:hidden"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <User className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="hidden h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--bg-surface-3)] md:flex"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {showProfile ? (
                    <PanelRightClose className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setShowTransfer(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--bg-surface-3)]"
                  style={{ color: "var(--text-secondary)" }}
                  title="Transferir"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:bg-red-500/10"
                  style={{ color: "var(--text-secondary)" }}
                  title="Cerrar conversación"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
              <AnimatePresence mode="popLayout">
                {currentMessages.length > 0 ? (
                  <div className="space-y-3">
                    {currentMessages.map((msg, i) => {
                      const isCustomer = msg.direction === "inbound";
                      const isSystem = msg.senderType === "system";

                      if (isSystem) {
                        return (
                          <motion.div
                            key={msg.id}
                            custom={i}
                            variants={msgVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex justify-center"
                          >
                            <span
                              className="rounded-full px-4 py-1 text-[11px] italic"
                              style={{
                                color: "var(--text-tertiary)",
                                background: "var(--bg-surface-2)",
                              }}
                            >
                              {msg.content?.text || ""}
                            </span>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={msg.id}
                          custom={i}
                          variants={msgVariants}
                          initial="hidden"
                          animate="visible"
                          className={cn("flex", isCustomer ? "justify-start" : "justify-end")}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm md:max-w-[70%]",
                              isCustomer
                                ? "rounded-bl-md"
                                : "rounded-br-md"
                            )}
                            style={
                              isCustomer
                                ? {
                                    background: "var(--bg-surface-2)",
                                    color: "var(--text-primary)",
                                    border: "1px solid var(--border-subtle)",
                                  }
                                : {
                                    background:
                                      "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)",
                                    color: "var(--text-primary)",
                                    border: "1px solid rgba(99,102,241,0.15)",
                                  }
                            }
                          >
                            {!isCustomer && msg.senderType === "agent" && (
                              <p className="mb-0.5 text-[10px] font-medium" style={{ color: "var(--accent-primary)" }}>
                                Tú
                              </p>
                            )}
                            {!isCustomer && msg.senderType === "ai" && (
                              <p className="mb-0.5 flex items-center gap-1 text-[10px] font-medium" style={{ color: "var(--accent-primary)" }}>
                                <Sparkles className="h-2.5 w-2.5" />
                                IA
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words leading-relaxed">
                              {msg.content?.text || ""}
                            </p>
                            <p
                              className="mt-1 text-right text-[10px]"
                              style={{
                                color: isCustomer
                                  ? "var(--text-tertiary)"
                                  : "rgba(99,102,241,0.5)",
                              }}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString("es-CO", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Typing indicator */}
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div
                          className="flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3"
                          style={{
                            background: "var(--bg-surface-2)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <span className="typing-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--text-tertiary)" }} />
                          <span className="typing-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--text-tertiary)" }} />
                          <span className="typing-dot h-1.5 w-1.5 rounded-full" style={{ background: "var(--text-tertiary)" }} />
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <motion.div
                    key="empty-msgs"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full flex-col items-center justify-center"
                  >
                    <div
                      className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl"
                      style={{ background: "var(--bg-surface-2)" }}
                    >
                      <MessageSquare className="h-8 w-8" style={{ color: "var(--text-tertiary)" }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                      Sin mensajes aún
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      Envía el primer mensaje a {selected.customerName}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div
              className="shrink-0 border-t border-[var(--border-subtle)] p-3 md:p-4"
              style={{ background: "var(--bg-surface-1)" }}
            >
              <div className="flex items-end gap-2">
                <button
                  className="mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--bg-surface-3)]"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <div
                  className="relative flex-1 overflow-hidden rounded-xl border transition-all duration-200 focus-within:border-[var(--accent-primary)] focus-within:shadow-[0_0_0_3px_var(--accent-primary-subtle)]"
                  style={{
                    background: "var(--bg-surface-2)",
                    borderColor: "var(--border-default)",
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..."
                    rows={1}
                    className="w-full resize-none bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-[var(--text-tertiary)]"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-primary)",
                      maxHeight: "120px",
                    }}
                  />
                </div>
                <motion.button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="mb-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: newMessage.trim() ? "var(--accent-primary)" : "var(--bg-surface-3)",
                    color: newMessage.trim() ? "#fff" : "var(--text-tertiary)",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl"
                style={{ background: "var(--bg-surface-2)" }}
              >
                <MessageSquare className="h-10 w-10" style={{ color: "var(--text-tertiary)" }} />
              </div>
              <p className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>
                Selecciona una conversación
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
                Elige una conversación de la lista para empezar a chatear
              </p>
            </motion.div>
          </div>
        )}
      </div>

      {/* ===== COLUMN 3: CUSTOMER PROFILE ===== */}
      <div
        className={cn(
          "w-full shrink-0 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-surface-1)] md:w-[320px]",
          mobileView === "profile" ? "flex" : "hidden md:flex",
          !showProfile && "hidden"
        )}
      >
        {selected ? (
          <>
            {/* Profile Header */}
            <div
              className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4"
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Perfil del cliente
              </span>
              <button
                onClick={() => {
                  setMobileView("chat");
                  setShowProfile(false);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--bg-surface-3)]"
                style={{ color: "var(--text-tertiary)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Avatar + Name */}
              <div className="px-5 py-6 text-center">
                <div
                  className={cn(
                    "mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-xl font-bold text-white",
                    getGradient(selected.customerName || "")
                  )}
                >
                  {selected.customerName?.charAt(0)?.toUpperCase()}
                </div>
                <h3
                  className="text-base font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {selected.customerName}
                </h3>
                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <div
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: `${CHANNEL_COLORS[selected.channel] || "var(--text-tertiary)"}20`,
                      color: CHANNEL_COLORS[selected.channel] || "var(--text-tertiary)",
                    }}
                  >
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: CHANNEL_COLORS[selected.channel] }}
                    />
                    {selected.channel}
                  </div>
                </div>
              </div>

              {/* Contact Section */}
              <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                <h4
                  className="mb-3 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Contacto
                </h4>
                <div className="space-y-2.5">
                  {selected.customerPhone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-3.5 w-3.5" style={{ color: "var(--text-tertiary)" }} />
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                        {selected.customerPhone}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Mail className="h-3.5 w-3.5" style={{ color: "var(--text-tertiary)" }} />
                    <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                      Sin email
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                <h4
                  className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  Pedidos recientes
                </h4>
                {customerProfile?.orders?.length ? (
                  <div className="space-y-1.5">
                    {customerProfile.orders.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: "var(--bg-surface-2)" }}>
                        <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>#{o.orderNumber}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{formatCOP(o.amount)}</span>
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", o.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400")}>{o.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface-2)" }}>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Sin pedidos registrados</p>
                  </div>
                )}
              </div>

              {/* Appointments */}
              <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                <h4
                  className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Próxima cita
                </h4>
                {customerProfile?.appointments?.length ? (
                  <div className="space-y-1.5">
                    {customerProfile.appointments.slice(0, 2).map((a) => (
                      <div key={a.id} className="rounded-lg px-3 py-2" style={{ background: "var(--bg-surface-2)" }}>
                        <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{a.service}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                          {new Date(a.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface-2)" }}>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Sin citas programadas</p>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                <h4
                  className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <Tag className="h-3.5 w-3.5" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {customerProfile?.tags?.length ? (
                    customerProfile.tags.map((tag, i) => (
                      <span key={i} className="badge badge-primary text-[10px]">{tag}</span>
                    ))
                  ) : (
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Sin etiquetas</span>
                  )}
                </div>
              </div>

              {/* Metrics */}
              <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                <h4
                  className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Métricas
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface-2)" }}>
                    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                      {customerProfile?.metrics?.totalOrders ?? 0}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Pedidos</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface-2)" }}>
                    <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                      {customerProfile ? formatCOP(customerProfile.metrics.totalSpent) : "$0"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Gasto</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ background: "var(--bg-surface-2)" }}>
                    <p className="text-lg font-bold" style={{ color: "var(--accent-primary)" }}>
                      {customerProfile?.metrics?.lastActivity
                        ? formatRelativeTime(customerProfile.metrics.lastActivity)
                        : "--"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Última</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <User className="mb-3 h-10 w-10" style={{ color: "var(--text-tertiary)" }} />
            <p className="text-sm text-center" style={{ color: "var(--text-tertiary)" }}>
              Selecciona una conversación para ver el perfil del cliente
            </p>
          </div>
        )}
      </div>

      {/* ===== TRANSFER MODAL ===== */}
      <AnimatePresence>
        {showTransfer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            onClick={() => setShowTransfer(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="modal-content max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  Transferir conversación
                </h3>
                <button
                  onClick={() => setShowTransfer(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:bg-[var(--bg-surface-3)]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-2">
                {agents
                  .filter((a) => a.agentStatus === "available")
                  .map((agent) => (
                    <motion.button
                      key={agent.id}
                      onClick={() => handleTransfer(agent.id)}
                      disabled={transferring}
                      className="flex w-full items-center gap-3 rounded-xl p-3 transition-all duration-200 disabled:opacity-50"
                      style={{
                        background: "var(--bg-surface-2)",
                        border: "1px solid var(--border-subtle)",
                      }}
                      whileHover={{
                        borderColor: "rgba(99,102,241,0.3)",
                        backgroundColor: "rgba(99,102,241,0.05)",
                      }}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white",
                          getGradient(agent.fullName)
                        )}
                      >
                        {agent.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {agent.fullName}
                        </p>
                        <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                          {agent.currentChatCount} chats activos
                        </p>
                      </div>
                      <UserCheck className="h-4 w-4" style={{ color: "var(--accent-success)" }} />
                    </motion.button>
                  ))}
                {agents.filter((a) => a.agentStatus === "available").length === 0 && (
                  <div className="py-8 text-center">
                    <AlertCircle
                      className="mx-auto mb-2 h-8 w-8"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      No hay agentes disponibles
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
