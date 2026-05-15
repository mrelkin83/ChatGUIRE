import { pgTable, uuid, varchar, timestamp, boolean, jsonb, decimal, integer, primaryKey, unique } from 'drizzle-orm/pg-core';
import { VERTICALS } from '@saas/shared';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  vertical: varchar('vertical', { length: 50, enum: VERTICALS }).notNull(),
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Bogota'),
  ai_model: varchar('ai_model', { length: 50 }).notNull().default('gpt-4o-mini'),
  ai_temperature: decimal('ai_temperature', { precision: 3, scale: 2 }).notNull().default('0.70'),
  ai_max_tokens: integer('ai_max_tokens').notNull().default(500),
  isActive: boolean('is_active').notNull().default(true),
  isDemo: boolean('is_demo').default(false),
  demoExpiresAt: timestamp('demo_expires_at'),
  planId: uuid('plan_id'),
  resellerId: uuid('reseller_id'),
  mrr: decimal('mrr', { precision: 12, scale: 2 }).default('0'),
  suspendedAt: timestamp('suspended_at'),
  billingEmail: varchar('billing_email', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tenantConfig = pgTable('tenant_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 100 }).notNull(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.tenantId, table.key),
}));

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50, enum: ['owner', 'admin', 'agent'] }).notNull().default('agent'),
  agentStatus: varchar('agent_status', { length: 20, enum: ['available', 'busy', 'away', 'offline'] }).default('offline'),
  maxConcurrentChats: integer('max_concurrent_chats').default(5),
  currentChatCount: integer('current_chat_count').default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.tenantId, table.email),
}));
