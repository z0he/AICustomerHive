import { Router, Request, Response, raw } from 'express';
import Stripe from 'stripe';
import { checkAuth } from '../middleware/auth';
import * as creditService from '../services/credit-service';
import { db } from '../db';
import { creditTransactions } from '@shared/schema';
import { sql } from 'drizzle-orm';

const router = Router();

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-11-17.clover',
});

// Environment variables
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICE_STARTER = process.env.STRIPE_PRICE_STARTER || '';
const STRIPE_PRICE_GROWTH = process.env.STRIPE_PRICE_GROWTH || '';
const STRIPE_PRICE_SCALE = process.env.STRIPE_PRICE_SCALE || '';
const CREDITS_CUSTOM_RATE = parseInt(process.env.CREDITS_CUSTOM_RATE || '18');
const MIN_TOPUP_USD = parseInt(process.env.MIN_TOPUP_USD || '10');

/**
 * POST /api/stripe/create-checkout-session
 * Create a Stripe Checkout session for purchasing credits
 */
router.post('/create-checkout-session', checkAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.organization?.organizationId;
    const userId = req.user?.id;

    if (!organizationId) {
      return res.status(400).json({
        error: 'Organization context required',
        message: 'Cannot create checkout session without organization context'
      });
    }

    const { type, amountUsd } = req.body;

    if (!type || !['starter', 'growth', 'scale', 'custom'].includes(type)) {
      return res.status(400).json({
        error: 'Invalid type',
        message: 'Type must be one of: starter, growth, scale, custom'
      });
    }

    let sessionParams: Stripe.Checkout.SessionCreateParams;
    let credits: number;

    // Get the base URL for success/cancel redirects
    const baseUrl = process.env.REPLIT_DEV_DOMAIN
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : 'http://localhost:5000';

    if (type === 'custom') {
      // Custom amount - validate and calculate credits
      if (!amountUsd || typeof amountUsd !== 'number') {
        return res.status(400).json({
          error: 'Invalid amount',
          message: 'amountUsd is required for custom type and must be a number'
        });
      }

      if (amountUsd < MIN_TOPUP_USD) {
        return res.status(400).json({
          error: 'Amount too low',
          message: `Minimum top-up amount is $${MIN_TOPUP_USD}`
        });
      }

      credits = Math.floor(amountUsd * CREDITS_CUSTOM_RATE);

      // Create session with dynamic price_data
      sessionParams = {
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${credits} AICRM Credits`,
                description: `Custom credit bundle - ${credits} credits at $${amountUsd}`,
              },
              unit_amount: Math.round(amountUsd * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/?checkout=success`,
        cancel_url: `${baseUrl}/?checkout=cancelled`,
        metadata: {
          organizationId: organizationId.toString(),
          userId: userId?.toString() || '',
          credits: credits.toString(),
          type: 'custom',
        },
      };
    } else {
      // Predefined bundles
      let priceId: string;
      let bundleName: string;

      switch (type) {
        case 'starter':
          priceId = STRIPE_PRICE_STARTER;
          bundleName = 'Starter';
          credits = 200; // Matches Stripe product metadata
          break;
        case 'growth':
          priceId = STRIPE_PRICE_GROWTH;
          bundleName = 'Growth';
          credits = 450; // Matches Stripe product metadata
          break;
        case 'scale':
          priceId = STRIPE_PRICE_SCALE;
          bundleName = 'Scale';
          credits = 1300; // Matches Stripe product metadata
          break;
        default:
          return res.status(400).json({ error: 'Invalid bundle type' });
      }

      if (!priceId) {
        return res.status(500).json({
          error: 'Configuration error',
          message: `Price ID not configured for ${type} bundle`
        });
      }

      sessionParams = {
        mode: 'payment',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/?checkout=success`,
        cancel_url: `${baseUrl}/?checkout=cancelled`,
        metadata: {
          organizationId: organizationId.toString(),
          userId: userId?.toString() || '',
          credits: credits.toString(),
          type: bundleName.toLowerCase(),
        },
      };
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Stripe webhook handler function
 * This is exported separately to be mounted with raw body parsing
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    // req.body should be raw buffer when using express.raw() middleware
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({
      error: 'Webhook signature verification failed',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract metadata
        const metadata = session.metadata;
        
        if (!metadata?.organizationId || !metadata?.credits) {
          console.error('Missing required metadata in checkout session:', session.id);
          return res.status(400).json({ error: 'Missing required metadata' });
        }

        const organizationId = parseInt(metadata.organizationId);
        const credits = parseInt(metadata.credits);
        const type = metadata.type || 'unknown';

        console.log(`Processing checkout.session.completed for org ${organizationId}: ${credits} credits`);

        // Idempotency check: verify this session/payment hasn't been processed before
        // Check both stripe_session_id AND payment_intent to prevent duplicates from retries
        const paymentIntentId = session.payment_intent?.toString() || '';
        const existingTransaction = await db.select()
          .from(creditTransactions)
          .where(
            sql`(${creditTransactions.metadata}->>'stripe_session_id' = ${session.id} 
                 OR ${creditTransactions.metadata}->>'stripe_payment_intent' = ${paymentIntentId})`
          )
          .limit(1);

        if (existingTransaction.length > 0) {
          console.log(`Session ${session.id} or payment ${paymentIntentId} already processed, skipping to prevent duplicate credits`);
          break;
        }

        // Add credits to the organization
        await creditService.addCredits(
          organizationId,
          credits,
          'topup',
          {
            source: 'stripe',
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            bundle_type: type,
            amount_total: session.amount_total,
            currency: session.currency,
          }
        );

        console.log(`Successfully added ${credits} credits to organization ${organizationId}`);
        break;
      }

      default:
        // Gracefully ignore unrelated events
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    return res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook event:', error);
    return res.status(500).json({
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default router;
