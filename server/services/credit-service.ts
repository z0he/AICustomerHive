import { db } from "../db";
import { credits, creditTransactions, organizations } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { CreditTransaction } from "@shared/schema";

export interface CreditCost {
  email: number;
  automation: number;
  ai: number;
  voice: number;
}

// Credit burn rules
export const CREDIT_COSTS: CreditCost = {
  email: 1,
  automation: 3,
  ai: 2,
  voice: 3
};

// Special case: AI suggestions in campaign-creation modal cost 0
export const FREE_ACTIONS = {
  campaignSuggestions: true
};

export interface InsufficientCreditsError {
  error: "INSUFFICIENT_CREDITS";
  required: number;
  current: number;
}

/**
 * Get the current credit balance for an organization
 */
export async function getBalance(organizationId: number): Promise<number> {
  try {
    // Try to get existing credit record
    const result = await db.select()
      .from(credits)
      .where(eq(credits.organizationId, organizationId))
      .limit(1);
    
    if (result.length === 0) {
      // No credit record exists, create one with 0 balance
      const newCredit = await db.insert(credits)
        .values({
          organizationId,
          balance: 0,
          updatedAt: new Date()
        })
        .returning();
      
      return newCredit[0].balance;
    }
    
    return result[0].balance;
  } catch (error) {
    console.error('Error getting credit balance:', error);
    throw new Error('Failed to retrieve credit balance');
  }
}

/**
 * Add credits to an organization's balance
 */
export async function addCredits(
  organizationId: number,
  amount: number,
  type: "topup" | "system" | "welcome_bonus" | "referral_bonus",
  metadata?: Record<string, any>
): Promise<{ balance: number; transaction: CreditTransaction }> {
  if (amount <= 0) {
    throw new Error('Credit amount must be positive');
  }
  
  try {
    return await db.transaction(async (txDb) => {
      // Get current balance or create new credit record
      let currentBalance = 0;
      const existing = await txDb.select()
        .from(credits)
        .where(eq(credits.organizationId, organizationId))
        .limit(1);
      
      if (existing.length === 0) {
        // Create new credit record
        const newCredit = await txDb.insert(credits)
          .values({
            organizationId,
            balance: amount
          })
          .returning();
        currentBalance = newCredit[0].balance;
      } else {
        // Update existing balance
        const newBalance = existing[0].balance + amount;
        const updated = await txDb.update(credits)
          .set({
            balance: newBalance,
            updatedAt: new Date()
          })
          .where(eq(credits.organizationId, organizationId))
          .returning();
        currentBalance = updated[0].balance;
      }
      
      // Create transaction record (createdAt auto-defaults in schema)
      const transaction = await txDb.insert(creditTransactions)
        .values({
          organizationId,
          amount: amount, // Positive for additions
          type: type,
          metadata: metadata || {}
        })
        .returning();
      
      return {
        balance: currentBalance,
        transaction: transaction[0]
      };
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    throw new Error('Failed to add credits');
  }
}

/**
 * Deduct credits from an organization's balance
 */
export async function deductCredits(
  organizationId: number,
  amount: number,
  type: "email" | "automation" | "ai" | "voice",
  metadata?: Record<string, any>
): Promise<{ balance: number; transaction: CreditTransaction }> {
  if (amount <= 0) {
    throw new Error('Deduction amount must be positive');
  }
  
  try {
    return await db.transaction(async (txDb) => {
      // Get current balance
      const existing = await txDb.select()
        .from(credits)
        .where(eq(credits.organizationId, organizationId))
        .limit(1);
      
      if (existing.length === 0) {
        // No credits available
        throw {
          error: "INSUFFICIENT_CREDITS",
          required: amount,
          current: 0
        } as InsufficientCreditsError;
      }
      
      const currentBalance = existing[0].balance;
      
      if (currentBalance < amount) {
        throw {
          error: "INSUFFICIENT_CREDITS",
          required: amount,
          current: currentBalance
        } as InsufficientCreditsError;
      }
      
      // Deduct credits
      const newBalance = currentBalance - amount;
      const updated = await txDb.update(credits)
        .set({
          balance: newBalance,
          updatedAt: new Date()
        })
        .where(eq(credits.organizationId, organizationId))
        .returning();
      
      // Create transaction record (negative amount for deductions, createdAt auto-defaults)
      const transaction = await txDb.insert(creditTransactions)
        .values({
          organizationId,
          amount: -amount, // Negative for deductions
          type: type,
          metadata: metadata || {}
        })
        .returning();
      
      return {
        balance: updated[0].balance,
        transaction: transaction[0]
      };
    });
  } catch (error) {
    // Re-throw InsufficientCreditsError as-is
    if ((error as any).error === "INSUFFICIENT_CREDITS") {
      throw error;
    }
    console.error('Error deducting credits:', error);
    throw new Error('Failed to deduct credits');
  }
}

/**
 * Ensure an organization has sufficient credits for an action
 * Throws InsufficientCreditsError if not enough credits
 */
export async function ensureSufficientCredits(
  organizationId: number,
  required: number
): Promise<void> {
  const balance = await getBalance(organizationId);
  
  if (balance < required) {
    throw {
      error: "INSUFFICIENT_CREDITS",
      required,
      current: balance
    } as InsufficientCreditsError;
  }
}

/**
 * Check if organization has their own OpenAI API key (BYOK)
 * Returns true if they have their own key configured
 */
export async function hasOwnOpenAIKey(organizationId: number): Promise<boolean> {
  try {
    const result = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    
    if (result.length === 0) {
      return false;
    }
    
    // Check if organization has settings with an OpenAI key
    const settings = result[0].settings as Record<string, any> | null;
    
    // Check for OpenAI key in various possible locations
    if (settings?.openaiKey && settings.openaiKey.trim() !== '') {
      return true;
    }
    
    // Check in integrations.openai settings
    if (settings?.integrations?.openai?.apiKey && settings.integrations.openai.apiKey.trim() !== '') {
      return true;
    }
    
    // Check if mode is explicitly set to BYOK
    if (settings?.integrations?.openai?.mode === 'byok') {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for organization OpenAI key:', error);
    return false;
  }
}

/**
 * Calculate credit cost for an action, considering BYOK
 * Returns 0 if action should be free
 */
export async function calculateCreditCost(
  organizationId: number,
  actionType: keyof CreditCost | "campaign-suggestions",
  metadata?: Record<string, any>
): Promise<number> {
  // Special case: campaign suggestions are always free
  if (actionType === "campaign-suggestions") {
    return 0;
  }
  
  // For AI actions, check if organization has their own key
  if (actionType === "ai") {
    const hasOwnKey = await hasOwnOpenAIKey(organizationId);
    if (hasOwnKey) {
      return 0; // BYOK: AI is free
    }
  }
  
  // Return standard cost
  return CREDIT_COSTS[actionType as keyof CreditCost] || 0;
}

/**
 * Get recent transactions for an organization
 */
export async function getTransactions(
  organizationId: number,
  limit: number = 10
): Promise<CreditTransaction[]> {
  try {
    return await db.select()
      .from(creditTransactions)
      .where(eq(creditTransactions.organizationId, organizationId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Error getting credit transactions:', error);
    throw new Error('Failed to retrieve credit transactions');
  }
}

/**
 * Get comprehensive credit information for an organization
 * Including balance, totals, transactions, and low balance status
 */
export async function getCreditInfo(
  organizationId: number,
  transactionLimit: number = 20
): Promise<{
  balance: number;
  totalPurchasedCredits: number;
  totalUsedCredits: number;
  transactions: CreditTransaction[];
  lowBalance: boolean;
  threshold: number;
}> {
  try {
    // Get current balance and recent transactions in parallel
    const [balance, transactions] = await Promise.all([
      getBalance(organizationId),
      getTransactions(organizationId, transactionLimit)
    ]);
    
    // Calculate totals using SQL aggregation to avoid fetching all rows
    const totalsResult = await db.select({
      totalPurchased: sql<number>`COALESCE(SUM(CASE WHEN ${creditTransactions.amount} > 0 THEN ${creditTransactions.amount} ELSE 0 END), 0)`,
      totalUsed: sql<number>`COALESCE(SUM(CASE WHEN ${creditTransactions.amount} < 0 THEN ABS(${creditTransactions.amount}) ELSE 0 END), 0)`
    })
    .from(creditTransactions)
    .where(eq(creditTransactions.organizationId, organizationId));
    
    const totalPurchasedCredits = Number(totalsResult[0]?.totalPurchased || 0);
    const totalUsedCredits = Number(totalsResult[0]?.totalUsed || 0);
    
    // Low balance threshold
    const threshold = 20;
    const lowBalance = balance < threshold;
    
    return {
      balance,
      totalPurchasedCredits,
      totalUsedCredits,
      transactions,
      lowBalance,
      threshold
    };
  } catch (error) {
    console.error('Error getting comprehensive credit info:', error);
    throw new Error('Failed to retrieve credit information');
  }
}

// ===== WELCOME CREDITS & REFERRAL SYSTEM =====

/**
 * Generate a unique referral code for an organization
 * Returns an 8-character alphanumeric code (excludes similar chars like 0,O,1,I)
 */
export async function generateReferralCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
  let code = '';
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!isUnique && attempts < maxAttempts) {
    // Generate 8-character code
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    const existing = await db.select()
      .from(organizations)
      .where(eq(organizations.referralCode, code))
      .limit(1);
    
    isUnique = existing.length === 0;
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate unique referral code after multiple attempts');
  }
  
  return code;
}

/**
 * Grant welcome credits to a new organization (idempotent)
 * Only grants credits if hasReceivedWelcomeCredits is false
 */
export async function grantWelcomeCredits(organizationId: number): Promise<void> {
  const FREE_STARTER_CREDITS = parseInt(process.env.FREE_STARTER_CREDITS || '200');
  
  try {
    await db.transaction(async (txDb) => {
      // Check if organization has already received welcome credits
      const org = await txDb.select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);
      
      if (org.length === 0) {
        throw new Error(`Organization ${organizationId} not found`);
      }
      
      if (org[0].hasReceivedWelcomeCredits) {
        console.log(`Organization ${organizationId} has already received welcome credits - skipping`);
        return; // Already received, skip (idempotency)
      }
      
      // Grant welcome credits
      await addCredits(
        organizationId,
        FREE_STARTER_CREDITS,
        'welcome_bonus',
        {
          source: 'system',
          description: 'Welcome credits for new AICRM account'
        }
      );
      
      // Mark as received
      await txDb.update(organizations)
        .set({ hasReceivedWelcomeCredits: true })
        .where(eq(organizations.id, organizationId));
      
      console.log(`✓ Granted ${FREE_STARTER_CREDITS} welcome credits to organization ${organizationId}`);
    });
  } catch (error) {
    console.error(`Error granting welcome credits to org ${organizationId}:`, error);
    throw error;
  }
}

/**
 * Process referral bonus for both referrer and invitee (idempotent)
 * Only grants bonuses if invitee hasn't been referred before
 */
export async function processReferralBonus(
  inviteeOrgId: number,
  referrerOrgId: number
): Promise<void> {
  const REFERRAL_BONUS_REFERRER = parseInt(process.env.REFERRAL_BONUS_REFERRER || '100');
  const REFERRAL_BONUS_INVITEE = parseInt(process.env.REFERRAL_BONUS_INVITEE || '100');
  
  try {
    await db.transaction(async (txDb) => {
      // Check invitee organization
      const invitee = await txDb.select()
        .from(organizations)
        .where(eq(organizations.id, inviteeOrgId))
        .limit(1);
      
      if (invitee.length === 0) {
        throw new Error(`Invitee organization ${inviteeOrgId} not found`);
      }
      
      // Check if invitee has already been referred (idempotency check)
      if (invitee[0].referredByOrgId !== null) {
        console.log(`Organization ${inviteeOrgId} has already been referred - skipping referral bonus`);
        return; // Already referred, skip
      }
      
      // Check referrer organization exists
      const referrer = await txDb.select()
        .from(organizations)
        .where(eq(organizations.id, referrerOrgId))
        .limit(1);
      
      if (referrer.length === 0) {
        throw new Error(`Referrer organization ${referrerOrgId} not found`);
      }
      
      // Grant bonus to referrer
      await addCredits(
        referrerOrgId,
        REFERRAL_BONUS_REFERRER,
        'referral_bonus',
        {
          source: 'system',
          description: 'Referral bonus – invited new organization',
          inviteeOrgId: inviteeOrgId
        }
      );
      
      // Grant bonus to invitee
      await addCredits(
        inviteeOrgId,
        REFERRAL_BONUS_INVITEE,
        'referral_bonus',
        {
          source: 'system',
          description: 'Referral bonus – joined via referral',
          referrerOrgId: referrerOrgId
        }
      );
      
      // Mark invitee as referred
      await txDb.update(organizations)
        .set({ referredByOrgId: referrerOrgId })
        .where(eq(organizations.id, inviteeOrgId));
      
      console.log(`✓ Referral bonus granted: Referrer org ${referrerOrgId} +${REFERRAL_BONUS_REFERRER}, Invitee org ${inviteeOrgId} +${REFERRAL_BONUS_INVITEE}`);
    });
  } catch (error) {
    console.error(`Error processing referral bonus (referrer: ${referrerOrgId}, invitee: ${inviteeOrgId}):`, error);
    throw error;
  }
}
