/**
 * Journey Integration Service
 * 
 * This service coordinates between Customer Journey Mapping and other CRM systems:
 * - Lead Integration: Auto-create touchpoints for lead activities
 * - Campaign Integration: Track campaign interactions as touchpoints  
 * - Tracking Integration: Connect website visits to customer journey
 */

import { storage } from '../storage.js';
import type { 
  InsertCustomerTouchpoint, 
  Lead, 
  Campaign, 
  CustomerTouchpoint 
} from '../../shared/schema.js';

export class JourneyIntegrationService {
  
  /**
   * LEAD INTEGRATION METHODS
   */
  
  // Create touchpoint when a new lead is created
  async createLeadCreationTouchpoint(lead: Lead, userId: number): Promise<CustomerTouchpoint | null> {
    try {
      // Find or create customer record for this lead
      let customerId = await this.findOrCreateCustomerForLead(lead);
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        leadId: lead.id,
        relatedLeadId: lead.id,
        touchpointType: 'lead_created',
        touchpointStage: 'awareness',
        channel: lead.leadSource || 'unknown',
        source: lead.leadSource || 'unknown',
        medium: 'crm',
        campaign: null,
        content: `New lead: ${lead.name}`,
        description: `Lead created for ${lead.name} from ${lead.company || 'Unknown Company'}`,
        value: 0,
        outcome: 'positive',
        score: Math.min(lead.score || 0, 100),
        metadata: {
          leadId: lead.id,
          leadSource: lead.leadSource,
          industry: lead.industry,
          company: lead.company,
          integrationSource: 'lead_management'
        },
        userId
      };
      
      return await storage.createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create lead creation touchpoint:', error);
      return null;
    }
  }
  
  // Create touchpoint when lead status changes
  async createLeadStatusChangeTouchpoint(
    leadId: number, 
    oldStatus: string, 
    newStatus: string, 
    userId: number
  ): Promise<CustomerTouchpoint | null> {
    try {
      const lead = await storage.getLead(leadId);
      if (!lead) return null;
      
      let customerId = await this.findOrCreateCustomerForLead(lead);
      
      // Determine journey stage based on lead status
      const journeyStage = this.mapLeadStatusToJourneyStage(newStatus);
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        leadId,
        relatedLeadId: leadId,
        touchpointType: 'lead_status_change',
        touchpointStage: journeyStage,
        channel: 'crm',
        source: 'lead_management',
        medium: 'internal',
        campaign: null,
        content: `Status changed: ${oldStatus} → ${newStatus}`,
        description: `Lead status updated from ${oldStatus} to ${newStatus}`,
        value: this.calculateStatusChangeValue(newStatus),
        outcome: this.isPositiveStatusChange(oldStatus, newStatus) ? 'positive' : 'neutral',
        score: lead.score || 0,
        metadata: {
          leadId,
          oldStatus,
          newStatus,
          leadScore: lead.score,
          integrationSource: 'lead_management'
        },
        userId
      };
      
      // Update lead's current journey stage
      if (journeyStage) {
        const journeyStages = await storage.getJourneyStages();
        const stage = journeyStages.find(s => s.name.toLowerCase() === journeyStage);
        if (stage) {
          await storage.updateLead(leadId, { 
            currentJourneyStageId: stage.id,
            journeyEntryDate: lead.journeyEntryDate || new Date()
          });
        }
      }
      
      return await storage.createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create lead status change touchpoint:', error);
      return null;
    }
  }
  
  // Create touchpoint when lead score changes significantly
  async createLeadScoreChangeTouchpoint(
    leadId: number, 
    oldScore: number, 
    newScore: number, 
    userId: number
  ): Promise<CustomerTouchpoint | null> {
    try {
      // Only create touchpoint for significant score changes (>10 points)
      if (Math.abs(newScore - oldScore) < 10) return null;
      
      const lead = await storage.getLead(leadId);
      if (!lead) return null;
      
      let customerId = await this.findOrCreateCustomerForLead(lead);
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        leadId,
        relatedLeadId: leadId,
        touchpointType: 'lead_score_change',
        touchpointStage: this.mapLeadStatusToJourneyStage(lead.leadStatus || 'new'),
        channel: 'crm',
        source: 'lead_scoring',
        medium: 'automated',
        campaign: null,
        content: `Score changed: ${oldScore} → ${newScore}`,
        description: `Lead score updated by ${newScore - oldScore} points`,
        value: 0,
        outcome: newScore > oldScore ? 'positive' : 'negative',
        score: newScore,
        metadata: {
          leadId,
          oldScore,
          newScore,
          scoreChange: newScore - oldScore,
          integrationSource: 'lead_scoring'
        },
        userId
      };
      
      return await storage.createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create lead score change touchpoint:', error);
      return null;
    }
  }
  
  /**
   * CAMPAIGN INTEGRATION METHODS
   */
  
  // Create touchpoint when campaign email is sent
  async createCampaignEmailSentTouchpoint(
    campaignId: number,
    recipientEmail: string,
    userId: number
  ): Promise<CustomerTouchpoint | null> {
    try {
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return null;
      
      // Find customer/lead by email
      const customerId = await this.findCustomerByEmail(recipientEmail);
      if (!customerId) return null;
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        relatedCampaignId: campaignId,
        touchpointType: 'email_sent',
        touchpointStage: 'consideration',
        channel: 'email',
        source: 'campaign',
        medium: 'email',
        campaign: campaign.name,
        content: `Campaign email: ${campaign.name}`,
        description: `Email sent from campaign "${campaign.name}" to ${recipientEmail}`,
        value: 0,
        outcome: 'neutral',
        score: 10, // Base score for email sent
        metadata: {
          campaignId,
          campaignName: campaign.name,
          campaignType: campaign.type,
          recipientEmail,
          integrationSource: 'campaign_management'
        },
        userId
      };
      
      return await storage.createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create campaign email sent touchpoint:', error);
      return null;
    }
  }
  
  // Create touchpoint when campaign email is opened
  async createCampaignEmailOpenTouchpoint(
    campaignId: number,
    recipientEmail: string,
    userId: number
  ): Promise<CustomerTouchpoint | null> {
    try {
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return null;
      
      const customerId = await this.findCustomerByEmail(recipientEmail);
      if (!customerId) return null;
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        relatedCampaignId: campaignId,
        touchpointType: 'email_open',
        touchpointStage: 'consideration',
        channel: 'email',
        source: 'campaign',
        medium: 'email',
        campaign: campaign.name,
        content: `Opened: ${campaign.name}`,
        description: `Email opened from campaign "${campaign.name}"`,
        value: 0,
        outcome: 'positive',
        score: 25, // Higher score for email opens
        metadata: {
          campaignId,
          campaignName: campaign.name,
          recipientEmail,
          integrationSource: 'campaign_management'
        },
        userId
      };
      
      return await storage.createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create campaign email open touchpoint:', error);
      return null;
    }
  }
  
  // Create touchpoint when campaign email link is clicked
  async createCampaignEmailClickTouchpoint(
    campaignId: number,
    recipientEmail: string,
    clickedUrl: string,
    userId: number
  ): Promise<CustomerTouchpoint | null> {
    try {
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return null;
      
      const customerId = await this.findCustomerByEmail(recipientEmail);
      if (!customerId) return null;
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        relatedCampaignId: campaignId,
        touchpointType: 'email_click',
        touchpointStage: 'decision',
        channel: 'email',
        source: 'campaign',
        medium: 'email',
        campaign: campaign.name,
        content: `Clicked: ${clickedUrl}`,
        description: `Link clicked from campaign "${campaign.name}": ${clickedUrl}`,
        value: 0,
        outcome: 'positive',
        score: 40, // High score for email clicks (strong engagement)
        metadata: {
          campaignId,
          campaignName: campaign.name,
          recipientEmail,
          clickedUrl,
          integrationSource: 'campaign_management'
        },
        userId
      };
      
      return await storage.createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create campaign email click touchpoint:', error);
      return null;
    }
  }
  
  /**
   * TRACKING INTEGRATION METHODS
   */
  
  // Create touchpoint when visitor lands on tracked website
  async createWebsiteVisitTouchpoint(
    trackingInstallationId: number,
    visitorData: {
      visitorId: string;
      pageUrl: string;
      referrer?: string;
      userAgent?: string;
      ipAddress?: string;
    },
    userId: number
  ): Promise<CustomerTouchpoint | null> {
    try {
      const installation = await storage.getTrackingInstallation(trackingInstallationId);
      if (!installation) return null;
      
      // Try to identify customer by visitor ID or create anonymous customer
      let customerId = await this.findOrCreateAnonymousCustomer(visitorData.visitorId);
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        relatedTrackingId: trackingInstallationId,
        touchpointType: 'website_visit',
        touchpointStage: 'awareness',
        channel: 'website',
        source: 'direct',
        medium: 'website',
        campaign: null,
        content: visitorData.pageUrl,
        description: `Website visit to ${visitorData.pageUrl}`,
        value: 0,
        outcome: 'positive',
        score: 5, // Base score for website visits
        landingPage: visitorData.pageUrl,
        referrerUrl: visitorData.referrer,
        userAgent: visitorData.userAgent,
        ipAddress: visitorData.ipAddress,
        metadata: {
          trackingInstallationId,
          websiteUrl: installation.websiteUrl,
          visitorId: visitorData.visitorId,
          integrationSource: 'website_tracking'
        },
        userId
      };
      
      return await storage.createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create website visit touchpoint:', error);
      return null;
    }
  }
  
  /**
   * HELPER METHODS
   */
  
  private async findOrCreateCustomerForLead(lead: Lead): Promise<number> {
    // Try to find existing customer by email
    if (lead.email) {
      const customerId = await this.findCustomerByEmail(lead.email);
      if (customerId) return customerId;
    }
    
    // Create new customer from lead data
    const customerData = {
      email: lead.email || `lead-${lead.id}@unknown.com`,
      firstName: lead.name.split(' ')[0] || lead.name,
      lastName: lead.name.split(' ').slice(1).join(' ') || '',
      phone: lead.phone,
      company: lead.company,
      jobTitle: lead.jobTitle,
      industry: lead.industry,
      location: lead.location,
      lifecycleStage: 'lead',
      leadSource: lead.leadSource,
      tags: lead.tags,
      userId: 1 // Default user for system-created customers
    };
    
    try {
      const customer = await storage.createCustomer(customerData);
      return customer.id;
    } catch (error) {
      console.error('Failed to create customer for lead:', error);
      // Return a default customer ID if creation fails
      return 1;
    }
  }
  
  private async findCustomerByEmail(email: string): Promise<number | null> {
    try {
      const customers = await storage.getCustomers();
      const customer = customers.find(c => c.email === email);
      return customer?.id || null;
    } catch (error) {
      console.error('Failed to find customer by email:', error);
      return null;
    }
  }
  
  private async findOrCreateAnonymousCustomer(visitorId: string): Promise<number> {
    try {
      // Try to find existing customer by visitor ID in metadata
      const touchpoints = await storage.getCustomerTouchpoints();
      const existingTouchpoint = touchpoints.find(tp => 
        tp.metadata && 
        typeof tp.metadata === 'object' && 
        'visitorId' in tp.metadata && 
        tp.metadata.visitorId === visitorId
      );
      
      if (existingTouchpoint) {
        return existingTouchpoint.customerId;
      }
      
      // Create anonymous customer
      const customerData = {
        email: `anonymous-${visitorId}@visitor.com`,
        firstName: 'Anonymous',
        lastName: 'Visitor',
        lifecycleStage: 'visitor',
        userId: 1 // Default user for system-created customers
      };
      
      const customer = await storage.createCustomer(customerData);
      return customer.id;
    } catch (error) {
      console.error('Failed to find or create anonymous customer:', error);
      return 1; // Return default customer ID
    }
  }
  
  private mapLeadStatusToJourneyStage(leadStatus: string): string {
    const statusMap: Record<string, string> = {
      'new': 'awareness',
      'contacted': 'awareness', 
      'qualified': 'consideration',
      'proposal': 'decision',
      'negotiation': 'decision',
      'won': 'retention',
      'lost': 'awareness' // Back to awareness for re-engagement
    };
    
    return statusMap[leadStatus] || 'awareness';
  }
  
  private calculateStatusChangeValue(newStatus: string): number {
    const statusValues: Record<string, number> = {
      'new': 0,
      'contacted': 100,
      'qualified': 500,
      'proposal': 1000,
      'negotiation': 2000,
      'won': 5000,
      'lost': 0
    };
    
    return statusValues[newStatus] || 0;
  }
  
  private isPositiveStatusChange(oldStatus: string, newStatus: string): boolean {
    const statusOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'];
    const oldIndex = statusOrder.indexOf(oldStatus);
    const newIndex = statusOrder.indexOf(newStatus);
    
    return newIndex > oldIndex;
  }
}

// Export singleton instance
export const journeyIntegration = new JourneyIntegrationService();