-- Migration: Add Voice Agent Usage Tracking
-- Created: 2026-05-12
-- Purpose: Per-user daily AI cost tracking + £2/day safety cap for the voice agent.
-- One row per (user, UTC day). Created lazily on first request of the day.

CREATE TABLE IF NOT EXISTS "voice_usage_daily" (
  "id" serial PRIMARY KEY,
  "user_id" integer NOT NULL,
  "organization_id" integer NOT NULL,
  "day_utc" date NOT NULL,
  "estimated_pence" integer NOT NULL DEFAULT 0,
  "input_tokens" integer NOT NULL DEFAULT 0,
  "output_tokens" integer NOT NULL DEFAULT 0,
  "voice_seconds" integer NOT NULL DEFAULT 0,
  "request_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "voice_usage_daily_user_day_unique" UNIQUE ("user_id", "day_utc")
);

CREATE INDEX IF NOT EXISTS "voice_usage_daily_org_day_idx"
  ON "voice_usage_daily" ("organization_id", "day_utc");
