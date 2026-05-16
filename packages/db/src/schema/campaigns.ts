import { pgTable, uuid, varchar, timestamp, boolean, jsonb, integer, text, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';
import { sql } from 'drizzle-orm';

export const contactLists = pgTable('contact_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).default('static'), // 'static', 'dynamic'
  filterCriteria: jsonb('filter_criteria'),
  contactCount: integer('contact_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contactListEntries = pgTable('contact_list_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id').notNull().references(() => contactLists.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id),
  phone: varchar('phone', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }),
  variables: jsonb('variables').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  listId: uuid('list_id').references(() => contactLists.id), // nullable for segmentation campaigns
  channelSessionId: varchar('channel_session_id', { length: 255 }),
  messages: jsonb('messages').notNull(), // [{text, media_url, active}]
  variablesSchema: jsonb('variables_schema'),
  mediaUrl: varchar('media_url', { length: 500 }),
  mediaType: varchar('media_type', { length: 20 }),
  scheduledAt: timestamp('scheduled_at'),
  recurrence: varchar('recurrence', { length: 20 }).default('once'), // 'once','daily','weekly','biweekly','monthly'
  nextRunAt: timestamp('next_run_at'),
  apiProvider: varchar('api_provider', { length: 20 }).default('evolution'),
  status: varchar('status', { length: 20 }).default('draft'), // 'draft','scheduled','running','sending','paused','completed','cancelled'
  totalContacts: integer('total_contacts').default(0),
  sentCount: integer('sent_count').default(0),
  deliveredCount: integer('delivered_count').default(0),
  readCount: integer('read_count').default(0),
  failedCount: integer('failed_count').default(0),
  // Fase 3 — segmentation-based campaigns
  channel: varchar('channel', { length: 20 }).default('whatsapp'),
  content: text('content'),
  segment: jsonb('segment'),
  throttle: jsonb('throttle'),
  estimatedAudience: integer('estimated_audience').default(0),
  actualAudience: integer('actual_audience'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Fase 3 — per-recipient tracking for segmentation-based campaigns
export const campaignRecipients = pgTable('campaign_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  destination: varchar('destination', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending/sent/delivered/read/failed/replied/cancelled
  error: text('error'),
  sentAt: timestamp('sent_at'),
  failedAt: timestamp('failed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const campaignLogs = pgTable('campaign_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  contactPhone: varchar('contact_phone', { length: 20 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  messageIndex: integer('message_index'), // Which message variation (1-5)
  status: varchar('status', { length: 20 }).default('pending'), // 'pending','sent','delivered','read','failed'
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
});
