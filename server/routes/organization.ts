import { Request, Response, Router } from 'express';
import { storage } from '../storage';
import { createOrganizationScopedStorage } from '../storage/scoped-storage';
import { checkAuth } from '../middleware/auth';
import { db } from '../lib/db';
import { organizations } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/', checkAuth, async (req: Request, res: Response) => {
  try {
    const organizationId = req.organization?.organizationId;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'Organization context required' });
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
    const organizationId = req.organization?.organizationId;
    const userId = (req as any).user?.id;
    
    if (!organizationId) {
      return res.status(400).json({ message: 'Organization context required' });
    }
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { name, subdomain, customDomain, logoUrl, primaryColor } = req.body;
    
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (subdomain !== undefined) updates.subdomain = subdomain;
    if (customDomain !== undefined) updates.customDomain = customDomain;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
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
