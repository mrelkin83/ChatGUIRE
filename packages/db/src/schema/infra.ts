import { pgTable, uuid, varchar, timestamp, jsonb, decimal, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { orders, appointments } from './orders';

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').references(() => orders.id),
  appointmentId: uuid('appointment_id').references(() => appointments.id),
  externalId: varchar('external_id', { length: 255 }), // Wompi transaction ID
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('COP'),
  status: varchar('status', { length: 30 }).notNull().default('pending'), // 'pending', 'approved', 'declined', 'voided'
  method: varchar('method', { length: 50 }),
  paymentUrl: text('payment_url'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const channelSessions = pgTable('channel_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  channel: varchar('channel', { length: 20 }).notNull(),
  externalId: varchar('external_id', { length: 255 }).notNull(), // e.g. Evolution instance name, IG username
  status: varchar('status', { length: 20 }).notNull().default('disconnected'),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const messageTemplates = pgTable('message_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  content: text('content').notNull(),
  category: varchar('category', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
