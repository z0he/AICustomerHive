import { Router, Request, Response } from 'express';
import { db } from '../db';
import { systemNotifications } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Get all feedback notifications directly
 */
router.get('/api/feedback/list', async (req: Request, res: Response) => {
  try {
    // Direct query to get only user_feedback type notifications
    const feedback = await db.select()
      .from(systemNotifications)
      .where(eq(systemNotifications.type, 'user_feedback'))
      .orderBy(systemNotifications.createdAt)
      .execute();
    
    console.log(`Found ${feedback.length} feedback items`);
    
    return res.json(feedback);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch feedback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;