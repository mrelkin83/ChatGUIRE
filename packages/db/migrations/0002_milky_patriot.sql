CREATE TABLE IF NOT EXISTS "department_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(20) DEFAULT 'agent',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "department_members_department_id_user_id_unique" UNIQUE("department_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"color" varchar(7) DEFAULT '#6366F1',
	"queue_order" integer DEFAULT 0,
	"auto_assign" boolean DEFAULT true,
	"business_hours" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "departments_tenant_id_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kanban_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) DEFAULT '#6366F1',
	"sort_order" integer DEFAULT 0,
	"is_final" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kanban_columns_tenant_id_name_unique" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaign_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"contact_phone" varchar(20) NOT NULL,
	"contact_name" varchar(255),
	"message_index" integer,
	"status" varchar(20) DEFAULT 'pending',
	"error_message" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"list_id" uuid NOT NULL,
	"channel_session_id" varchar(255),
	"messages" jsonb NOT NULL,
	"variables_schema" jsonb,
	"media_url" varchar(500),
	"media_type" varchar(20),
	"scheduled_at" timestamp,
	"recurrence" varchar(20) DEFAULT 'once',
	"next_run_at" timestamp,
	"api_provider" varchar(20) DEFAULT 'evolution',
	"status" varchar(20) DEFAULT 'draft',
	"total_contacts" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"delivered_count" integer DEFAULT 0,
	"read_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_list_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"customer_id" uuid,
	"phone" varchar(20) NOT NULL,
	"name" varchar(255),
	"variables" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) DEFAULT 'static',
	"filter_criteria" jsonb,
	"contact_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"category" varchar(20) NOT NULL,
	"label" varchar(100),
	"config" jsonb NOT NULL,
	"is_active" boolean DEFAULT false,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "integrations_tenant_id_provider_unique" UNIQUE("tenant_id","provider")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saas_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50),
	"target_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saas_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"price_cop" numeric(12, 2) NOT NULL,
	"billing_cycle" varchar(20) DEFAULT 'monthly',
	"limits" jsonb NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saas_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saas_resellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"company" varchar(255),
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"commission_pct" numeric(5, 2) DEFAULT '10.00',
	"referral_code" varchar(20) NOT NULL,
	"total_referrals" integer DEFAULT 0,
	"total_earnings" numeric(12, 2) DEFAULT '0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saas_resellers_email_unique" UNIQUE("email"),
	CONSTRAINT "saas_resellers_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "superadmin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'admin',
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "superadmin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_menu_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_id" uuid NOT NULL,
	"parent_node_id" uuid,
	"type" varchar(20) DEFAULT 'message' NOT NULL,
	"content" text,
	"options" jsonb DEFAULT '[]'::jsonb,
	"action" varchar(50),
	"action_params" jsonb,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_menus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"trigger_type" varchar(20) DEFAULT 'welcome' NOT NULL,
	"trigger_keywords" text[] DEFAULT '{}'::text[],
	"channel" varchar(20) DEFAULT 'all',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "is_demo" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "demo_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "reseller_id" uuid;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "mrr" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "billing_email" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "agent_status" varchar(20) DEFAULT 'offline';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "max_concurrent_chats" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_chat_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "assigned_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "kanban_column_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "potential_value" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "kanban_moved_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "department_members" ADD CONSTRAINT "department_members_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "department_members" ADD CONSTRAINT "department_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kanban_columns" ADD CONSTRAINT "kanban_columns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaign_logs" ADD CONSTRAINT "campaign_logs_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_list_id_contact_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."contact_lists"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_list_entries" ADD CONSTRAINT "contact_list_entries_list_id_contact_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."contact_lists"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_list_entries" ADD CONSTRAINT "contact_list_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_lists" ADD CONSTRAINT "contact_lists_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saas_audit_logs" ADD CONSTRAINT "saas_audit_logs_admin_id_superadmin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."superadmin_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_menu_nodes" ADD CONSTRAINT "bot_menu_nodes_menu_id_bot_menus_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."bot_menus"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_menus" ADD CONSTRAINT "bot_menus_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_kanban_column_id_kanban_columns_id_fk" FOREIGN KEY ("kanban_column_id") REFERENCES "public"."kanban_columns"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
