-- Migration: Add 'deleted' to contact_status enum
-- Created: 2026-05-29
-- Purpose: Voice agent's delete_contact tool soft-deletes contacts by
-- setting status='deleted'. The existing contact_status enum was
-- (active/inactive/lost) with no value for removed-from-list. Soft delete
-- keeps the row recoverable (matches how legacy leads/customers work) and
-- avoids cascading wipes of touchpoints/notes/journey membership.
-- Idempotent so re-running is safe.

ALTER TYPE "contact_status" ADD VALUE IF NOT EXISTS 'deleted';
