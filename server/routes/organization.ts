import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { createOrganizationScopedStorage } from '../storage/scoped-storage';
import { checkAuth } from '../middleware/auth';
import { db } from '../db';
import { organizations, organizationMembers, updateOrganizationSchema } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

router.get('/', checkAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const organizationId = req.organization?.organizationId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!organizationId) {
      return res.status(400).json({ message: 'Organization context required' });
    }
    
    const membership = await db.select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (!membership || membership.length === 0) {
      return res.status(403).json({ message: 'User is not a member of this organization' });
    }
    
    const org = await db.select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    
    if (!org || org.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    return res.json(org[0]);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return res.status(500).json({ message: 'Failed to fetch organization' });
  }
});

router.patch('/', checkAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const organizationId = req.organization?.organizationId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!organizationId) {
      return res.status(400).json({ message: 'Organization context required' });
    }
    
    const membership = await db.select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1);
    
    if (!membership || membership.length === 0) {
      return res.status(403).json({ message: 'User is not a member of this organization' });
    }
    
    const validationResult = updateOrganizationSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid update data', 
        errors: validationResult.error.errors 
      });
    }
    
    const updates = validationResult.data;
    updates.updatedAt = new Date();
    
    const result = await db.update(organizations)
      .set(updates)
      .where(eq(organizations.id, organizationId))
      .returning();
    
    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating organization:', error);
    return res.status(500).json({ message: 'Failed to update organization' });
  }
});

export default router;
