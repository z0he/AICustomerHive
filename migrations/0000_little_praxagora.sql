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
	"percentage" integer DEFAULT 0
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
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"industry" text NOT NULL,
	"location" text,
	"score" integer DEFAULT 0,
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
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
