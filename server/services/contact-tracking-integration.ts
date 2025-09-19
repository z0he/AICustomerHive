import { storage } from "../storage.js";
import { touchpoints } from "../../shared/schema.js";
import { db } from "../db.js";
import { sql, eq, and, desc, gte } from "drizzle-orm";

/**
 * Contact Tracking Integration Service
 * Handles linking contact sources to tracking codes and touchpoint data
 */

export interface UTMData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrerUrl?: string;
  landingPageUrl?: string;
}

export interface ContactSourceIntelligence {
  suggestedSource: string;
  confidence: number;
  reasoning: string;
  touchpointCount: number;
  firstTouchpoint?: any;
  lastTouchpoint?: any;
}

/**
 * Extract UTM parameters from various sources
 */
export function extractUTMFromRequest(req: any): UTMData {
  const utm: UTMData = {};
  
  // Check query parameters
  if (req.query) {
    utm.utmSource = req.query.utm_source || req.query.utmSource;
    utm.utmMedium = req.query.utm_medium || req.query.utmMedium;
    utm.utmCampaign = req.query.utm_campaign || req.query.utmCampaign;
    utm.utmTerm = req.query.utm_term || req.query.utmTerm;
    utm.utmContent = req.query.utm_content || req.query.utmContent;
  }
  
  // Check headers for referrer
  utm.referrerUrl = req.headers.referer || req.headers.referrer;
  
  // Check for landing page from request path
  utm.landingPageUrl = req.headers.host ? `${req.protocol}://${req.headers.host}${req.originalUrl}` : undefined;
  
  return utm;
}

/**
 * Extract UTM parameters from touchpoint metadata
 */
export function extractUTMFromTouchpoint(touchpoint: any): UTMData {
  const utm: UTMData = {};
  
  if (touchpoint.meta?.utm) {
    utm.utmSource = touchpoint.meta.utm.utm_source || touchpoint.meta.utm.source;
    utm.utmMedium = touchpoint.meta.utm.utm_medium || touchpoint.meta.utm.medium;
    utm.utmCampaign = touchpoint.meta.utm.utm_campaign || touchpoint.meta.utm.campaign;
    utm.utmTerm = touchpoint.meta.utm.utm_term || touchpoint.meta.utm.term;
    utm.utmContent = touchpoint.meta.utm.utm_content || touchpoint.meta.utm.content;
  }
  
  if (touchpoint.meta?.url) {
    utm.landingPageUrl = touchpoint.meta.url;
  }
  
  return utm;
}

/**
 * Map UTM source to contact source with intelligence
 */
export function mapUTMToContactSource(utmData: UTMData): string {
  const utmSource = utmData.utmSource?.toLowerCase();
  const utmMedium = utmData.utmMedium?.toLowerCase();
  const referrer = utmData.referrerUrl?.toLowerCase();
  
  // Map based on UTM source
  if (utmSource) {
    switch (utmSource) {
      case 'google':
      case 'bing':
      case 'yahoo':
        return utmMedium === 'cpc' ? 'Paid Search' : 'Organic Search';
      case 'facebook':
      case 'linkedin':
      case 'twitter':
      case 'instagram':
        return 'Social Media';
      case 'email':
      case 'newsletter':
        return 'Email Campaign';
      case 'webinar':
        return 'Webinar';
      case 'tradeshow':
      case 'event':
        return 'Event';
      case 'partner':
      case 'referral':
        return 'Referral';
      case 'content':
      case 'blog':
        return 'Content Marketing';
      default:
        return 'Other';
    }
  }
  
  // Map based on UTM medium
  if (utmMedium) {
    switch (utmMedium) {
      case 'cpc':
      case 'ppc':
      case 'paid':
        return 'Paid Search';
      case 'social':
        return 'Social Media';
      case 'email':
        return 'Email Campaign';
      case 'referral':
        return 'Referral';
      case 'organic':
        return 'Organic Search';
      case 'display':
      case 'banner':
        return 'Advertisement';
      default:
        return 'Other';
    }
  }
  
  // Map based on referrer
  if (referrer) {
    if (referrer.includes('google.com')) return 'Organic Search';
    if (referrer.includes('facebook.com')) return 'Social Media';
    if (referrer.includes('linkedin.com')) return 'Social Media';
    if (referrer.includes('twitter.com')) return 'Social Media';
    if (referrer.includes('bing.com')) return 'Organic Search';
    if (referrer.includes('yahoo.com')) return 'Organic Search';
  }
  
  // Default fallback
  return referrer ? 'Referral' : 'Direct';
}

/**
 * Analyze touchpoint history to suggest contact source with confidence
 */
export async function analyzeContactSourceFromTouchpoints(
  email: string,
  anonymousId?: string
): Promise<ContactSourceIntelligence> {
  try {
    // Get touchpoints for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Query touchpoints by anonymousId
    let whereConditions = [
      eq(touchpoints.type, 'web'),
      gte(touchpoints.occurredAt, thirtyDaysAgo)
    ];
    
    if (anonymousId) {
      whereConditions.push(sql`${touchpoints.meta}->>'anonymousId' = ${anonymousId}`);
    }
    
    const touchpointQuery = db
      .select()
      .from(touchpoints)
      .where(and(...whereConditions))
      .orderBy(desc(touchpoints.occurredAt));
    
    const touchpointData = await touchpointQuery.limit(50);
    
    if (touchpointData.length === 0) {
      return {
        suggestedSource: 'Direct',
        confidence: 50,
        reasoning: 'No recent touchpoint history found',
        touchpointCount: 0
      };
    }
    
    // Analyze first touchpoint (original source)
    const firstTouchpoint = touchpointData[touchpointData.length - 1];
    const lastTouchpoint = touchpointData[0];
    
    // Extract UTM data from first touchpoint
    const firstUTM = extractUTMFromTouchpoint(firstTouchpoint);
    const suggestedSource = mapUTMToContactSource(firstUTM);
    
    // Calculate confidence based on data quality
    let confidence = 60; // Base confidence
    
    if (firstUTM.utmSource) confidence += 20;
    if (firstUTM.utmMedium) confidence += 10;
    if (firstUTM.utmCampaign) confidence += 5;
    if (touchpointData.length > 1) confidence += 5; // Multiple touchpoints
    
    confidence = Math.min(confidence, 95); // Cap at 95%
    
    const reasoning = `Based on ${touchpointData.length} touchpoint(s). ` +
      `First visit from ${firstUTM.utmSource || 'unknown source'} ` +
      `via ${firstUTM.utmMedium || 'unknown medium'}.`;
    
    return {
      suggestedSource,
      confidence,
      reasoning,
      touchpointCount: touchpointData.length,
      firstTouchpoint,
      lastTouchpoint
    };
  } catch (error) {
    console.error('Error analyzing contact source from touchpoints:', error);
    return {
      suggestedSource: 'Direct',
      confidence: 30,
      reasoning: 'Error analyzing touchpoint history',
      touchpointCount: 0
    };
  }
}

/**
 * Auto-stitch anonymous touchpoints to a newly created contact
 */
export async function stitchAnonymousTouchpointsToContact(
  contactId: string,
  email: string,
  anonymousId?: string
): Promise<{ stitched: number; touchpoints: any[] }> {
  try {
    if (!anonymousId) {
      return { stitched: 0, touchpoints: [] };
    }
    
    // Get 30 days ago date
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Update anonymous touchpoints to link them to the contact
    await db
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
    
    // Get the updated touchpoints for return
    const stitchedTouchpoints = await db
      .select()
      .from(touchpoints)
      .where(
        and(
          eq(touchpoints.type, 'web'),
          eq(touchpoints.contactId, contactId),
          sql`${touchpoints.meta}->>'anonymousId' = ${anonymousId}`,
          gte(touchpoints.occurredAt, thirtyDaysAgo)
        )
      );
    
    return {
      stitched: stitchedTouchpoints.length,
      touchpoints: stitchedTouchpoints
    };
  } catch (error) {
    console.error('Error stitching anonymous touchpoints:', error);
    return { stitched: 0, touchpoints: [] };
  }
}

/**
 * Enhanced contact creation with tracking integration
 */
export async function createContactWithTracking(
  contactData: any,
  req: any,
  userId: number
): Promise<{ contact: any; utm: UTMData; sourceIntelligence?: ContactSourceIntelligence; stitched?: number }> {
  try {
    // Extract UTM parameters from request
    const utmFromRequest = extractUTMFromRequest(req);
    
    // Extract anonymousId if provided
    const anonymousId = req.body.anonymousId || req.query.anonymousId || req.headers['x-anonymous-id'];
    
    // Analyze contact source from touchpoints if we have tracking data
    let sourceIntelligence;
    if (anonymousId || contactData.email) {
      sourceIntelligence = await analyzeContactSourceFromTouchpoints(
        contactData.email,
        anonymousId
      );
    }
    
    // Merge UTM data with contact data, prioritizing explicit data
    const enhancedContactData = {
      ...contactData,
      // UTM fields (only set if not already provided)
      utmSource: contactData.utmSource || utmFromRequest.utmSource,
      utmMedium: contactData.utmMedium || utmFromRequest.utmMedium,
      utmCampaign: contactData.utmCampaign || utmFromRequest.utmCampaign,
      utmTerm: contactData.utmTerm || utmFromRequest.utmTerm,
      utmContent: contactData.utmContent || utmFromRequest.utmContent,
      referrerUrl: contactData.referrerUrl || utmFromRequest.referrerUrl,
      landingPageUrl: contactData.landingPageUrl || utmFromRequest.landingPageUrl,
      // Auto-suggest contact source if not provided
      contactSource: contactData.contactSource || 
        (sourceIntelligence && sourceIntelligence.confidence > 70 
          ? sourceIntelligence.suggestedSource 
          : mapUTMToContactSource(utmFromRequest))
    };
    
    // Create the contact (determine if it should be a lead or customer)
    let contact;
    if (enhancedContactData.lifecycleStage === 'customer' || enhancedContactData.lifecycleStage === 'evangelist') {
      // Create as customer
      const customerData = {
        email: enhancedContactData.email,
        firstName: enhancedContactData.firstName || '',
        lastName: enhancedContactData.lastName || '',
        name: enhancedContactData.name || '',
        initials: enhancedContactData.initials || '',
        company: enhancedContactData.company || '',
        jobTitle: enhancedContactData.jobTitle || '',
        industry: enhancedContactData.industry || '',
        country: enhancedContactData.country || '',
        phone: enhancedContactData.phone || '',
        lifecycleStage: enhancedContactData.lifecycleStage,
        status: enhancedContactData.status || 'active',
        contactOwner: enhancedContactData.owner || '',
        contactSource: enhancedContactData.contactSource || '',
        customFields: {
          utmSource: enhancedContactData.utmSource,
          utmMedium: enhancedContactData.utmMedium,
          utmCampaign: enhancedContactData.utmCampaign,
          utmTerm: enhancedContactData.utmTerm,
          utmContent: enhancedContactData.utmContent,
          referrerUrl: enhancedContactData.referrerUrl,
          landingPageUrl: enhancedContactData.landingPageUrl
        }
      };
      contact = await storage.createCustomer(customerData);
    } else {
      // Create as lead
      const leadData = {
        email: enhancedContactData.email,
        firstName: enhancedContactData.firstName || '',
        lastName: enhancedContactData.lastName || '',
        name: enhancedContactData.name || '',
        initials: enhancedContactData.initials || '',
        company: enhancedContactData.company || '',
        jobTitle: enhancedContactData.jobTitle || '',
        industry: enhancedContactData.industry || '',
        country: enhancedContactData.country || '',
        phone: enhancedContactData.phone || '',
        leadStatus: enhancedContactData.status || 'new',
        leadOwner: enhancedContactData.owner || '',
        leadSource: enhancedContactData.contactSource || '',
        score: 0,
        engagementLevel: 0,
        conversionProbability: 0,
        customFields: {
          utmSource: enhancedContactData.utmSource,
          utmMedium: enhancedContactData.utmMedium,
          utmCampaign: enhancedContactData.utmCampaign,
          utmTerm: enhancedContactData.utmTerm,
          utmContent: enhancedContactData.utmContent,
          referrerUrl: enhancedContactData.referrerUrl,
          landingPageUrl: enhancedContactData.landingPageUrl
        }
      };
      contact = await storage.createLead(leadData);
    }
    
    // Auto-stitch anonymous touchpoints if we have anonymousId
    let stitchResult;
    if (anonymousId && contact?.id) {
      // Extract the base contact ID and use it directly for touchpoint stitching
      const contactIdForTouchpoints = String(contact.id); // Use the full prefixed ID
      stitchResult = await stitchAnonymousTouchpointsToContact(
        contactIdForTouchpoints,
        contact.email || '',
        anonymousId
      );
    }
    
    return {
      contact,
      utm: {
        utmSource: enhancedContactData.utmSource,
        utmMedium: enhancedContactData.utmMedium,
        utmCampaign: enhancedContactData.utmCampaign,
        utmTerm: enhancedContactData.utmTerm,
        utmContent: enhancedContactData.utmContent,
        referrerUrl: enhancedContactData.referrerUrl,
        landingPageUrl: enhancedContactData.landingPageUrl
      },
      sourceIntelligence,
      stitched: stitchResult?.stitched
    };
  } catch (error) {
    console.error('Error creating contact with tracking:', error);
    throw error;
  }
}