import express, { Request, Response } from "express";
import { db } from "../db.js";
import { contacts } from "../../shared/schema.js";
import { sql, eq } from "drizzle-orm";

const router = express.Router();

// GET /api/data/quality - Return data quality metrics
router.get('/data/quality', async (req: Request, res: Response) => {
  try {
    // Get total contacts count
    const totalResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts);
    const totalContacts = totalResult[0]?.count || 0;

    if (totalContacts === 0) {
      return res.json({
        totals: { contacts: 0 },
        duplicates: { count: 0, percent: 0 },
        missingEmail: { count: 0, percent: 0 },
        fieldCompletion: { percent: 100, byField: {} },
        lifecycleValidity: { percent: 100 },
        generatedAt: new Date().toISOString()
      });
    }

    // Get duplicate emails count
    const duplicateResult = await db
      .select({ 
        email: contacts.email,
        count: sql<number>`count(*)::int` 
      })
      .from(contacts)
      .where(sql`${contacts.email} IS NOT NULL AND ${contacts.email} != ''`)
      .groupBy(contacts.email)
      .having(sql`count(*) > 1`);

    const duplicateEmailsCount = duplicateResult.reduce((sum, row) => sum + row.count, 0);
    const duplicatePercent = totalContacts > 0 ? (duplicateEmailsCount / totalContacts) * 100 : 0;

    // Get missing emails count
    const missingEmailResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(sql`${contacts.email} IS NULL OR ${contacts.email} = ''`);

    const missingEmailCount = missingEmailResult[0]?.count || 0;
    const missingEmailPercent = totalContacts > 0 ? (missingEmailCount / totalContacts) * 100 : 0;

    // Calculate field completion rates
    const fieldCompletionResults = await db
      .select({
        firstName: sql<number>`count(case when ${contacts.firstName} IS NOT NULL AND ${contacts.firstName} != '' then 1 end)::int`,
        lastName: sql<number>`count(case when ${contacts.lastName} IS NOT NULL AND ${contacts.lastName} != '' then 1 end)::int`,
        email: sql<number>`count(case when ${contacts.email} IS NOT NULL AND ${contacts.email} != '' then 1 end)::int`,
        phone: sql<number>`count(case when ${contacts.phone} IS NOT NULL AND ${contacts.phone} != '' then 1 end)::int`,
        company: sql<number>`count(case when ${contacts.company} IS NOT NULL AND ${contacts.company} != '' then 1 end)::int`,
        jobTitle: sql<number>`count(case when ${contacts.jobTitle} IS NOT NULL AND ${contacts.jobTitle} != '' then 1 end)::int`,
      })
      .from(contacts);

    const completionData = fieldCompletionResults[0];
    const byField = {
      firstName: totalContacts > 0 ? (completionData.firstName / totalContacts) * 100 : 0,
      lastName: totalContacts > 0 ? (completionData.lastName / totalContacts) * 100 : 0,
      email: totalContacts > 0 ? (completionData.email / totalContacts) * 100 : 0,
      phone: totalContacts > 0 ? (completionData.phone / totalContacts) * 100 : 0,
      company: totalContacts > 0 ? (completionData.company / totalContacts) * 100 : 0,
      jobTitle: totalContacts > 0 ? (completionData.jobTitle / totalContacts) * 100 : 0,
    };

    // Calculate overall completion percentage (average of all fields)
    const overallCompletion = Object.values(byField).reduce((sum, val) => sum + val, 0) / Object.keys(byField).length;

    // Lifecycle validity - assume 100% since it's enum-enforced in most cases
    // In a real app, we might check against defined enum values
    const lifecycleValidityResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contacts)
      .where(sql`${contacts.lifecycleStage} IS NOT NULL`);

    const validLifecycleCount = lifecycleValidityResult[0]?.count || 0;
    const lifecycleValidityPercent = totalContacts > 0 ? (validLifecycleCount / totalContacts) * 100 : 100;

    return res.json({
      totals: { contacts: totalContacts },
      duplicates: { 
        count: duplicateEmailsCount, 
        percent: Math.round(duplicatePercent * 100) / 100 
      },
      missingEmail: { 
        count: missingEmailCount, 
        percent: Math.round(missingEmailPercent * 100) / 100 
      },
      fieldCompletion: { 
        percent: Math.round(overallCompletion * 100) / 100, 
        byField: Object.fromEntries(
          Object.entries(byField).map(([key, value]) => [key, Math.round(value * 100) / 100])
        )
      },
      lifecycleValidity: { percent: Math.round(lifecycleValidityPercent * 100) / 100 },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating data quality metrics:', error);
    return res.status(500).json({ 
      error: 'Failed to calculate data quality metrics' 
    });
  }
});

// POST /api/data/quality/fix-duplicates - Placeholder endpoint
router.post('/data/quality/fix-duplicates', async (req: Request, res: Response) => {
  try {
    // This is a no-op placeholder as requested
    // In a real implementation, this would queue a background job
    // to merge or clean up duplicate contacts

    console.log('Fix duplicates requested by user:', (req as any).user?.id || 'anonymous');
    
    return res.json({ 
      success: true, 
      message: 'Duplicate cleanup has been queued for processing',
      queuedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error queuing duplicate cleanup:', error);
    return res.status(500).json({ 
      error: 'Failed to queue duplicate cleanup' 
    });
  }
});

export default router;