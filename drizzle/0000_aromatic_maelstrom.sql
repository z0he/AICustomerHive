CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"all_day" boolean DEFAULT false,
	"event_type" text DEFAULT 'meeting',
	"status" text DEFAULT 'scheduled',
	"related_entity_type" text,
	"related_entity_id" integer,
	"owner_id" integer,
	"reminder_minutes" integer,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"location" text,
	"color" text DEFAULT '#4F46E5',
	"recurrence" json
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"target_audience" text NOT NULL,
	"message" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"conversions" integer DEFAULT 0,
	"percentage" integer DEFAULT 0,
	"is_ab_test_active" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "customer_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"action" text NOT NULL,
	"campaign" text,
	"date" text NOT NULL,
	"status" text DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"phone" text,
	"company" text,
	"job_title" text,
	"linkedin_url" text,
	"lifecycle_stage" text DEFAULT 'lead',
	"lead_status" text,
	"contact_industry" text,
	"contact_owner" text,
	"contact_source" text,
	"contact_type" text,
	"country" text,
	"legal_basis" text,
	"created_at" timestamp NOT NULL,
	"status" text DEFAULT 'active',
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp NOT NULL,
	"status" text DEFAULT 'sent',
	"template_id" integer,
	"campaign_id" integer,
	"related_entity_type" text,
	"related_entity_id" integer,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text NOT NULL,
	"category" text DEFAULT 'general',
	"created_by" integer,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp,
	"variables" text[]
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"industry" text NOT NULL,
	"location" text,
	"email" text,
	"phone" text,
	"company" text,
	"job_title" text,
	"lead_source" text,
	"lead_status" text DEFAULT 'new',
	"lead_owner" text,
	"last_contact_date" timestamp,
	"next_follow_up_date" timestamp,
	"engagement_level" integer DEFAULT 0,
	"conversion_probability" integer DEFAULT 0,
	"score" integer DEFAULT 0,
	"tags" text[],
	"notes" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"variant_name" text NOT NULL,
	"message" text NOT NULL,
	"impressions" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"conversion_rate" integer DEFAULT 0,
	"is_control" boolean DEFAULT false,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"due_date" text NOT NULL,
	"completed" boolean DEFAULT false,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"google_id" text,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
