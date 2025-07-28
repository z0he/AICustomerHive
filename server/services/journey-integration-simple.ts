/**
 * Journey Integration Service - Simplified Version
 * 
 * This service coordinates between Customer Journey Mapping and other CRM systems
 */

import { storage } from '../storage.js';
import type { 
  InsertCustomerTouchpoint, 
  Lead, 
  Campaign
} from '../../shared/schema.js';

export class JourneyIntegrationService {
  
  /**
   * Create touchpoint when a new lead is created
   */
  async createLeadCreationTouchpoint(lead: Lead, userId: number): Promise<void> {
    try {
      // Find or create customer record for this lead
      let customerId = await this.findOrCreateCustomerForLead(lead);
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        leadId: lead.id,
        relatedLeadId: lead.id || undefined,
        touchpointType: 'lead_created',
        touchpointStage: 'awareness',
        channel: lead.leadSource || 'unknown',
        source: lead.leadSource || 'unknown',
        medium: 'crm',
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
      
      await (storage as any).createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create lead creation touchpoint:', error);
    }
  }
  
  /**
   * Create touchpoint when lead status changes
   */
  async createLeadStatusChangeTouchpoint(
    leadId: number, 
    oldStatus: string, 
    newStatus: string, 
    userId: number
  ): Promise<void> {
    try {
      const lead = await storage.getLead(leadId);
      if (!lead) return;
      
      let customerId = await this.findOrCreateCustomerForLead(lead);
      
      // Determine journey stage based on lead status
      const journeyStage = this.mapLeadStatusToJourneyStage(newStatus);
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        leadId,
        relatedLeadId: leadId || undefined,
        touchpointType: 'lead_status_change',
        touchpointStage: journeyStage,
        channel: 'crm',
        source: 'lead_management',
        medium: 'internal',
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
      
      await (storage as any).createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create lead status change touchpoint:', error);
    }
  }
  
  /**
   * Create touchpoint when campaign email is sent
   */
  async createCampaignEmailSentTouchpoint(
    campaignId: number,
    recipientEmail: string,
    userId: number
  ): Promise<void> {
    try {
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) return;
      
      // Find customer/lead by email
      const customerId = await this.findCustomerByEmail(recipientEmail);
      if (!customerId) return;
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        relatedCampaignId: campaignId || undefined,
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
        score: 10,
        metadata: {
          campaignId,
          campaignName: campaign.name,
          campaignType: campaign.type,
          recipientEmail,
          integrationSource: 'campaign_management'
        },
        userId
      };
      
      await (storage as any).createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create campaign email sent touchpoint:', error);
    }
  }
  
  /**
   * Create touchpoint when website visitor is tracked
   */
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
  ): Promise<void> {
    try {
      const installation = await storage.getTrackingInstallation(trackingInstallationId);
      if (!installation) return;
      
      // Try to identify customer by visitor ID or create anonymous customer
      let customerId = await this.findOrCreateAnonymousCustomer(visitorData.visitorId);
      
      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        relatedTrackingId: trackingInstallationId || undefined,
        touchpointType: 'website_visit',
        touchpointStage: 'awareness',
        channel: 'website',
        source: 'direct',
        medium: 'website',
        content: visitorData.pageUrl,
        description: `Website visit to ${visitorData.pageUrl}`,
        value: 0,
        outcome: 'positive',
        score: 5,
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
      
      await (storage as any).createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create website visit touchpoint:', error);
    }
  }
  
  /**
   * Helper Methods
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
      return 1; // Return default customer ID if creation fails
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
      const touchpoints = await (storage as any).getCustomerTouchpoints();
      const existingTouchpoint = touchpoints.find((tp: any) => 
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
        userId: 1
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
      'lost': 'awareness'
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