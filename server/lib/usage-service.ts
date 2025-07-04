import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Usage limits for free tier users
export const USAGE_LIMITS = {
  free: {
    aiPrompts: 20,
    emails: 50,
  },
  pro: {
    aiPrompts: 1000,
    emails: 5000,
  },
  enterprise: {
    aiPrompts: -1, // unlimited
    emails: -1, // unlimited
  },
} as const;

export type UserTier = keyof typeof USAGE_LIMITS;

/**
 * Service for tracking and managing user API usage limits
 * Supports hybrid model where users start with shared API keys
 * and can upgrade to personal keys when limits are reached
 */
export class UsageService {
  
  /**
   * Check if user has reached their AI prompt limit
   */
  async canUseAIPrompt(userId: number): Promise<{
    canUse: boolean;
    used: number;
    limit: number;
    hasPersonalKey: boolean;
  }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error('User not found');
    }

    const tier = user.userTier as UserTier || 'free';
    const limit = USAGE_LIMITS[tier].aiPrompts;
    const used = user.aiPromptsUsed || 0;
    const hasPersonalKey = !!user.personalOpenAIKey;

    // If user is paid, they bypass usage limits with system keys
    if (user.isPaid) {
      return {
        canUse: true,
        used,
        limit: -1,
        hasPersonalKey: false,
      };
    }

    // If user has personal API key, they can use unlimited prompts
    if (hasPersonalKey) {
      return {
        canUse: true,
        used,
        limit: -1,
        hasPersonalKey: true,
      };
    }

    // Check against tier limits for free users
    const canUse = limit === -1 || used < limit;

    return {
      canUse,
      used,
      limit,
      hasPersonalKey: false,
    };
  }

  /**
   * Check if user can send emails
   */
  async canSendEmail(userId: number): Promise<{
    canUse: boolean;
    used: number;
    limit: number;
    hasPersonalKey: boolean;
  }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error('User not found');
    }

    const tier = user.userTier as UserTier || 'free';
    const limit = USAGE_LIMITS[tier].emails;
    const used = user.emailsSent || 0;
    const hasPersonalKey = !!user.personalMailgunKey;

    // If user is paid, they bypass usage limits with system keys
    if (user.isPaid) {
      return {
        canUse: true,
        used,
        limit: -1,
        hasPersonalKey: false,
      };
    }

    // If user has personal API key, they can send unlimited emails
    if (hasPersonalKey) {
      return {
        canUse: true,
        used,
        limit: -1,
        hasPersonalKey: true,
      };
    }

    // Check against tier limits for free users
    const canUse = limit === -1 || used < limit;

    return {
      canUse,
      used,
      limit,
      hasPersonalKey: false,
    };
  }

  /**
   * Increment AI prompt usage for a user
   */
  async incrementAIUsage(userId: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user) {
      await db
        .update(users)
        .set({
          aiPromptsUsed: (user.aiPromptsUsed || 0) + 1,
        })
        .where(eq(users.id, userId));
    }
  }

  /**
   * Increment email usage for a user
   */
  async incrementEmailUsage(userId: number): Promise<void> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user) {
      await db
        .update(users)
        .set({
          emailsSent: (user.emailsSent || 0) + 1,
        })
        .where(eq(users.id, userId));
    }
  }

  /**
   * Get user's current usage stats
   */
  async getUserUsage(userId: number): Promise<{
    aiPrompts: { used: number; limit: number; hasPersonalKey: boolean };
    emails: { used: number; limit: number; hasPersonalKey: boolean };
    tier: UserTier;
  }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error('User not found');
    }

    const tier = user.userTier as UserTier || 'free';
    const aiLimit = USAGE_LIMITS[tier].aiPrompts;
    const emailLimit = USAGE_LIMITS[tier].emails;

    return {
      aiPrompts: {
        used: user.aiPromptsUsed || 0,
        limit: user.personalOpenAIKey ? -1 : aiLimit,
        hasPersonalKey: !!user.personalOpenAIKey,
      },
      emails: {
        used: user.emailsSent || 0,
        limit: user.personalMailgunKey ? -1 : emailLimit,
        hasPersonalKey: !!user.personalMailgunKey,
      },
      tier,
    };
  }

  /**
   * Store user's personal API keys (should be encrypted in production)
   */
  async storePersonalAPIKeys(userId: number, keys: {
    openaiKey?: string;
    mailgunKey?: string;
    mailgunDomain?: string;
  }): Promise<void> {
    const updateData: any = {};
    
    if (keys.openaiKey) {
      // In production, encrypt this before storing
      updateData.personalOpenAIKey = keys.openaiKey;
    }
    
    if (keys.mailgunKey) {
      // In production, encrypt this before storing
      updateData.personalMailgunKey = keys.mailgunKey;
    }
    
    if (keys.mailgunDomain) {
      updateData.personalMailgunDomain = keys.mailgunDomain;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }

  /**
   * Get user's personal API keys for use in services
   */
  async getPersonalAPIKeys(userId: number): Promise<{
    openaiKey?: string;
    mailgunKey?: string;
    mailgunDomain?: string;
  }> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      openaiKey: user.personalOpenAIKey || undefined,
      mailgunKey: user.personalMailgunKey || undefined,
      mailgunDomain: user.personalMailgunDomain || undefined,
    };
  }

  /**
   * Upgrade user tier (for future Stripe integration)
   */
  async upgradeUserTier(userId: number, tier: UserTier, stripeCustomerId?: string): Promise<void> {
    const updateData: any = {
      userTier: tier,
    };

    if (stripeCustomerId) {
      updateData.stripeCustomerId = stripeCustomerId;
      updateData.subscriptionStatus = 'active';
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));
  }
}

export const usageService = new UsageService();