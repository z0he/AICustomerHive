import { Router, Request, Response } from 'express';
import * as creditService from '../services/credit-service';
import { checkAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/credits
 * Get comprehensive credit information for the organization
 * This is the single source of truth for all credit data
 */
router.get('/credits', checkAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.organization?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization context required',
        message: 'Credit information requires an organization context'
      });
    }
    
    // Get comprehensive credit info (last 20 transactions by default)
    const creditInfo = await creditService.getCreditInfo(organizationId, 20);
    
    return res.json(creditInfo);
  } catch (error) {
    console.error('Error fetching credit information:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve credit information'
    });
  }
});

/**
 * POST /api/credits/topup
 * Add credits to organization
 * IMPORTANT: In production, this endpoint should be protected and only called after payment verification
 * For development/testing, it's available to authenticated users with limits
 */
router.post('/credits/topup', checkAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.organization?.organizationId;
    const userId = req.user?.id;
    
    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization context required'
      });
    }
    
    const { amount, metadata } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        message: 'Amount must be a positive number'
      });
    }
    
    // DEVELOPMENT ONLY: Limit top-up amounts for non-admin users
    // TODO: In production, replace with payment gateway integration
    const MAX_TOPUP = process.env.NODE_ENV === 'production' ? 0 : 10000;
    if (!req.user?.isAdmin && amount > MAX_TOPUP) {
      return res.status(403).json({
        error: 'Amount exceeds limit',
        message: `Maximum top-up amount is ${MAX_TOPUP} credits. Please contact support for larger amounts.`
      });
    }
    
    const result = await creditService.addCredits(
      organizationId,
      amount,
      'topup',
      metadata || { source: 'manual', userId, note: 'Development top-up' }
    );
    
    return res.json({
      success: true,
      balance: result.balance,
      transaction: result.transaction
    });
  } catch (error) {
    console.error('Error adding credits:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add credits'
    });
  }
});

export default router;
