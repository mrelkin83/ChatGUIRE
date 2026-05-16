ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "external_id" varchar(255);
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_customer_channel_unique" UNIQUE ("tenant_id", "customer_id", "channel");
