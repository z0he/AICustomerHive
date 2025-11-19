import { Request, Response, NextFunction } from "express";
import * as creditService from "../services/credit-service";
import type { InsufficientCreditsError } from "../services/credit-service";

/**
 * Middleware to check if organization has sufficient credits for an action
 * This should be used BEFORE the action is performed
 * 
 * Usage:
 *   router.post('/api/email/send', requireCredits('email'), async (req, res) => { ... })
 */
export function requireCredits(
  actionType: keyof typeof creditService.CREDIT_COSTS | "campaign-suggestions",
  getMetadata?: (req: Request) => Record<string, any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get organization ID from request (set by organizationMiddleware)
      const organizationId = req.organization?.organizationId;
      
      if (!organizationId) {
        return res.status(400).json({
          error: 'Organization context required',
          message: 'This action requires an organization context'
        });
      }
      
      // Calculate credit cost (considers BYOK)
      const metadata = getMetadata ? getMetadata(req) : {};
      const creditCost = await creditService.calculateCreditCost(
        organizationId,
        actionType,
        metadata
      );
      
      // If action is free (e.g., BYOK or campaign-suggestions), skip credit check
      if (creditCost === 0) {
        // Store that this action is free so we don't deduct credits later
        (req as any)._creditCost = 0;
        (req as any)._actionType = actionType;
        return next();
      }
      
      // Check if organization has sufficient credits
      try {
        await creditService.ensureSufficientCredits(organizationId, creditCost);
        
        // Store credit info for later deduction
        (req as any)._creditCost = creditCost;
        (req as any)._actionType = actionType;
        (req as any)._creditMetadata = metadata;
        
        next();
      } catch (error) {
        // Handle insufficient credits error
        if ((error as any).error === "INSUFFICIENT_CREDITS") {
          const insufficientError = error as InsufficientCreditsError;
          return res.status(402).json(insufficientError); // 402 Payment Required
        }
        throw error;
      }
    } catch (error) {
      console.error('Error in requireCredits middleware:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check credit balance'
      });
    }
  };
}

/**
 * Helper function to deduct credits after a successful action
 * Call this at the end of your route handler after the action succeeds
 * 
 * Usage:
 *   await deductCreditsAfterAction(req);
 *   res.json({ success: true });
 */
export async function deductCreditsAfterAction(req: Request): Promise<void> {
  const organizationId = req.organization?.organizationId;
  const creditCost = (req as any)._creditCost;
  const actionType = (req as any)._actionType;
  const metadata = (req as any)._creditMetadata;
  
  // Skip if no credit cost (free action or not checked)
  if (!organizationId || creditCost === undefined || creditCost === 0) {
    return;
  }
  
  try {
    await creditService.deductCredits(
      organizationId,
      creditCost,
      actionType,
      metadata
    );
  } catch (error) {
    // Log error but don't fail the request since action already succeeded
    console.error('Error deducting credits after action:', error);
    // You might want to log this to a queue for retry or manual intervention
  }
}

/**
 * Combined middleware that checks credits before and deducts after
 * This wraps the route handler to automatically manage credits
 * 
 * Usage:
 *   router.post('/api/email/send', 
 *     withCredits('email', async (req, res) => {
 *       // Your action here
 *       await sendEmail(...);
 *       res.json({ success: true });
 *     })
 *   );
 */
export function withCredits(
  actionType: keyof typeof creditService.CREDIT_COSTS | "campaign-suggestions",
  handler: (req: Request, res: Response, next: NextFunction) => Promise<any>,
  getMetadata?: (req: Request) => Record<string, any>
) {
  return [
    requireCredits(actionType, getMetadata),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Call the original handler
        await handler(req, res, next);
        
        // Deduct credits after successful action
        // Only deduct if response was successful (status < 400)
        if (res.statusCode < 400) {
          await deductCreditsAfterAction(req);
        }
      } catch (error) {
        next(error);
      }
    }
  ];
}
