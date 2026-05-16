CREATE TABLE IF NOT EXISTS "quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "quote_number" varchar(50) NOT NULL,
  "items" jsonb NOT NULL DEFAULT '[]',
  "subtotal" numeric(12, 2) NOT NULL DEFAULT '0',
  "tax" numeric(12, 2) NOT NULL DEFAULT '0',
  "total" numeric(12, 2) NOT NULL DEFAULT '0',
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "notes" text,
  "valid_until" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "reserved_date" date NOT NULL,
  "reserved_time" time NOT NULL,
  "party_size" integer NOT NULL DEFAULT 1,
  "resource_type" varchar(50),
  "resource_name" varchar(100),
  "status" varchar(20) NOT NULL DEFAULT 'confirmed',
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
