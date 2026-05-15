import { pgTable, uuid, varchar, timestamp, boolean, integer, unique } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const kanbanColumns = pgTable('kanban_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }).default('#6366F1'),
  sortOrder: integer('sort_order').default(0),
  isFinal: boolean('is_final').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.tenantId, table.name),
}));
