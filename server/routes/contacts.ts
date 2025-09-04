import express, { Request, Response } from "express";
import { db } from "../db.js";
import { contacts } from "../../shared/schema.js";
import { sql, eq, and, or, ilike } from "drizzle-orm";

const router = express.Router();

// GET /api/contacts - Unified contacts endpoint with filtering
router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const { stage = 'all', q = '', owner = '', page = '1', limit = '50' } = req.query;
    
    // Validate and sanitize stage parameter
    const validStages = ['all', 'lead', 'mql', 'opportunity', 'customer', 'evangelist', 'churned'];
    const normalizedStage = validStages.includes(stage as string) ? stage as string : 'all';
    
    // Build where conditions
    const conditions = [];
    
    // Stage filtering
    if (normalizedStage !== 'all') {
      conditions.push(eq(contacts.lifecycleStage, normalizedStage as any));
    }
    
    // Search filtering (name, email, company)
    if (q && typeof q === 'string' && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(contacts.firstName, searchTerm),
          ilike(contacts.lastName, searchTerm),
          ilike(contacts.email, searchTerm),
          ilike(contacts.company, searchTerm)
        )
      );
    }
    
    // Owner filtering (placeholder - not implemented yet)
    if (owner && owner !== 'all') {
      // TODO: Implement owner filtering when owner field is added to schema
      // conditions.push(eq(contacts.ownerId, owner));
    }
    
    // Build final where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get filtered contacts with pagination
    const offset = Math.max(0, (parseInt(page as string) - 1) * parseInt(limit as string));
    const contactsQuery = db
      .select()
      .from(contacts)
      .limit(parseInt(limit as string))
      .offset(offset);
      
    if (whereClause) {
      contactsQuery.where(whereClause);
    }
    
    const contactsResult = await contactsQuery;
    
    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts);
      
    if (whereClause) {
      countQuery.where(whereClause);
    }
    
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;
    
    // Get counts by stage for the stage pills
    const stageCounts = await db
      .select({
        stage: contacts.lifecycleStage,
        count: sql<number>`count(*)::int`
      })
      .from(contacts)
      .groupBy(contacts.lifecycleStage);
    
    // Build counts object including 'all'
    const counts: Record<string, number> = {
      all: contactsResult.length // Total displayed results
    };
    
    stageCounts.forEach(({ stage, count }) => {
      if (stage) {
        counts[stage] = count;
      }
    });
    
    // Also get overall total for 'all' count
    const overallTotalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts);
    
    counts.all = overallTotalResult[0]?.count || 0;
    
    return res.json({
      contacts: contactsResult,
      total,
      counts,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        hasMore: total > offset + contactsResult.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch contacts',
      contacts: [],
      total: 0,
      counts: {}
    });
  }
});

export default router;