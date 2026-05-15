import { pgTable, uuid, varchar, timestamp, jsonb, text, boolean, integer } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const botMenus = pgTable('bot_menus', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  triggerType: varchar('trigger_type', { length: 20 }).notNull().default('welcome'),
  triggerKeywords: text('trigger_keywords').array(),
  channel: varchar('channel', { length: 20 }).default('all'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const botMenuNodes = pgTable('bot_menu_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuId: uuid('menu_id').notNull().references(() => botMenus.id, { onDelete: 'cascade' }),
  parentNodeId: uuid('parent_node_id'),
  type: varchar('type', { length: 20 }).notNull().default('message'),
  content: text('content'),
  options: jsonb('options').default([]),
  action: varchar('action', { length: 50 }),
  actionParams: jsonb('action_params'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
