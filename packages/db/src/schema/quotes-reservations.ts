import { pgTable, uuid, varchar, timestamp, jsonb, decimal, integer, text, date, time } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';

export const quotes = pgTable('quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  quoteNumber: varchar('quote_number', { length: 50 }).notNull(),
  items: jsonb('items').notNull().default([]), // [{productId, productName, qty, unitPrice}]
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  tax: decimal('tax', { precision: 12, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending','accepted','rejected','expired'
  notes: text('notes'),
  validUntil: timestamp('valid_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const reservations = pgTable('reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  reservedDate: date('reserved_date').notNull(),
  reservedTime: time('reserved_time').notNull(),
  partySize: integer('party_size').notNull().default(1),
  resourceType: varchar('resource_type', { length: 50 }), // e.g. 'table', 'room', 'court'
  resourceName: varchar('resource_name', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull().default('confirmed'), // 'confirmed','cancelled','completed','no_show'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
