import { pgTable, uuid, varchar, timestamp, boolean, jsonb, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // 'openai','groq','openrouter','anthropic','n8n','typebot','dify','chatwoot'
  category: varchar('category', { length: 20 }).notNull(), // 'llm','automation','crm'
  label: varchar('label', { length: 100 }),
  config: jsonb('config').notNull(), // {"api_key": "encrypted...", "base_url": "...", "model": "..."}
  isActive: boolean('is_active').default(false),
  isPrimary: boolean('is_primary').default(false), // For LLMs: which is the primary
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.tenantId, table.provider),
}));
