ALTER TABLE "orders" ADD COLUMN "subtotal" numeric(12, 2) NOT NULL DEFAULT '0';
ALTER TABLE "orders" ADD COLUMN "tax" numeric(12, 2) NOT NULL DEFAULT '0';
