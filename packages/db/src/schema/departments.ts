import { pgTable, uuid, varchar, timestamp, boolean, jsonb, integer, unique } from 'drizzle-orm/pg-core';
import { tenants, users } from './tenants';

export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: varchar('description', { length: 500 }),
  color: varchar('color', { length: 7 }).default('#6366F1'),
  queueOrder: integer('queue_order').default(0),
  autoAssign: boolean('auto_assign').default(true),
  businessHours: jsonb('business_hours').default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.tenantId, table.name),
}));

export const departmentMembers = pgTable('department_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  departmentId: uuid('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20, enum: ['lead', 'agent'] }).default('agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  unq: unique().on(table.departmentId, table.userId),
}));
