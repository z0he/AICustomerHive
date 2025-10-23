import { Router } from "express";
import { z } from "zod";
import { unifiedJourneyService } from "../services/unified-journey-service.js";
import { storage } from "../storage.js";
import type { IStorage } from '../storage';
import { createOrganizationScopedStorage } from '../storage/scoped-storage';
import { Contact } from "@shared/schema";

const router = Router();

// Helper function to get organization-scoped storage
function getScopedStorage(req: Request): IStorage {
  if (req.organization?.organizationId) {
    return createOrganizationScopedStorage(storage, req.organization.organizationId);
  }
  throw new Error("Organization context required but not found");
}

/**
 * GET /api/contacts/:id/journey-analytics
 * Get journey analytics for a specific contact
 */
router.get('/contacts/:id/journey-analytics', async (req, res) => {
  try {
    // Parse contact ID - handle both "lead_56" and "customer_4" formats
    const contactIdParam = req.params.id;
    let contactId: number;
    
    if (contactIdParam.startsWith('lead_')) {
      contactId = parseInt(contactIdParam.replace('lead_', ''));
    } else if (contactIdParam.startsWith('customer_')) {
      contactId = parseInt(contactIdParam.replace('customer_', ''));
    } else {
      contactId = parseInt(contactIdParam);
    }
    
    const { contactType } = req.query;
    
    if (!contactType || (contactType !== 'lead' && contactType !== 'customer')) {
      return res.status(400).json({ error: 'contactType query parameter is required (lead or customer)' });
    }

    const analytics = await unifiedJourneyService.getContactJourneyAnalytics(
      contactId, 
      contactType as 'lead' | 'customer'
    );

    if (!analytics) {
      return res.status(404).json({ error: 'No journey data found for this contact' });
    }

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching contact journey analytics:', error);
    res.status(500).json({ error: 'Failed to fetch journey analytics' });
  }
});

/**
 * GET /api/contacts/:id/touchpoints
 * Get all touchpoints for a specific contact
 */
router.get('/contacts/:id/touchpoints', async (req, res) => {
  try {
    // Parse contact ID - handle both "lead_56" and "customer_4" formats
    const contactIdParam = req.params.id;
    let contactId: number;
    
    if (contactIdParam.startsWith('lead_')) {
      contactId = parseInt(contactIdParam.replace('lead_', ''));
    } else if (contactIdParam.startsWith('customer_')) {
      contactId = parseInt(contactIdParam.replace('customer_', ''));
    } else {
      contactId = parseInt(contactIdParam);
    }
    
    const { contactType } = req.query;
    
    if (!contactType || (contactType !== 'lead' && contactType !== 'customer')) {
      return res.status(400).json({ error: 'contactType query parameter is required (lead or customer)' });
    }

    const allTouchpoints = await scopedStorage.getCustomerTouchpoints();
    const contactTouchpoints = allTouchpoints.filter(t => {
      if (contactType === 'lead') {
        return t.leadId === contactId;
      } else {
        return t.customerId === contactId;
      }
    });

    // Sort by creation date (newest first)
    contactTouchpoints.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json(contactTouchpoints);
  } catch (error) {
    console.error('Error fetching contact touchpoints:', error);
    res.status(500).json({ error: 'Failed to fetch touchpoints' });
  }
});

/**
 * POST /api/contacts/:id/touchpoints
 * Create a new touchpoint for a contact
 */
router.post('/contacts/:id/touchpoints', async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const { contactType } = req.query;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!contactType || (contactType !== 'lead' && contactType !== 'customer')) {
      return res.status(400).json({ error: 'contactType query parameter is required (lead or customer)' });
    }

    // Get the contact data
    let contact: Contact | null = null;
    if (contactType === 'lead') {
      const lead = await scopedStorage.getLead(contactId);
      if (lead) {
        contact = {
          ...lead,
          contactType: 'lead',
          initials: lead.initials || lead.name?.charAt(0) || 'L'
        } as Contact;
      }
    } else {
      const customer = await scopedStorage.getCustomer(contactId);
      if (customer) {
        contact = {
          id: customer.id,
          name: `${customer.firstName} ${customer.lastName}`.trim(),
          email: customer.email,
          phone: customer.phone,
          company: customer.company,
          jobTitle: customer.jobTitle,
          industry: customer.industry,
          contactType: 'customer',
          lifecycleStage: customer.lifecycleStage,
          contactOwner: customer.contactOwner,
          contactSource: customer.contactSource,
          country: customer.country,
          linkedinUrl: customer.linkedinUrl,
          location: customer.location,
          initials: customer.firstName?.charAt(0) + customer.lastName?.charAt(0) || 'C',
          createdAt: customer.createdAt,
          currentJourneyStageId: customer.currentJourneyStageId,
          journeyEntryDate: customer.journeyEntryDate
        } as Contact;
      }
    }

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Create touchpoint using unified service
    const touchpoint = await unifiedJourneyService.createUnifiedTouchpoint(
      contact,
      req.body,
      userId
    );

    if (!touchpoint) {
      return res.status(500).json({ error: 'Failed to create touchpoint' });
    }

    res.status(201).json(touchpoint);
  } catch (error) {
    console.error('Error creating contact touchpoint:', error);
    res.status(500).json({ error: 'Failed to create touchpoint' });
  }
});

/**
 * POST /api/leads/:id/convert
 * Convert a lead to customer and create conversion touchpoint
 */
router.post('/leads/:id/convert', async (req, res) => {
  try {
    const leadId = parseInt(req.params.id);
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const lead = await scopedStorage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Create or find customer record
    const customerData = {
      email: lead.email,
      firstName: lead.name.split(' ')[0] || lead.name,
      lastName: lead.name.split(' ').slice(1).join(' ') || '',
      phone: lead.phone || null,
      company: lead.company || null,
      jobTitle: lead.jobTitle || null,
      industry: lead.industry || null,
      location: lead.location || null,
      lifecycleStage: 'onboarding' as const,
      contactOwner: lead.leadOwner || null,
      contactSource: lead.leadSource || null,
      legalBasis: 'legitimate_interest' as const,
      currentJourneyStageId: lead.currentJourneyStageId || null,
      journeyEntryDate: lead.journeyEntryDate || new Date()
    };

    const customer = await scopedStorage.createCustomer(customerData);

    // Create conversion touchpoint
    const conversionTouchpoint = await unifiedJourneyService.createLeadConversionTouchpoint(
      leadId,
      customer.id,
      userId
    );

    // Update lead status to 'won'
    await scopedStorage.updateLead(leadId, { leadStatus: 'won' });

    res.json({
      customer,
      conversionTouchpoint,
      message: 'Lead successfully converted to customer'
    });
  } catch (error) {
    console.error('Error converting lead to customer:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

/**
 * GET /api/unified-journey/overview
 * Get overall journey analytics across all contacts
 */
router.get('/unified-journey/overview', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get all touchpoints
    const allTouchpoints = await scopedStorage.getCustomerTouchpoints();
    const userTouchpoints = allTouchpoints.filter(t => t.userId === userId);

    // Analyze journey stage distribution
    const stageDistribution = userTouchpoints.reduce((acc, touchpoint) => {
      const stage = touchpoint.touchpointStage;
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average journey scores by stage
    const stageScores = userTouchpoints.reduce((acc, touchpoint) => {
      const stage = touchpoint.touchpointStage;
      if (!acc[stage]) acc[stage] = { total: 0, count: 0 };
      acc[stage].total += touchpoint.score || 0;
      acc[stage].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const avgStageScores = Object.entries(stageScores).reduce((acc, [stage, data]) => {
      acc[stage] = Math.round(data.total / data.count);
      return acc;
    }, {} as Record<string, number>);

    // Get recent high-value touchpoints
    const recentHighValueTouchpoints = userTouchpoints
      .filter(t => (t.score || 0) >= 70)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    res.json({
      totalTouchpoints: userTouchpoints.length,
      stageDistribution,
      avgStageScores,
      recentHighValueTouchpoints,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching unified journey overview:', error);
    res.status(500).json({ error: 'Failed to fetch journey overview' });
  }
});

export default router;