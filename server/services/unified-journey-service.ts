import { storage } from "../storage.js";
import { 
  InsertCustomerTouchpoint, 
  CustomerTouchpoint,
  JourneyStage,
  Lead, 
  Customer,
  Contact 
} from "@shared/schema";

/**
 * Unified Journey Service - Phase 3: Journey Mapping Clarity
 * 
 * This service provides a clear, unified approach to customer journey mapping
 * that works seamlessly with the unified contact system.
 */
export class UnifiedJourneyService {
  
  // Enhanced journey stage mapping with clear progression rules
  private readonly JOURNEY_STAGE_MAPPING = {
    // Lead stages -> Journey stages
    lead_stages: {
      'new': { stage: 'awareness', score: 10, description: 'Initial contact created' },
      'contacted': { stage: 'awareness', score: 25, description: 'First contact established' },
      'qualified': { stage: 'consideration', score: 40, description: 'Lead qualified as prospect' },
      'proposal': { stage: 'decision', score: 70, description: 'Proposal presented' },
      'negotiation': { stage: 'decision', score: 85, description: 'Active negotiation' },
      'won': { stage: 'onboarding', score: 100, description: 'Lead converted to customer' },
      'lost': { stage: 'awareness', score: 5, description: 'Re-engagement opportunity' }
    },
    // Customer lifecycle stages -> Journey stages  
    customer_stages: {
      'onboarding': { stage: 'onboarding', score: 100, description: 'New customer onboarding' },
      'active': { stage: 'retention', score: 90, description: 'Active customer relationship' },
      'at_risk': { stage: 'retention', score: 30, description: 'Customer at risk of churn' },
      'churned': { stage: 'awareness', score: 10, description: 'Win-back opportunity' },
      'advocate': { stage: 'advocacy', score: 100, description: 'Customer advocate/promoter' }
    }
  };

  // Journey stage priorities for determining current stage
  private readonly STAGE_PRIORITIES = {
    'awareness': 1,
    'consideration': 2, 
    'decision': 3,
    'onboarding': 4,
    'retention': 5,
    'advocacy': 6
  };

  /**
   * Create a unified touchpoint for any contact (lead or customer)
   */
  async createUnifiedTouchpoint(
    contact: Contact,
    touchpointData: Partial<InsertCustomerTouchpoint>,
    userId: number
  ): Promise<CustomerTouchpoint | null> {
    try {
      // Determine the appropriate journey stage
      const journeyStage = this.determineJourneyStage(contact);
      
      // Find or create customer record
      let customerId: number;
      if (contact.contactType === 'customer') {
        customerId = contact.id;
      } else {
        // For leads, find or create associated customer
        customerId = await this.findOrCreateCustomerForContact(contact);
      }

      const unifiedTouchpointData: InsertCustomerTouchpoint = {
        customerId,
        leadId: contact.contactType === 'lead' ? contact.id : null,
        touchpointType: touchpointData.touchpointType || 'contact_interaction',
        touchpointStage: journeyStage,
        channel: touchpointData.channel || 'crm',
        source: touchpointData.source || 'unified_system',
        medium: touchpointData.medium || 'internal',
        campaign: touchpointData.campaign || null,
        content: touchpointData.content || `Interaction with ${contact.name}`,
        description: touchpointData.description || `${contact.contactType} interaction`,
        value: touchpointData.value || 0,
        outcome: touchpointData.outcome || 'neutral',
        score: this.calculateTouchpointScore(contact, journeyStage),
        metadata: {
          contactId: contact.id,
          contactType: contact.contactType,
          journeyStage,
          unifiedSystem: true,
          ...touchpointData.metadata
        },
        userId,
        ...touchpointData
      };

      const touchpoint = await storage.createCustomerTouchpoint(unifiedTouchpointData);
      
      // Update contact's journey stage if this touchpoint advances them
      await this.updateContactJourneyStage(contact, journeyStage);
      
      return touchpoint;
    } catch (error) {
      console.error('Failed to create unified touchpoint:', error);
      return null;
    }
  }

  /**
   * Determine the appropriate journey stage for a contact
   */
  private determineJourneyStage(contact: Contact): string {
    if (contact.contactType === 'lead') {
      const leadStage = this.JOURNEY_STAGE_MAPPING.lead_stages[contact.leadStatus as keyof typeof this.JOURNEY_STAGE_MAPPING.lead_stages];
      return leadStage?.stage || 'awareness';
    } else {
      const customerStage = this.JOURNEY_STAGE_MAPPING.customer_stages[contact.lifecycleStage as keyof typeof this.JOURNEY_STAGE_MAPPING.customer_stages];
      return customerStage?.stage || 'retention';
    }
  }

  /**
   * Calculate touchpoint score based on contact and journey stage
   */
  private calculateTouchpointScore(contact: Contact, journeyStage: string): number {
    let baseScore = 50; // Default neutral score
    
    // Add contact-specific scoring
    if (contact.contactType === 'lead' && contact.score) {
      baseScore = Math.min(contact.score, 100);
    }
    
    // Adjust based on journey stage
    const stageMultiplier = {
      'awareness': 0.6,
      'consideration': 0.8, 
      'decision': 1.2,
      'onboarding': 1.0,
      'retention': 0.9,
      'advocacy': 1.3
    };
    
    return Math.round(baseScore * (stageMultiplier[journeyStage as keyof typeof stageMultiplier] || 1.0));
  }

  /**
   * Update contact's current journey stage
   */
  private async updateContactJourneyStage(contact: Contact, newStage: string): Promise<void> {
    try {
      const journeyStages = await storage.getJourneyStages();
      const stage = journeyStages.find(s => s.name.toLowerCase().includes(newStage));
      
      if (stage) {
        const updateData = {
          currentJourneyStageId: stage.id,
          journeyEntryDate: contact.journeyEntryDate || new Date()
        };

        if (contact.contactType === 'lead') {
          await storage.updateLead(contact.id, updateData);
        } else {
          await storage.updateCustomer(contact.id, updateData);
        }
      }
    } catch (error) {
      console.error('Failed to update contact journey stage:', error);
    }
  }

  /**
   * Find or create customer record for a contact (unified approach)
   */
  private async findOrCreateCustomerForContact(contact: Contact): Promise<number> {
    // Try to find existing customer by email
    const customers = await storage.getCustomers();
    const existingCustomer = customers.find(c => 
      c.email?.toLowerCase() === contact.email?.toLowerCase()
    );
    
    if (existingCustomer) {
      return existingCustomer.id;
    }

    // Create new customer from contact data
    const customerData = {
      email: contact.email,
      firstName: contact.name.split(' ')[0] || contact.name,
      lastName: contact.name.split(' ').slice(1).join(' ') || '',
      phone: contact.phone || null,
      company: contact.company || null,
      jobTitle: contact.jobTitle || null,
      industry: contact.industry || null,
      location: contact.location || null,
      linkedinUrl: contact.linkedinUrl || null,
      lifecycleStage: 'onboarding', // New customer from lead conversion
      contactOwner: contact.leadOwner || contact.contactOwner || null,
      contactSource: contact.leadSource || contact.contactSource || null,
      country: contact.country || null,
      legalBasis: 'legitimate_interest',
      currentJourneyStageId: contact.currentJourneyStageId || null,
      journeyEntryDate: contact.journeyEntryDate || new Date()
    };

    const newCustomer = await storage.createCustomer(customerData);
    return newCustomer.id;
  }

  /**
   * Get unified journey analytics for a contact
   */
  async getContactJourneyAnalytics(contactId: number, contactType: 'lead' | 'customer'): Promise<{
    currentStage: string;
    stageHistory: Array<{ stage: string; date: Date; touchpoints: number }>;
    journeyScore: number;
    timeInStage: number; // days
    nextRecommendedAction: string;
  } | null> {
    try {
      // Get all touchpoints for this contact
      const allTouchpoints = await storage.getCustomerTouchpoints();
      const contactTouchpoints = allTouchpoints.filter(t => 
        (contactType === 'lead' && t.leadId === contactId) ||
        (contactType === 'customer' && t.customerId === contactId)
      );

      if (contactTouchpoints.length === 0) {
        return null;
      }

      // Analyze journey progression
      const stageHistory = this.analyzeStageProgression(contactTouchpoints);
      const currentStage = stageHistory[stageHistory.length - 1]?.stage || 'awareness';
      const journeyScore = this.calculateJourneyScore(contactTouchpoints);
      const timeInStage = this.calculateTimeInCurrentStage(stageHistory);
      const nextRecommendedAction = this.getNextRecommendedAction(currentStage, contactType, timeInStage);

      return {
        currentStage,
        stageHistory,
        journeyScore,
        timeInStage,
        nextRecommendedAction
      };
    } catch (error) {
      console.error('Failed to get contact journey analytics:', error);
      return null;
    }
  }

  /**
   * Analyze stage progression from touchpoints
   */
  private analyzeStageProgression(touchpoints: CustomerTouchpoint[]): Array<{ stage: string; date: Date; touchpoints: number }> {
    const stageMap = new Map<string, { date: Date; count: number }>();
    
    touchpoints
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .forEach(touchpoint => {
        const stage = touchpoint.touchpointStage;
        if (!stageMap.has(stage)) {
          stageMap.set(stage, { date: new Date(touchpoint.createdAt), count: 0 });
        }
        stageMap.get(stage)!.count++;
      });

    return Array.from(stageMap.entries())
      .map(([stage, data]) => ({
        stage,
        date: data.date,
        touchpoints: data.count
      }))
      .sort((a, b) => (this.STAGE_PRIORITIES[a.stage as keyof typeof this.STAGE_PRIORITIES] || 0) - 
                      (this.STAGE_PRIORITIES[b.stage as keyof typeof this.STAGE_PRIORITIES] || 0));
  }

  /**
   * Calculate overall journey score
   */
  private calculateJourneyScore(touchpoints: CustomerTouchpoint[]): number {
    if (touchpoints.length === 0) return 0;
    
    const totalScore = touchpoints.reduce((sum, t) => sum + (t.score || 0), 0);
    return Math.round(totalScore / touchpoints.length);
  }

  /**
   * Calculate time in current stage
   */
  private calculateTimeInCurrentStage(stageHistory: Array<{ stage: string; date: Date; touchpoints: number }>): number {
    if (stageHistory.length === 0) return 0;
    
    const lastStage = stageHistory[stageHistory.length - 1];
    const daysDiff = Math.floor((Date.now() - lastStage.date.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff;
  }

  /**
   * Get next recommended action based on journey analysis
   */
  private getNextRecommendedAction(currentStage: string, contactType: 'lead' | 'customer', timeInStage: number): string {
    const recommendations = {
      awareness: {
        lead: timeInStage > 7 ? 'Follow up with personalized outreach' : 'Continue nurturing with relevant content',
        customer: 'Focus on win-back campaign and re-engagement'
      },
      consideration: {
        lead: timeInStage > 14 ? 'Schedule product demo or consultation' : 'Share case studies and testimonials',
        customer: 'Upsell or cross-sell opportunities'
      },
      decision: {
        lead: timeInStage > 10 ? 'Urgent follow-up needed - proposal may be stalling' : 'Support decision-making process',
        customer: 'Renewal conversation or expansion planning'
      },
      onboarding: {
        lead: 'Focus on successful customer onboarding',
        customer: 'Ensure smooth onboarding experience'
      },
      retention: {
        lead: 'Maintain customer relationship',
        customer: timeInStage > 90 ? 'Check in on satisfaction and identify growth opportunities' : 'Continue relationship nurturing'
      },
      advocacy: {
        lead: 'Leverage for referrals and testimonials',
        customer: 'Request case study, review, or referral'
      }
    };
    
    return recommendations[currentStage as keyof typeof recommendations]?.[contactType] || 'Continue monitoring journey progression';
  }

  /**
   * Create lead conversion touchpoint (when lead becomes customer)
   */
  async createLeadConversionTouchpoint(leadId: number, customerId: number, userId: number): Promise<CustomerTouchpoint | null> {
    try {
      const lead = await storage.getLead(leadId);
      if (!lead) return null;

      const touchpointData: InsertCustomerTouchpoint = {
        customerId,
        leadId,
        relatedLeadId: leadId,
        touchpointType: 'lead_conversion',
        touchpointStage: 'onboarding',
        channel: 'crm',
        source: 'lead_management',
        medium: 'conversion',
        content: `Lead converted to customer: ${lead.name}`,
        description: `Lead ${lead.name} successfully converted to customer`,
        value: 0, // Could be deal value if available
        outcome: 'positive',
        score: 100, // Conversion is always high value
        metadata: {
          leadId,
          customerId,
          leadSource: lead.leadSource,
          conversionEvent: true,
          originalLeadStatus: lead.leadStatus,
          unifiedSystem: true
        },
        userId
      };

      return await storage.createCustomerTouchpoint(touchpointData);
    } catch (error) {
      console.error('Failed to create lead conversion touchpoint:', error);
      return null;
    }
  }
}

export const unifiedJourneyService = new UnifiedJourneyService();