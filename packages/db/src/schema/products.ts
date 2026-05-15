import { pgTable, uuid, varchar, timestamp, jsonb, decimal, integer, text, boolean } from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { customers } from './customers';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  type: varchar('type', { length: 20, enum: ['product', 'service'] }).notNull().default('product'),
  durationMinutes: integer('duration_minutes'), // For services
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // e.g. "Talla S / Rojo"
  sku: varchar('sku', { length: 100 }),
  priceOverride: decimal('price_override', { precision: 12, scale: 2 }),
  stock: integer('stock').notNull().default(0),
  attributes: jsonb('attributes').notNull(), // e.g. { size: "S", color: "Red" }
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
