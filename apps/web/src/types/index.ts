export interface Conversation {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  channel: "whatsapp" | "instagram" | "facebook" | "tiktok";
  status: "open" | "closed" | "pending";
  assignedAgentId: string | null;
  agentName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  kanbanColumnId: string | null;
  potentialValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  senderType: "customer" | "ai" | "agent" | "system";
  senderName?: string;
  timestamp: string;
  mediaUrl?: string;
  mediaType?: string;
}

export interface Campaign {
  id: string;
  name: string;
  listId: string;
  listName?: string;
  messages: { text: string; active: boolean }[];
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";
  scheduledAt: string | null;
  recurrence: string;
  totalContacts: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string;
}

export interface ContactList {
  id: string;
  name: string;
  description: string;
  contactCount: number;
  createdAt: string;
}

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isFinal: boolean;
}

export interface KPIData {
  label: string;
  value: number;
  change?: number;
  prefix?: string;
  suffix?: string;
  format?: "number" | "currency" | "percent";
}

export interface ChannelStatus {
  channel: "whatsapp" | "instagram" | "facebook" | "tiktok";
  connected: boolean;
  label: string;
}
