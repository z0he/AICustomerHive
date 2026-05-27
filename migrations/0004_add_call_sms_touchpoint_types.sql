-- Migration: Add 'call' and 'sms' touchpoint types
-- Created: 2026-05-27
-- Purpose: Voice agent's log_contact_activity tool records calls and texts
-- against contacts. The existing touchpoint_type enum
-- (web/email/form/meeting/note/task) had no value for these synchronous
-- channels. Idempotent so re-running is safe.

ALTER TYPE "touchpoint_type" ADD VALUE IF NOT EXISTS 'call';
ALTER TYPE "touchpoint_type" ADD VALUE IF NOT EXISTS 'sms';
