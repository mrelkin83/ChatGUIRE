import { pgTable, uuid, varchar, timestamp, jsonb, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  externalId: varchar('external_id', { length: 255 }), // ID in the channel (phone, ig id, etc)
  fullName: varchar('full_name', { length: 255 }),
  displayName: varchar('display_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.tenantId, table.externalId),
}));

export const conversationState = pgTable('conversation_state', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  channel: varchar('channel', { length: 20 }).notNull(),
  state: varchar('state', { length: 30 }).default('IA_ACTIVA'),
  historial: jsonb('historial').default([]), // Últimos 10 mensajes [{role, content}]
  metadata: jsonb('metadata').default({}),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.tenantId, table.customerId, table.channel),
}));
