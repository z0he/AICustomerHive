import express, { Request, Response } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { touchpoints } from "../../shared/schema.js";
import { eq, and, gte, sql } from "drizzle-orm";

const router = express.Router();

// Validation schemas
const trackEventSchema = z.object({
  anonymousId: z.string().min(1),
  contactId: z.string().uuid().optional(),
  type: z.literal('web'),
  url: z.string().min(1),
  ts: z.string().datetime().optional(),
  utm: z.record(z.string()).optional(),
});

const identifySchema = z.object({
  anonymousId: z.string().min(1),
  contactId: z.string().uuid(),
});

// POST /api/track - Track page views
router.post('/track', async (req: Request, res: Response) => {
  try {
    const validatedData = trackEventSchema.parse(req.body);
    const { anonymousId, contactId, url, ts, utm } = validatedData;

    // Prepare touchpoint data
    const touchpointData = {
      contactId: contactId || null,
      type: 'web' as const,
      subtype: 'page_view',
      occurredAt: ts ? new Date(ts) : new Date(),
      meta: {
        url,
        anonymousId,
        ...(utm && { utm }),
      },
    };

    // Insert touchpoint
    await db.insert(touchpoints).values(touchpointData);

    res.json({ ok: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/track/identify - Stitch anonymous sessions to known contact
router.post('/track/identify', async (req: Request, res: Response) => {
  try {
    const validatedData = identifySchema.parse(req.body);
    const { anonymousId, contactId } = validatedData;

    // Calculate 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find and update touchpoints where:
    // - type = 'web'
    // - meta->>'anonymousId' = anonymousId
    // - occurred_at >= 30 days ago
    // - contact_id IS NULL (only update anonymous touchpoints)
    const result = await db
      .update(touchpoints)
      .set({ contactId })
      .where(
        and(
          eq(touchpoints.type, 'web'),
          sql`${touchpoints.meta}->>'anonymousId' = ${anonymousId}`,
          gte(touchpoints.occurredAt, thirtyDaysAgo),
          sql`${touchpoints.contactId} IS NULL`
        )
      );

    // Get the number of stitched records
    // Note: Drizzle doesn't return affected rows count directly
    // So we'll query the count of matching records
    const stitchedCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(touchpoints)
      .where(
        and(
          eq(touchpoints.type, 'web'),
          eq(touchpoints.contactId, contactId),
          sql`${touchpoints.meta}->>'anonymousId' = ${anonymousId}`,
          gte(touchpoints.occurredAt, thirtyDaysAgo)
        )
      );

    const stitched = stitchedCount[0]?.count || 0;

    res.json({ stitched });
  } catch (error) {
    console.error('Error identifying user:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;