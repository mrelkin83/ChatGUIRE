import { pgTable, uuid, varchar, timestamp, jsonb, text, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';
import { users } from './tenants';
import { kanbanColumns } from './kanban';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  assignedAgentId: uuid('assigned_agent_id').references(() => users.id),
  kanbanColumnId: uuid('kanban_column_id').references(() => kanbanColumns.id),
  channel: varchar('channel', { length: 20 }).notNull(),
  lastMessageAt: timestamp('last_message_at').defaultNow().notNull(),
  status: varchar('status', { length: 20 }).default('open'),
  potentialValue: decimal('potential_value', { precision: 12, scale: 2 }).default('0'),
  kanbanMovedAt: timestamp('kanban_moved_at'),
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id'), // null if sent by system/IA
  direction: varchar('direction', { length: 20, enum: ['inbound', 'outbound'] }).notNull(),
  content: jsonb('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  metadata: jsonb('metadata').default({}),
});
