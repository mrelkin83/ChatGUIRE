import { pgTable, uuid, varchar, timestamp, jsonb, decimal, integer, text } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';
import { products, productVariants } from './products';

export const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id),
  status: varchar('status', { length: 20 }).default('active'), // 'active', 'converted', 'expired'
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cartItems = pgTable('cart_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  variantId: uuid('variant_id').references(() => productVariants.id),
  productName: varchar('product_name', { length: 255 }).notNull(),
  variantInfo: jsonb('variant_info'),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
