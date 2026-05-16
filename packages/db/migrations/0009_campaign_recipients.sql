-- Fase 3: campaign_recipients table + new columns for segmentation-based campaigns

-- Make list_id nullable to support segmentation-based campaigns (no contact list needed)
ALTER TABLE "campaigns" ALTER COLUMN "list_id" DROP NOT NULL;

-- New columns in campaigns table (backwards compatible, nullable)
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "channel" varchar(20) DEFAULT 'whatsapp';
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "content" text;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "segment" jsonb;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "throttle" jsonb;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "estimated_audience" integer DEFAULT 0;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "actual_audience" integer;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;

-- Per-recipient tracking table for segmentation-based campaigns
CREATE TABLE IF NOT EXISTS "campaign_recipients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "campaign_id" uuid NOT NULL REFERENCES "campaigns"("id") ON DELETE CASCADE,
  "customer_id" uuid NOT NULL REFERENCES "customers"("id"),
  "destination" varchar(255),
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "error" text,
  "sent_at" timestamp,
  "failed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "campaign_recipients_campaign_id_idx" ON "campaign_recipients"("campaign_id");
CREATE INDEX IF NOT EXISTS "campaign_recipients_campaign_status_idx" ON "campaign_recipients"("campaign_id", "status");
