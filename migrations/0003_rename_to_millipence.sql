-- Migration: Switch voice_usage_daily cost column from pence to millipence
-- Created: 2026-05-13
-- Purpose: Single Realtime request costs ~0.2 pence. Storing as integer pence
-- meant Math.round() per request collapsed to 0 and the counter never moved.
-- Switching to millipence (1/1000 of a pence) gives us 1000x finer resolution
-- with no risk of overflow (a £100 spend = 10M units, well within int32).

ALTER TABLE "voice_usage_daily"
  RENAME COLUMN "estimated_pence" TO "estimated_millipence";

-- Existing rows have value 0 — renaming preserves that, and 0 millipence
-- still means "nothing spent" so no data correction needed.
