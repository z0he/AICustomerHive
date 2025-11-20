-- Migration: Add Referral and Welcome Credits System
-- Created: 2025-11-20
-- Purpose: Add referral tracking and welcome credits to organizations

-- Step 1: Add new transaction types to enum
ALTER TYPE "credit_transaction_type" ADD VALUE IF NOT EXISTS 'welcome_bonus';
ALTER TYPE "credit_transaction_type" ADD VALUE IF NOT EXISTS 'referral_bonus';

-- Step 2: Add new columns to organizations table
ALTER TABLE "organizations" 
  ADD COLUMN IF NOT EXISTS "referral_code" text UNIQUE,
  ADD COLUMN IF NOT EXISTS "referred_by_org_id" integer,
  ADD COLUMN IF NOT EXISTS "has_received_welcome_credits" boolean DEFAULT false;

-- Step 3: Generate unique referral codes for existing organizations
-- Function to generate random alphanumeric code
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar chars (0,O,1,I)
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update existing organizations with referral codes
DO $$
DECLARE
  org_record RECORD;
  new_code text;
  code_exists boolean;
BEGIN
  FOR org_record IN SELECT id FROM organizations WHERE referral_code IS NULL LOOP
    LOOP
      new_code := generate_referral_code();
      -- Check if code already exists
      SELECT EXISTS(SELECT 1 FROM organizations WHERE referral_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    
    UPDATE organizations 
    SET referral_code = new_code 
    WHERE id = org_record.id;
  END LOOP;
END $$;

-- Step 5: Set has_received_welcome_credits = true for all existing organizations
-- This prevents existing orgs from receiving welcome credits retroactively
UPDATE organizations 
SET has_received_welcome_credits = true 
WHERE has_received_welcome_credits = false;

-- Step 6: Create index on referral_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_referral_code ON organizations(referral_code);

-- Step 7: Create index on referred_by_org_id for analytics
CREATE INDEX IF NOT EXISTS idx_organizations_referred_by ON organizations(referred_by_org_id);

-- Clean up: Drop the temporary function (optional, can keep for future use)
-- DROP FUNCTION IF EXISTS generate_referral_code();

-- Migration complete
-- All existing organizations now have:
-- 1. Unique referral codes
-- 2. has_received_welcome_credits = true (won't get retroactive credits)
-- 3. referred_by_org_id = null (not referred)
