import { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { organizations } from "@shared/schema";
import { eq, or } from "drizzle-orm";

export interface OrganizationContext {
  organizationId: number;
  organization: {
    id: number;
    name: string;
    slug: string;
    subdomain: string | null;
    customDomain: string | null;
  };
}

declare global {
  namespace Express {
    interface Request {
      organization?: OrganizationContext;
    }
  }
}

export async function organizationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const host = req.hostname;
    
    let subdomain: string | null = null;
    let customDomain: string | null = null;
    
    if (host.includes('aicrm.co.uk')) {
      const parts = host.split('.');
      if (parts.length > 2) {
        subdomain = parts[0];
      } else {
        subdomain = 'app';
      }
    } else if (host.includes('replit')) {
      subdomain = 'app';
    } else {
      customDomain = host;
    }
    
    let org;
    if (customDomain) {
      const result = await db
        .select()
        .from(organizations)
        .where(eq(organizations.customDomain, customDomain))
        .limit(1);
      org = result[0];
    } else if (subdomain) {
      const result = await db
        .select()
        .from(organizations)
        .where(eq(organizations.subdomain, subdomain))
        .limit(1);
      org = result[0];
    }
    
    if (!org) {
      const defaultResult = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, 'default'))
        .limit(1);
      org = defaultResult[0];
    }
    
    if (!org) {
      return res.status(404).json({
        error: 'Organization not found',
        message: 'The organization for this domain could not be found.'
      });
    }
    
    req.organization = {
      organizationId: org.id,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        subdomain: org.subdomain,
        customDomain: org.customDomain
      }
    };
    
    next();
  } catch (error) {
    console.error('Organization middleware error:', error);
    next(error);
  }
}
