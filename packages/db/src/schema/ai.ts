import { pgTable, uuid, varchar, timestamp, jsonb, text, integer, boolean, customType, decimal } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

const pgVector = customType<{ data: number[] }>({
  dataType() {
    return 'vector(1536)';
  },
});

export const aiKnowledge = pgTable('ai_knowledge', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  embedding: pgVector('embedding'), // OpenAI embeddings
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiUnanswered = pgTable('ai_unanswered', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  context: jsonb('context'),
  isResolved: boolean('is_resolved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const analyticsDaily = pgTable('analytics_daily', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  date: timestamp('date').notNull(),
  channel: varchar('channel', { length: 20 }).notNull(),
  messagesInbound: integer('messages_inbound').default(0),
  messagesOutbound: integer('messages_outbound').default(0),
  ordersCreated: integer('orders_created').default(0),
  appointmentsCreated: integer('appointments_created').default(0),
  revenue: decimal('revenue', { precision: 12, scale: 2 }).default('0.00'),
});
