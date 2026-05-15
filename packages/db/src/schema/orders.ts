import { pgTable, uuid, varchar, timestamp, jsonb, decimal, integer, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';
import { products, productVariants } from './products';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  status: varchar('status', { length: 30 }).notNull().default('pending'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  shippingAddress: text('shipping_address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  variantId: uuid('variant_id').references(() => productVariants.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  variantInfo: jsonb('variant_info'),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
});

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  serviceId: uuid('service_id').notNull().references(() => products.id),
  serviceName: varchar('service_name', { length: 255 }).notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  status: varchar('status', { length: 30 }).notNull().default('scheduled'), // 'scheduled', 'confirmed', 'cancelled', 'completed'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
