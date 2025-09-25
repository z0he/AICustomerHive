import { eq, desc, and, sql, asc, gte, lte, ne } from "drizzle-orm";
import { db } from "../db";
import { IStorage } from "../storage";
import { 
  users, type User, type InsertUser,
  campaigns, type Campaign, type InsertCampaign,
  customers, type Customer, type InsertCustomer,
  customerActivities, type CustomerActivity,
  leads, type Lead, type InsertLead,
  tasks, type Task, type InsertTask,
  messageVariants, type MessageVariant, type InsertMessageVariant,
  emailTemplates, type EmailTemplate, type InsertEmailTemplate,
  emailLogs, type EmailLog, type InsertEmailLog,
  scheduledEmails, type ScheduledEmail, type InsertScheduledEmail,
  calendarEvents, type CalendarEvent, type InsertCalendarEvent,
  marketingForms, type MarketingForm, type InsertMarketingForm,
  formSubmissions, type FormSubmission, type InsertFormSubmission,
  webVisitors, type WebVisitor, type InsertWebVisitor,
  pageViews, type PageView, type InsertPageView,
  trackingInstallations, type TrackingInstallation, type InsertTrackingInstallation,
  chatConversations, type ChatConversation, type InsertChatConversation,
  chatMessages, type ChatMessage, type InsertChatMessage,
  customerTouchpoints, type CustomerTouchpoint, type InsertCustomerTouchpoint,
  journeyStages, type JourneyStage, type InsertJourneyStage,
  contactSegments, type ContactSegment, type InsertContactSegment,
  contactNotes, type SelectContactNote, type InsertContactNote,
  type Contact, type ContactSegmentFilter
} from "@shared/schema";

export class DbStorage implements IStorage {
  // ----- Marketing Forms methods -----
  
  async getMarketingForms(): Promise<MarketingForm[]> {
    return await db.select().from(marketingForms).orderBy(desc(marketingForms.createdAt));
  }
  
  async getMarketingForm(id: number): Promise<MarketingForm | undefined> {
    const result = await db.select().from(marketingForms).where(eq(marketingForms.id, id));
    return result[0];
  }
  
  async createMarketingForm(form: InsertMarketingForm): Promise<MarketingForm> {
    const formData = {
      ...form,
      createdAt: new Date(),
      updatedAt: new Date(),
      views: 0,
      submissions: 0,
      conversionRate: 0
    };
    
    const result = await db.insert(marketingForms).values(formData as any).returning();
    return result[0];
  }
  
  async updateMarketingForm(id: number, form: Partial<InsertMarketingForm>): Promise<MarketingForm> {
    const updateData = {
      ...form,
      updatedAt: new Date()
    };
    
    const result = await db.update(marketingForms)
      .set(updateData)
      .where(eq(marketingForms.id, id))
      .returning();
      
    if (result.length === 0) {
      throw new Error(`Marketing form with ID ${id} not found`);
    }
    
    return result[0];
  }
  
  async deleteMarketingForm(id: number): Promise<boolean> {
    try {
      const result = await db.delete(marketingForms)
        .where(eq(marketingForms.id, id))
        .returning();
        
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting marketing form ${id}:`, error);
      return false;
    }
  }
  
  async getFormSubmissions(formId: number): Promise<FormSubmission[]> {
    return await db.select()
      .from(formSubmissions)
      .where(eq(formSubmissions.formId, formId))
      .orderBy(desc(formSubmissions.submittedAt));
  }
  
  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    const submissionData = {
      ...submission,
      contactId: null  // Set contactId to null if not provided
    };
    
    const result = await db.insert(formSubmissions)
      .values(submissionData as any)
      .returning();
      
    return result[0];
  }
  
  async incrementFormViews(formId: number): Promise<void> {
    const form = await this.getMarketingForm(formId);
    
    if (!form) {
      throw new Error(`Marketing form with ID ${formId} not found`);
    }
    
    // Calculate views
    const views = (form.views || 0) + 1;
    
    // Calculate conversion rate
    let conversionRate = 0;
    if (views > 0 && form.submissions && form.submissions > 0) {
      conversionRate = Math.round((form.submissions / views) * 100);
    }
    
    // Update the form with new stats
    await db.update(marketingForms)
      .set({ 
        views: views,
        conversionRate: conversionRate
      })
      .where(eq(marketingForms.id, formId));
  }
  
  async incrementFormSubmissions(formId: number): Promise<void> {
    const form = await this.getMarketingForm(formId);
    
    if (!form) {
      throw new Error(`Marketing form with ID ${formId} not found`);
    }
    
    // Calculate submissions
    const submissions = (form.submissions || 0) + 1;
    
    // Calculate conversion rate
    let conversionRate = 0;
    if (form.views && form.views > 0) {
      conversionRate = Math.round((submissions / form.views) * 100);
    }
    
    // Update the form with new stats
    await db.update(marketingForms)
      .set({ 
        submissions: submissions,
        conversionRate: conversionRate
      })
      .where(eq(marketingForms.id, formId));
  }
  
  async generateFormEmbedCode(formId: number): Promise<string> {
    const form = await this.getMarketingForm(formId);
    
    if (!form) {
      throw new Error(`Marketing form with ID ${formId} not found`);
    }
    
    // Generate embed code
    const embedCode = `
<!-- CRM Form Embed Code -->
<div id="form-container-${formId}"></div>
<script src="${process.env.PUBLIC_URL || ''}/api/marketing/forms/embed/${formId}.js"></script>
<!-- End CRM Form Embed Code -->
`;
    
    // Store the embed code in the form record
    await db.update(marketingForms)
      .set({ embedCode })
      .where(eq(marketingForms.id, formId));
    
    return embedCode;
  }
  
  async getWebVisitorByVisitorId(visitorId: string): Promise<WebVisitor | undefined> {
    const result = await db.select()
      .from(webVisitors)
      .where(eq(webVisitors.visitorId, visitorId));
      
    return result[0];
  }
  
  async createWebVisitor(visitor: InsertWebVisitor): Promise<WebVisitor> {
    const visitorData = {
      ...visitor,
      contactId: null, // Set contactId to null if not provided
      firstVisitAt: new Date(),
      lastVisitAt: new Date(),
      convertedAt: null,
      totalVisits: 1,
      totalPageviews: 1
    };
    
    const result = await db.insert(webVisitors)
      .values(visitorData as any)
      .returning();
      
    return result[0];
  }
  
  async updateWebVisitor(visitorId: string, data: Partial<WebVisitor>): Promise<WebVisitor> {
    const result = await db.update(webVisitors)
      .set(data)
      .where(eq(webVisitors.visitorId, visitorId))
      .returning();
      
    if (result.length === 0) {
      throw new Error(`Web visitor with ID ${visitorId} not found`);
    }
    
    return result[0];
  }
  
  async createPageView(pageView: InsertPageView): Promise<PageView> {
    const pageViewData = {
      ...pageView,
      contactId: null // Set contactId to null if not provided
    };
    
    const result = await db.insert(pageViews)
      .values(pageViewData as any)
      .returning();
      
    return result[0];
  }

  // ----- Tracking Installations methods -----
  
  async getTrackingInstallations(): Promise<TrackingInstallation[]> {
    return await db.select()
      .from(trackingInstallations)
      .orderBy(desc(trackingInstallations.installationDate));
  }
  
  async getTrackingInstallation(id: number): Promise<TrackingInstallation | undefined> {
    const result = await db.select()
      .from(trackingInstallations)
      .where(eq(trackingInstallations.id, id));
      
    return result[0];
  }
  
  async createTrackingInstallation(installation: InsertTrackingInstallation): Promise<TrackingInstallation> {
    const installData = {
      ...installation,
      installationDate: new Date(),
      trackingCode: `CRM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      status: installation.status || 'active'
    };
    
    const result = await db.insert(trackingInstallations)
      .values(installData as any)
      .returning();
      
    return result[0];
  }
  
  async updateTrackingInstallation(id: number, data: Partial<TrackingInstallation>): Promise<TrackingInstallation> {
    const result = await db.update(trackingInstallations)
      .set(data)
      .where(eq(trackingInstallations.id, id))
      .returning();
      
    if (result.length === 0) {
      throw new Error(`Tracking installation with ID ${id} not found`);
    }
    
    return result[0];
  }
  
  async generateTrackingCode(websiteUrl: string, options: {owner: number}): Promise<string> {
    // Create or update tracking installation record
    const existing = await db.select()
      .from(trackingInstallations)
      .where(eq(trackingInstallations.websiteUrl, websiteUrl));
      
    let trackingCode = '';
    
    if (existing.length > 0) {
      // Update existing tracking installation
      const result = await db.update(trackingInstallations)
        .set({ 
          lastPingAt: new Date(), 
          owner: options.owner,
          status: 'active'
        })
        .where(eq(trackingInstallations.websiteUrl, websiteUrl))
        .returning();
        
      trackingCode = result[0].trackingCode;
    } else {
      // Create new tracking installation
      const installationData = {
        websiteUrl,
        status: 'active',
        installationDate: new Date(),
        trackingCode: `CRM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        owner: options.owner,
        settings: {},
        notes: null
      };
      
      const result = await db.insert(trackingInstallations)
        .values(installationData as any)
        .returning();
        
      trackingCode = result[0].trackingCode;
    }
    
    // Get the server URL from the environment or use a default for development
    const serverUrl = process.env.SERVER_URL || 'https://ai-crm.replit.app';
    
    // Generate JavaScript tracking code
    const jsTrackingCode = `
<!-- CRM Tracking Code -->
<script type="text/javascript">
  (function(w, d, s, tc) {
    let scriptTag = d.createElement(s);
    scriptTag.async = true;
    scriptTag.src = '${serverUrl}/api/marketing/tracking/' + tc + '.js';
    let firstScriptTag = d.getElementsByTagName(s)[0];
    firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);
  })(window, document, 'script', '${trackingCode}');
</script>
<!-- End CRM Tracking Code -->
`;
    
    return jsTrackingCode;
  }
  
  // ----- User methods -----
  
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Calculate initials from the name
    const name = insertUser.name;
    const initials = this.getInitials(name);
    
    const result = await db.insert(users).values({
      ...insertUser,
      initials
    }).returning();
    
    return result[0];
  }

  async updateUserPersonalKeys(userId: number, keys: { openaiKey?: string; mailgunKey?: string; mailgunDomain?: string }): Promise<User> {
    const updateData: any = {};
    
    if (keys.openaiKey !== undefined) {
      updateData.personalOpenAIKey = keys.openaiKey;
    }
    if (keys.mailgunKey !== undefined) {
      updateData.personalMailgunKey = keys.mailgunKey;
    }
    if (keys.mailgunDomain !== undefined) {
      updateData.personalMailgunDomain = keys.mailgunDomain;
    }
    
    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    if (result.length === 0) {
      throw new Error('User not found');
    }
    
    return result[0];
  }
  
  // ----- Campaign methods -----
  
  async getCampaigns(period: string = '30d'): Promise<Campaign[]> {
    return await db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    const result = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return result[0];
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    // Type assertions to handle the correct database schema types
    const campaignData = {
      name: insertCampaign.name,
      type: insertCampaign.type,
      targetAudience: typeof insertCampaign.targetAudience === 'string' 
        ? insertCampaign.targetAudience 
        : JSON.stringify(insertCampaign.targetAudience),
      message: insertCampaign.message,
      startDate: insertCampaign.startDate,
      endDate: insertCampaign.endDate,
      createdAt: new Date()
    };
    
    // Use type assertion to avoid TypeScript errors with the schema
    const result = await db.insert(campaigns).values(campaignData as any).returning();
    
    return result[0];
  }

  async getRecentCampaigns(limit: number = 3): Promise<Campaign[]> {
    const result = await db.select().from(campaigns)
      .orderBy(desc(campaigns.createdAt))
      .limit(limit);
    
    return result;
  }
  
  // ----- Message Variant methods (for A/B testing) -----
  
  async getMessageVariants(campaignId: number): Promise<MessageVariant[]> {
    return await db.select()
      .from(messageVariants)
      .where(eq(messageVariants.campaignId, campaignId))
      .orderBy(desc(messageVariants.createdAt));
  }
  
  async createMessageVariant(variant: InsertMessageVariant): Promise<MessageVariant> {
    const variantData = {
      ...variant,
      impressions: 0,
      conversions: 0,
      conversionRate: 0,
      createdAt: new Date()
    };
    
    // Use type assertion for the insert
    const result = await db.insert(messageVariants).values(variantData as any).returning();
    
    return result[0];
  }
  
  async updateMessageVariantStats(
    variantId: number, 
    impressions?: number, 
    conversions?: number
  ): Promise<MessageVariant> {
    // First get the current variant
    const variantResult = await db.select()
      .from(messageVariants)
      .where(eq(messageVariants.id, variantId));
    
    if (variantResult.length === 0) {
      throw new Error(`Message variant with id ${variantId} not found`);
    }
    
    const variant = variantResult[0];
    
    // Calculate new stats
    const newImpressions = impressions !== undefined 
      ? (variant.impressions || 0) + impressions 
      : (variant.impressions || 0);
      
    const newConversions = conversions !== undefined 
      ? (variant.conversions || 0) + conversions 
      : (variant.conversions || 0);
    
    // Calculate conversion rate
    let newConversionRate = 0;
    if (newImpressions > 0) {
      newConversionRate = Math.round((newConversions / newImpressions) * 100);
    }
    
    // Update the variant
    const result = await db.update(messageVariants)
      .set({ 
        impressions: newImpressions, 
        conversions: newConversions,
        conversionRate: newConversionRate
      })
      .where(eq(messageVariants.id, variantId))
      .returning();
    
    return result[0];
  }
  
  // ----- Customer methods -----
  
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    // Calculate name and initials
    const fullName = `${insertCustomer.firstName} ${insertCustomer.lastName}`;
    const initials = this.getInitials(fullName);
    
    const customerData = {
      ...insertCustomer,
      name: fullName,
      initials,
      createdAt: new Date()
    };
    
    // Use type assertion for the insert
    const result = await db.insert(customers).values(customerData as any).returning();
    
    return result[0];
  }

  async getCustomerActivities(): Promise<CustomerActivity[]> {
    return await db.select().from(customerActivities);
  }
  
  async exportCustomers(): Promise<any> {
    try {
      const customersList = await db.select().from(customers);
      
      // Format the data for export in a standard format (CSV data structure)
      const exportData = {
        data: customersList,
        metadata: {
          totalCount: customersList.length,
          exportDate: new Date().toISOString(),
          fields: [
            'id', 'email', 'firstName', 'lastName', 'name', 'phone', 'company', 
            'jobTitle', 'linkedinUrl', 'lifecycleStage', 'leadStatus',
            'industry', 'contactOwner', 'contactSource', 'contactType',
            'country', 'legalBasis', 'customFields', 'createdAt', 'status'
          ]
        }
      };
      
      return exportData;
    } catch (error) {
      console.error("Failed to export customers:", error);
      throw new Error("Failed to export customers");
    }
  }
  
  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer> {
    const result = await db.update(customers)
      .set(data)
      .where(eq(customers.id, id))
      .returning();
      
    if (result.length === 0) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    
    return result[0];
  }

  async deleteCustomer(id: number): Promise<boolean> {
    try {
      const result = await db.delete(customers).where(eq(customers.id, id));
      return true;
    } catch (error) {
      console.error(`Failed to delete customer ${id}:`, error);
      return false;
    }
  }

  async importCustomers(customerData: any[]): Promise<{ imported: number; errors: any[] }> {
    const errors: any[] = [];
    let imported = 0;
    
    // Process each customer in the imported data
    for (const data of customerData) {
      try {
        // Basic validation
        if (!data.email || !data.firstName || !data.lastName) {
          errors.push({
            record: data,
            error: 'Missing required fields: email, firstName, or lastName'
          });
          continue;
        }
        
        // Check for duplicate email
        const existingCustomer = await db.select()
          .from(customers)
          .where(eq(customers.email, data.email));
        
        if (existingCustomer.length > 0) {
          errors.push({
            record: data,
            error: `Customer with email ${data.email} already exists`
          });
          continue;
        }
        
        // Create customer
        const insertCustomer: InsertCustomer = {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone || null,
          company: data.company || null,
          jobTitle: data.jobTitle || null,
          linkedinUrl: data.linkedinUrl || null,
          lifecycleStage: data.lifecycleStage || 'lead',
          leadStatus: data.leadStatus || null,
          industry: data.industry || data.contactIndustry || null,
          contactOwner: data.contactOwner || null,
          contactSource: data.contactSource || null,
          contactType: data.contactType || null,
          country: data.country || null,
          legalBasis: data.legalBasis || null,
          customFields: data.customFields || null
        };
        
        await this.createCustomer(insertCustomer);
        imported++;
      } catch (error) {
        errors.push({
          record: data,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return { imported, errors };
  }
  
  // ----- Lead methods -----
  
  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
  }

  async getLeadsBySource(source: string): Promise<Lead[]> {
    return await db.select()
      .from(leads)
      .where(eq(leads.leadSource, source));
  }
  
  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await db.select()
      .from(leads)
      .where(eq(leads.leadStatus, status));
  }
  
  async getLeadsByScoreRange(minScore: number, maxScore: number): Promise<Lead[]> {
    return await db.select()
      .from(leads)
      .where(
        and(
          sql`${leads.score} >= ${minScore}`,
          sql`${leads.score} <= ${maxScore}`
        )
      );
  }
  
  async getLeadsRequiringFollowUp(): Promise<Lead[]> {
    const now = new Date();
    
    return await db.select()
      .from(leads)
      .where(sql`${leads.nextFollowUpDate} <= ${now}`)
      .orderBy(leads.nextFollowUpDate);
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const result = await db.select().from(leads).where(eq(leads.id, id));
    return result[0];
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const initials = this.getInitials(insertLead.name);
    
    // Calculate initial lead score if not provided
    let score = insertLead.score;
    if (score === undefined) {
      score = this.calculateLeadScore(insertLead);
    }
    
    const leadData = {
      ...insertLead,
      initials,
      score,
      createdAt: new Date()
    };
    
    // Use type assertion for the insert
    const result = await db.insert(leads).values(leadData as any).returning();
    
    return result[0];
  }
  
  async insertLead(lead: any): Promise<Lead> {
    // Ensure fullName is created from firstName and lastName
    const fullName = `${lead.firstName} ${lead.lastName}`;
    const initials = this.getInitials(fullName);
    
    // Calculate an initial lead score if not provided
    let score = lead.score;
    if (score === undefined) {
      score = this.calculateLeadScore({
        ...lead,
        name: fullName
      });
    }
    
    // Create a Lead object from the imported data
    const leadData = {
      name: fullName,
      email: lead.email,
      phone: lead.phone || null,
      company: lead.company || null,
      jobTitle: lead.jobTitle || null,
      industry: lead.industry || lead.contactIndustry || null,
      location: lead.location || lead.country || null,
      leadSource: lead.leadSource || 'import',
      leadStatus: lead.leadStatus || 'new',
      leadOwner: lead.contactOwner || lead.leadOwner || null,
      lastContactDate: lead.lastContactDate || null,
      nextFollowUpDate: lead.nextFollowUpDate || null,
      engagementLevel: lead.engagementLevel || 0,
      conversionProbability: lead.conversionProbability || 0,
      score,
      tags: lead.tags || null,
      notes: lead.notes || null,
      customFields: lead.customFields || null,
      initials,
      createdAt: new Date()
    };
    
    // Use type assertion for the insert
    const result = await db.insert(leads).values(leadData as any).returning();
    
    return result[0];
  }
  
  async updateLead(id: number, leadData: Partial<InsertLead>): Promise<Lead> {
    const result = await db
      .update(leads)
      .set(leadData)
      .where(eq(leads.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Lead with ID ${id} not found`);
    }
    
    return result[0];
  }

  async deleteLead(id: number): Promise<boolean> {
    try {
      const result = await db.delete(leads).where(eq(leads.id, id));
      return true;
    } catch (error) {
      console.error(`Failed to delete lead ${id}:`, error);
      return false;
    }
  }
  
  async updateLeadScore(id: number, scoringData: any): Promise<Lead> {
    // First get the current lead
    const lead = await this.getLead(id);
    if (!lead) {
      throw new Error(`Lead with ID ${id} not found`);
    }
    
    // Calculate new score based on scoring data
    let newScore = lead.score || 0;
    
    // Example scoring factors:
    // 1. Engagement level (e.g., email opens, website visits)
    if (scoringData.engagementLevel !== undefined) {
      newScore += scoringData.engagementLevel * 0.3; // 30% weight
    }
    
    // 2. Company size/value
    if (scoringData.companyValue !== undefined) {
      newScore += scoringData.companyValue * 0.2; // 20% weight
    }
    
    // 3. Recency of interaction
    if (scoringData.interactionRecency !== undefined) {
      newScore += scoringData.interactionRecency * 0.2; // 20% weight
    }
    
    // 4. Content engagement
    if (scoringData.contentEngagement !== undefined) {
      newScore += scoringData.contentEngagement * 0.15; // 15% weight
    }
    
    // 5. Social media engagement
    if (scoringData.socialEngagement !== undefined) {
      newScore += scoringData.socialEngagement * 0.15; // 15% weight
    }
    
    // Ensure score is between 0 and 100
    newScore = Math.max(0, Math.min(100, Math.round(newScore)));
    
    // Update lead with new score
    const updatedLead = await this.updateLead(id, { 
      score: newScore,
      engagementLevel: scoringData.engagementLevel || lead.engagementLevel,
      conversionProbability: this.calculateConversionProbability(newScore)
    });
    
    return updatedLead;
  }

  async getTopLeads(limit: number = 5): Promise<Lead[]> {
    const result = await db.select()
      .from(leads)
      .orderBy(desc(leads.score))
      .limit(limit);
    
    return result;
  }
  
  async assignLeadOwner(id: number, ownerName: string): Promise<Lead> {
    return await this.updateLead(id, { leadOwner: ownerName });
  }
  
  async addLeadTags(id: number, newTags: string[]): Promise<Lead> {
    const lead = await this.getLead(id);
    if (!lead) {
      throw new Error(`Lead with ID ${id} not found`);
    }
    
    // Combine existing tags with new ones, removing duplicates
    const existingTags = lead.tags || [];
    const updatedTags = [...new Set([...existingTags, ...newTags])];
    
    return await this.updateLead(id, { tags: updatedTags });
  }
  
  async addLeadNote(id: number, note: string): Promise<Lead> {
    const lead = await this.getLead(id);
    if (!lead) {
      throw new Error(`Lead with ID ${id} not found`);
    }
    
    // Append new note to existing notes
    const existingNotes = lead.notes || '';
    const timestamp = new Date().toISOString();
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n\n[${timestamp}]\n${note}`
      : `[${timestamp}]\n${note}`;
    
    return await this.updateLead(id, { notes: updatedNotes });
  }
  
  // Helper methods for lead scoring
  private calculateLeadScore(lead: InsertLead | Lead): number {
    let score = 0;
    
    // Base score starts at 20
    score += 20;
    
    // Add points for completeness of data
    if (lead.email) score += 10;
    if (lead.phone) score += 5;
    if (lead.company) score += 10;
    if (lead.jobTitle) score += 5;
    
    // Add points based on industry (some industries might be more valuable)
    if (lead.industry) {
      const highValueIndustries = ['Finance', 'Healthcare', 'Technology', 'Manufacturing'];
      if (highValueIndustries.includes(lead.industry)) {
        score += 15;
      } else {
        score += 5;
      }
    }
    
    // Add points based on lead source
    if (lead.leadSource) {
      const highValueSources = ['Referral', 'Direct', 'Partner'];
      if (highValueSources.includes(lead.leadSource)) {
        score += 15;
      } else {
        score += 5;
      }
    }
    
    // Add points for engagement level
    if (lead.engagementLevel) {
      score += Math.min(20, lead.engagementLevel / 5);
    }
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  private calculateConversionProbability(score: number): number {
    // Simple conversion probability based on lead score
    // More sophisticated models would consider more factors
    return Math.min(100, Math.round(score * 1.2));
  }
  
  // ----- Task methods -----
  
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0];
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const taskData = {
      ...insertTask,
      createdAt: new Date()
    };
    
    // Use type assertion for the insert
    const result = await db.insert(tasks).values(taskData as any).returning();
    
    return result[0];
  }

  async toggleTaskCompletion(id: number): Promise<Task> {
    // First get the current task
    const task = await this.getTask(id);
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    // Toggle completion status
    const result = await db.update(tasks)
      .set({ completed: !task.completed })
      .where(eq(tasks.id, id))
      .returning();
    
    return result[0];
  }
  
  // ----- Dashboard metrics -----
  
  async getDashboardMetrics(): Promise<any[]> {
    // Get actual customer count
    const customersList = await db.query.customers.findMany();
    const customerCount = customersList.length;
    
    // Get actual leads count
    const leadsList = await db.query.leads.findMany();
    const leadsCount = leadsList.length;
    
    // Get actual campaign count
    const campaignsList = await db.query.campaigns.findMany();
    const activeCampaigns = campaignsList.filter(c => 
      new Date(c.endDate) >= new Date() && new Date(c.startDate) <= new Date()
    ).length;
    
    return [
      {
        title: "Total Customers",
        value: customerCount.toString(),
        change: {
          value: "+5.2%",
          type: "increase",
          label: "vs last month"
        },
        icon: "users"
      },
      {
        title: "Total Leads",
        value: leadsCount.toString(),
        change: {
          value: "+2.3%", 
          type: "increase",
          label: "vs last month"
        },
        icon: "users-plus"
      },
      {
        title: "Active Campaigns",
        value: activeCampaigns.toString(),
        change: {
          value: "+2",
          type: "increase",
          label: "vs last month"
        },
        icon: "campaigns"
      }
    ];
  }
  
  // ----- Helper methods -----
  
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }
  
  // ----- Email Template methods -----
  
  async getEmailTemplates(category?: string): Promise<EmailTemplate[]> {
    try {
      let query = db.select().from(emailTemplates);
      
      if (category) {
        query = query.where(eq(emailTemplates.category, category));
      }
      
      return await query.orderBy(emailTemplates.name);
    } catch (error) {
      console.error("Failed to get email templates:", error);
      return [];
    }
  }
  
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    try {
      const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
      return result[0];
    } catch (error) {
      console.error(`Failed to get email template #${id}:`, error);
      return undefined;
    }
  }
  
  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    try {
      const templateData = {
        ...template,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.insert(emailTemplates).values(templateData as any).returning();
      return result[0];
    } catch (error) {
      console.error("Failed to create email template:", error);
      throw new Error("Failed to create email template");
    }
  }
  
  async updateEmailTemplate(id: number, templateData: Partial<EmailTemplate>): Promise<EmailTemplate> {
    try {
      // Make sure template exists
      const template = await this.getEmailTemplate(id);
      if (!template) {
        throw new Error(`Email template with ID ${id} not found`);
      }
      
      // Include updated timestamp
      const updatedData = {
        ...templateData,
        updatedAt: new Date()
      };
      
      const result = await db
        .update(emailTemplates)
        .set(updatedData)
        .where(eq(emailTemplates.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`Failed to update email template #${id}:`, error);
      throw new Error(`Failed to update email template #${id}`);
    }
  }
  
  async deleteEmailTemplate(id: number): Promise<boolean> {
    try {
      // Make sure template exists
      const template = await this.getEmailTemplate(id);
      if (!template) {
        throw new Error(`Email template with ID ${id} not found`);
      }
      
      await db
        .delete(emailTemplates)
        .where(eq(emailTemplates.id, id));
      
      return true;
    } catch (error) {
      console.error(`Failed to delete email template #${id}:`, error);
      return false;
    }
  }
  
  // ----- Email Log methods -----
  
  async getEmailLogs(entityType?: string, entityId?: number): Promise<EmailLog[]> {
    try {
      let query = db.select().from(emailLogs);
      
      if (entityType && entityId) {
        query = query.where(
          and(
            eq(emailLogs.relatedEntityType, entityType),
            eq(emailLogs.relatedEntityId, entityId)
          )
        );
      } else if (entityType) {
        query = query.where(eq(emailLogs.relatedEntityType, entityType));
      }
      
      return await query.orderBy(desc(emailLogs.sentAt));
    } catch (error) {
      console.error("Failed to get email logs:", error);
      return [];
    }
  }
  
  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    try {
      const logData = {
        ...log,
        sentAt: new Date()
      };
      
      const result = await db.insert(emailLogs).values(logData as any).returning();
      return result[0];
    } catch (error) {
      console.error("Failed to create email log:", error);
      throw new Error("Failed to create email log");
    }
  }
  
  async sendEmail(
    from: string, 
    to: string, 
    subject: string, 
    body: string, 
    options: any = {}
  ): Promise<EmailLog> {
    try {
      // Import the sendEmail function from mailgun.ts
      const { sendEmail } = await import('../lib/mailgun');
      
      // Send the email
      let mailgunResult;
      try {
        console.log('Attempting to send email with options:', {
          from,
          to,
          subject,
          hasCustomMailgun: !!options.customMailgun,
          customMailgunKeys: options.customMailgun ? Object.keys(options.customMailgun) : []
        });
        console.log('Email body being sent:', body.substring(0, 200) + '...');
        
        mailgunResult = await sendEmail({
          from,
          to,
          subject,
          html: body,
          text: options.text || body.replace(/<[^>]*>?/gm, '') // Strip HTML if no text provided
        }, options.customMailgun);
        
        if (!mailgunResult.success) {
          throw new Error(mailgunResult.error || 'Mailgun returned false - email not sent');
        }
      } catch (mailgunError) {
        // Handle specific Mailgun errors
        const errorMessage = mailgunError instanceof Error ? mailgunError.message : String(mailgunError);
        console.error("Mailgun error:", errorMessage);
        throw new Error(`Mailgun delivery failed: ${errorMessage}`);
      }
      
      // Log the email with Mailgun tracking ID
      const emailLog = await this.createEmailLog({
        userId: options.userId || 1, // Default to admin user if not specified
        from,
        to,
        subject,
        body,
        status: 'sent',
        campaignId: options.campaignId,
        relatedEntityType: options.relatedEntityType,
        relatedEntityId: options.relatedEntityId,
        templateId: options.templateId,
        metadata: {
          ...options.metadata,
          mailgunId: mailgunResult.mailgunId,
          deliveryStatus: 'sent_to_mailgun'
        }
      });
      
      return emailLog;
    } catch (error) {
      console.error("Failed to send email:", error);
      
      // Log the failed email
      const emailLog = await this.createEmailLog({
        userId: options.userId || 1, // Default to admin user if not specified
        from,
        to,
        subject,
        body,
        status: 'failed',
        campaignId: options.campaignId,
        relatedEntityType: options.relatedEntityType,
        relatedEntityId: options.relatedEntityId,
        templateId: options.templateId,
        metadata: { error: error.message }
      });
      
      return emailLog;
    }
  }
  
  async sendEmailWithTemplate(
    templateId: number, 
    to: string, 
    data: any, 
    options: any = {}
  ): Promise<EmailLog> {
    try {
      // Get the template
      const template = await this.getEmailTemplate(templateId);
      if (!template) {
        throw new Error(`Email template with ID ${templateId} not found`);
      }
      
      // Import personalization engine and mailgun functions
      const { personalizationEngine } = await import('../lib/personalization');
      const { sendEmail } = await import('../lib/mailgun');
      
      // Get from address
      const from = options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com';
      
      // Process personalization tokens in both subject and body
      const personalizedSubject = await personalizationEngine.processContent(
        template.subject, 
        to, 
        { defaultValues: data }
      );
      
      const personalizedBody = await personalizationEngine.processContent(
        template.bodyHtml, 
        to, 
        { defaultValues: data }
      );
      
      const personalizedTextBody = template.bodyText 
        ? await personalizationEngine.processContent(template.bodyText, to, { defaultValues: data })
        : personalizedBody.replace(/<[^>]*>/g, ''); // Strip HTML for text version
      
      // Send the email with personalized content
      const success = await sendEmail({
        from,
        to,
        subject: personalizedSubject,
        html: personalizedBody,
        text: personalizedTextBody
      });
      
      if (!success) {
        throw new Error('Failed to send personalized email through Mailgun');
      }
      
      // Log the email with personalized content
      const emailLog = await this.createEmailLog({
        userId: options.userId || 1, // Default to admin user if not specified
        from,
        to,
        subject: personalizedSubject,
        body: personalizedBody,
        status: 'sent',
        templateId,
        campaignId: options.campaignId,
        relatedEntityType: options.relatedEntityType,
        relatedEntityId: options.relatedEntityId,
        metadata: { 
          templateData: data,
          originalSubject: template.subject,
          originalBody: template.bodyHtml,
          personalizationApplied: true
        }
      });
      
      return emailLog;
    } catch (error) {
      console.error("Failed to send template email:", error);
      
      // Get the template if we can
      let templateInfo: any = { id: templateId };
      try {
        const template = await this.getEmailTemplate(templateId);
        if (template) {
          templateInfo = {
            id: template.id,
            name: template.name,
            subject: template.subject
          };
        }
      } catch (e) {
        // Ignore errors here
      }
      
      // Log the failed email
      const emailLog = await this.createEmailLog({
        userId: options.userId || 1, // Default to admin user if not specified
        from: options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com',
        to,
        subject: templateInfo.subject || 'Email with template',
        body: 'Template email failed to send',
        status: 'failed',
        templateId,
        campaignId: options.campaignId,
        relatedEntityType: options.relatedEntityType,
        relatedEntityId: options.relatedEntityId,
        metadata: { 
          error: error.message,
          templateData: data,
          templateInfo 
        }
      });
      
      return emailLog;
    }
  }

  // ----- Scheduled Email methods -----
  
  async getScheduledEmails(status?: string): Promise<ScheduledEmail[]> {
    try {
      let query = db.select().from(scheduledEmails);
      
      if (status) {
        query = query.where(eq(scheduledEmails.status, status));
      }
      
      return await query.orderBy(desc(scheduledEmails.createdAt));
    } catch (error) {
      console.error("Failed to get scheduled emails:", error);
      return [];
    }
  }
  
  async getScheduledEmail(id: number): Promise<ScheduledEmail | undefined> {
    try {
      const result = await db.select().from(scheduledEmails).where(eq(scheduledEmails.id, id));
      return result[0];
    } catch (error) {
      console.error("Failed to get scheduled email:", error);
      return undefined;
    }
  }
  
  async createScheduledEmail(scheduledEmail: InsertScheduledEmail): Promise<ScheduledEmail> {
    try {
      const emailData = {
        ...scheduledEmail,
        createdAt: new Date(),
        status: scheduledEmail.status || 'pending'
      };
      
      const result = await db.insert(scheduledEmails).values(emailData as any).returning();
      return result[0];
    } catch (error) {
      console.error("Failed to create scheduled email:", error);
      throw new Error("Failed to create scheduled email");
    }
  }
  
  async updateScheduledEmail(id: number, data: Partial<ScheduledEmail>): Promise<ScheduledEmail> {
    try {
      const result = await db.update(scheduledEmails)
        .set(data)
        .where(eq(scheduledEmails.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error("Scheduled email not found");
      }
      
      return result[0];
    } catch (error) {
      console.error("Failed to update scheduled email:", error);
      throw new Error("Failed to update scheduled email");
    }
  }
  
  async deleteScheduledEmail(id: number): Promise<boolean> {
    try {
      const result = await db.delete(scheduledEmails).where(eq(scheduledEmails.id, id));
      return true;
    } catch (error) {
      console.error("Failed to delete scheduled email:", error);
      return false;
    }
  }
  
  async getScheduledEmailsReady(): Promise<ScheduledEmail[]> {
    try {
      const now = new Date();
      return await db.select()
        .from(scheduledEmails)
        .where(
          and(
            eq(scheduledEmails.status, 'pending'),
            lte(scheduledEmails.scheduledFor, now)
          )
        )
        .orderBy(asc(scheduledEmails.scheduledFor));
    } catch (error) {
      console.error("Failed to get ready scheduled emails:", error);
      return [];
    }
  }

  // ----- Calendar/Events methods -----
  
  async getCalendarEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    try {
      let query = db.select().from(calendarEvents);
      
      // Filter by date range if provided
      if (startDate && endDate) {
        query = query.where(
          and(
            gte(calendarEvents.startDate, startDate),
            lte(calendarEvents.endDate, endDate)
          )
        );
      } else if (startDate) {
        query = query.where(gte(calendarEvents.startDate, startDate));
      } else if (endDate) {
        query = query.where(lte(calendarEvents.endDate, endDate));
      }
      
      return await query.orderBy(asc(calendarEvents.startDate));
    } catch (error) {
      console.error("Failed to get calendar events:", error);
      return [];
    }
  }
  
  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    try {
      const result = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, id))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`Failed to get calendar event #${id}:`, error);
      return undefined;
    }
  }
  
  async getCalendarEventsByOwner(ownerId: number, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    try {
      let query = db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.ownerId, ownerId));
      
      // Filter by date range if provided
      if (startDate && endDate) {
        query = query.where(
          and(
            gte(calendarEvents.startDate, startDate),
            lte(calendarEvents.endDate, endDate)
          )
        );
      } else if (startDate) {
        query = query.where(gte(calendarEvents.startDate, startDate));
      } else if (endDate) {
        query = query.where(lte(calendarEvents.endDate, endDate));
      }
      
      return await query.orderBy(asc(calendarEvents.startDate));
    } catch (error) {
      console.error(`Failed to get calendar events for owner #${ownerId}:`, error);
      return [];
    }
  }
  
  async getCalendarEventsByEntity(entityType: string, entityId: number): Promise<CalendarEvent[]> {
    try {
      const result = await db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.relatedEntityType, entityType),
            eq(calendarEvents.relatedEntityId, entityId)
          )
        )
        .orderBy(asc(calendarEvents.startDate));
      
      return result;
    } catch (error) {
      console.error(`Failed to get calendar events for entity ${entityType}#${entityId}:`, error);
      return [];
    }
  }
  
  async createCalendarEvent(eventData: InsertCalendarEvent): Promise<CalendarEvent> {
    try {
      const event = {
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.insert(calendarEvents).values(event as any).returning();
      return result[0];
    } catch (error) {
      console.error("Failed to create calendar event:", error);
      throw new Error("Failed to create calendar event");
    }
  }
  
  async updateCalendarEvent(id: number, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    try {
      // Make sure event exists
      const event = await this.getCalendarEvent(id);
      if (!event) {
        throw new Error(`Calendar event with ID ${id} not found`);
      }
      
      // Include updated timestamp
      const updatedData = {
        ...eventData,
        updatedAt: new Date()
      };
      
      const result = await db
        .update(calendarEvents)
        .set(updatedData)
        .where(eq(calendarEvents.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`Failed to update calendar event #${id}:`, error);
      throw new Error(`Failed to update calendar event #${id}`);
    }
  }
  
  async deleteCalendarEvent(id: number): Promise<boolean> {
    try {
      // Make sure event exists
      const event = await this.getCalendarEvent(id);
      if (!event) {
        throw new Error(`Calendar event with ID ${id} not found`);
      }
      
      await db
        .delete(calendarEvents)
        .where(eq(calendarEvents.id, id));
      
      return true;
    } catch (error) {
      console.error(`Failed to delete calendar event #${id}:`, error);
      return false;
    }
  }

  // ----- Chat Assistant Methods -----

  async getChatConversations(): Promise<ChatConversation[]> {
    try {
      const conversations = await db
        .select()
        .from(chatConversations)
        .orderBy(desc(chatConversations.createdAt));
      
      return conversations;
    } catch (error) {
      console.error("Failed to get chat conversations:", error);
      return [];
    }
  }

  async getChatConversationsByUserId(userId: number): Promise<ChatConversation[]> {
    try {
      const conversations = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.userId, userId))
        .orderBy(desc(chatConversations.createdAt));
      
      return conversations;
    } catch (error) {
      console.error(`Failed to get chat conversations for user #${userId}:`, error);
      return [];
    }
  }

  async getChatConversationById(id: number): Promise<ChatConversation | undefined> {
    try {
      const [conversation] = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.id, id))
        .limit(1);
      
      return conversation;
    } catch (error) {
      console.error(`Failed to get chat conversation #${id}:`, error);
      return undefined;
    }
  }

  async createChatConversation(conversation: InsertChatConversation & { createdAt: Date }): Promise<ChatConversation> {
    try {
      const [newConversation] = await db
        .insert(chatConversations)
        .values({
          ...conversation,
          updatedAt: conversation.createdAt
        })
        .returning();
      
      return newConversation;
    } catch (error) {
      console.error("Failed to create chat conversation:", error);
      throw new Error("Failed to create chat conversation");
    }
  }

  async updateChatConversation(id: number, conversationData: Partial<ChatConversation>): Promise<ChatConversation> {
    try {
      const [updatedConversation] = await db
        .update(chatConversations)
        .set({
          ...conversationData,
          updatedAt: new Date()
        })
        .where(eq(chatConversations.id, id))
        .returning();
      
      return updatedConversation;
    } catch (error) {
      console.error(`Failed to update chat conversation #${id}:`, error);
      throw new Error(`Failed to update chat conversation #${id}`);
    }
  }

  async deleteChatConversation(id: number): Promise<void> {
    try {
      // First delete all messages in the conversation
      await db
        .delete(chatMessages)
        .where(eq(chatMessages.conversationId, id));
      
      // Then delete the conversation
      await db
        .delete(chatConversations)
        .where(eq(chatConversations.id, id));
    } catch (error) {
      console.error(`Failed to delete chat conversation #${id}:`, error);
      throw new Error(`Failed to delete chat conversation #${id}`);
    }
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    try {
      const messages = await db
        .select()
        .from(chatMessages)
        .orderBy(asc(chatMessages.createdAt));
      
      return messages;
    } catch (error) {
      console.error("Failed to get chat messages:", error);
      return [];
    }
  }

  async getChatMessagesByConversationId(conversationId: number): Promise<ChatMessage[]> {
    try {
      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, conversationId))
        .orderBy(asc(chatMessages.createdAt));
      
      return messages;
    } catch (error) {
      console.error(`Failed to get chat messages for conversation #${conversationId}:`, error);
      return [];
    }
  }

  async getChatMessageById(id: number): Promise<ChatMessage | undefined> {
    try {
      const [message] = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.id, id))
        .limit(1);
      
      return message;
    } catch (error) {
      console.error(`Failed to get chat message #${id}:`, error);
      return undefined;
    }
  }

  async createChatMessage(message: InsertChatMessage & { createdAt: Date }): Promise<ChatMessage> {
    try {
      const [newMessage] = await db
        .insert(chatMessages)
        .values(message)
        .returning();
      
      // Update the conversation's updatedAt timestamp
      await db
        .update(chatConversations)
        .set({
          updatedAt: message.createdAt
        })
        .where(eq(chatConversations.id, message.conversationId));
      
      return newMessage;
    } catch (error) {
      console.error("Failed to create chat message:", error);
      throw new Error("Failed to create chat message");
    }
  }

  async updateChatMessage(id: number, messageData: Partial<ChatMessage>): Promise<ChatMessage> {
    try {
      const result = await db
        .update(chatMessages)
        .set(messageData)
        .where(eq(chatMessages.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error(`Chat message with ID ${id} not found`);
      }
      
      return result[0];
    } catch (error) {
      console.error(`Failed to update chat message #${id}:`, error);
      throw new Error(`Failed to update chat message #${id}`);
    }
  }

  async deleteChatMessage(id: number): Promise<void> {
    try {
      await db
        .delete(chatMessages)
        .where(eq(chatMessages.id, id));
    } catch (error) {
      console.error(`Failed to delete chat message #${id}:`, error);
      throw new Error(`Failed to delete chat message #${id}`);
    }
  }

  // ----- Customer Journey methods -----

  async getCustomerTouchpoints(): Promise<CustomerTouchpoint[]> {
    try {
      return await db
        .select()
        .from(customerTouchpoints)
        .orderBy(asc(customerTouchpoints.createdAt));
    } catch (error) {
      console.error("Failed to get customer touchpoints:", error);
      return [];
    }
  }

  async getCustomerTouchpoint(id: number): Promise<CustomerTouchpoint | undefined> {
    try {
      const [touchpoint] = await db
        .select()
        .from(customerTouchpoints)
        .where(eq(customerTouchpoints.id, id))
        .limit(1);
      
      return touchpoint;
    } catch (error) {
      console.error(`Failed to get customer touchpoint #${id}:`, error);
      return undefined;
    }
  }

  async createCustomerTouchpoint(touchpoint: InsertCustomerTouchpoint): Promise<CustomerTouchpoint> {
    try {
      const touchpointData = {
        ...touchpoint,
        createdAt: new Date()
      };
      
      const [newTouchpoint] = await db
        .insert(customerTouchpoints)
        .values(touchpointData as any)
        .returning();
      
      return newTouchpoint;
    } catch (error) {
      console.error("Failed to create customer touchpoint:", error);
      throw new Error("Failed to create customer touchpoint");
    }
  }

  async updateCustomerTouchpoint(id: number, touchpointData: Partial<CustomerTouchpoint>): Promise<CustomerTouchpoint> {
    try {
      const result = await db
        .update(customerTouchpoints)
        .set(touchpointData)
        .where(eq(customerTouchpoints.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error(`Customer touchpoint with ID ${id} not found`);
      }
      
      return result[0];
    } catch (error) {
      console.error(`Failed to update customer touchpoint #${id}:`, error);
      throw new Error(`Failed to update customer touchpoint #${id}`);
    }
  }

  async deleteCustomerTouchpoint(id: number): Promise<void> {
    try {
      await db
        .delete(customerTouchpoints)
        .where(eq(customerTouchpoints.id, id));
    } catch (error) {
      console.error(`Failed to delete customer touchpoint #${id}:`, error);
      throw new Error(`Failed to delete customer touchpoint #${id}`);
    }
  }

  // ----- Journey Stage methods -----

  async getJourneyStages(): Promise<JourneyStage[]> {
    try {
      return await db
        .select()
        .from(journeyStages)
        .orderBy(asc(journeyStages.order));
    } catch (error) {
      console.error("Failed to get journey stages:", error);
      return [];
    }
  }

  async getJourneyStage(id: number): Promise<JourneyStage | undefined> {
    try {
      const [stage] = await db
        .select()
        .from(journeyStages)
        .where(eq(journeyStages.id, id))
        .limit(1);
      
      return stage;
    } catch (error) {
      console.error(`Failed to get journey stage #${id}:`, error);
      return undefined;
    }
  }

  async createJourneyStage(stage: InsertJourneyStage): Promise<JourneyStage> {
    try {
      const stageData = {
        ...stage,
        createdAt: new Date()
      };
      
      const [newStage] = await db
        .insert(journeyStages)
        .values(stageData as any)
        .returning();
      
      return newStage;
    } catch (error) {
      console.error("Failed to create journey stage:", error);
      throw new Error("Failed to create journey stage");
    }
  }

  async updateJourneyStage(id: number, stageData: Partial<JourneyStage>): Promise<JourneyStage> {
    try {
      const result = await db
        .update(journeyStages)
        .set(stageData)
        .where(eq(journeyStages.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error(`Journey stage with ID ${id} not found`);
      }
      
      return result[0];
    } catch (error) {
      console.error(`Failed to update journey stage #${id}:`, error);
      throw new Error(`Failed to update journey stage #${id}`);
    }
  }

  async deleteJourneyStage(id: number): Promise<void> {
    try {
      await db
        .delete(journeyStages)
        .where(eq(journeyStages.id, id));
    } catch (error) {
      console.error(`Failed to delete journey stage #${id}:`, error);
      throw new Error(`Failed to delete journey stage #${id}`);
    }
  }

  // ----- Unified Contact Segment methods -----

  async getContactSegments(userId?: number): Promise<ContactSegment[]> {
    try {
      let query = db.select().from(contactSegments).orderBy(desc(contactSegments.createdAt));
      
      if (userId) {
        query = query.where(eq(contactSegments.createdBy, userId));
      }
      
      return await query;
    } catch (error) {
      console.error("Failed to get contact segments:", error);
      return [];
    }
  }

  async getContactSegment(id: number): Promise<ContactSegment | undefined> {
    try {
      const [segment] = await db
        .select()
        .from(contactSegments)
        .where(eq(contactSegments.id, id))
        .limit(1);
      
      return segment;
    } catch (error) {
      console.error(`Failed to get contact segment #${id}:`, error);
      return undefined;
    }
  }

  async createContactSegment(segment: InsertContactSegment): Promise<ContactSegment> {
    try {
      const segmentData = {
        ...segment,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const [newSegment] = await db
        .insert(contactSegments)
        .values(segmentData as any)
        .returning();
      
      // Refresh counts after creation
      await this.refreshSegmentCounts(newSegment.id);
      
      return newSegment;
    } catch (error) {
      console.error("Failed to create contact segment:", error);
      throw new Error("Failed to create contact segment");
    }
  }

  async updateContactSegment(id: number, segmentData: Partial<ContactSegment>): Promise<ContactSegment> {
    try {
      const updateData = {
        ...segmentData,
        updatedAt: new Date()
      };
      
      const result = await db
        .update(contactSegments)
        .set(updateData)
        .where(eq(contactSegments.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error(`Contact segment with ID ${id} not found`);
      }
      
      // Refresh counts after update
      await this.refreshSegmentCounts(id);
      
      return result[0];
    } catch (error) {
      console.error(`Failed to update contact segment #${id}:`, error);
      throw new Error(`Failed to update contact segment #${id}`);
    }
  }

  async deleteContactSegment(id: number): Promise<void> {
    try {
      await db
        .delete(contactSegments)
        .where(eq(contactSegments.id, id));
    } catch (error) {
      console.error(`Failed to delete contact segment #${id}:`, error);
      throw new Error(`Failed to delete contact segment #${id}`);
    }
  }

  // ----- Unified Contact methods -----

  async getUnifiedContacts(userId?: number): Promise<Contact[]> {
    try {
      // Get all active (non-deleted) leads and customers, convert them to unified Contact format
      const [leadResults, customerResults] = await Promise.all([
        db.select().from(leads)
          .where(ne(leads.leadStatus, 'deleted'))
          .orderBy(desc(leads.createdAt)),
        db.select().from(customers)
          .where(ne(customers.status, 'deleted'))
          .orderBy(desc(customers.createdAt))
      ]);
      
      const unifiedContacts: Contact[] = [];
      
      // Convert leads to unified Contact format
      leadResults.forEach(lead => {
        unifiedContacts.push({
          id: `lead_${lead.id}`, // Prefix to avoid ID conflicts with customers
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          jobTitle: lead.jobTitle,
          industry: lead.industry,
          contactType: 'lead',
          lifecycleStage: 'lead', // Map lead status to lifecycle stage for consistency
          country: lead.location, // Map location to country for table display
          leadSource: lead.leadSource,
          leadStatus: lead.leadStatus,
          leadOwner: lead.leadOwner,
          score: lead.score,
          engagementLevel: lead.engagementLevel,
          conversionProbability: lead.conversionProbability,
          tags: lead.tags,
          notes: lead.notes,
          location: lead.location,
          initials: lead.initials,
          createdAt: lead.createdAt,
          currentJourneyStageId: lead.currentJourneyStageId,
          journeyEntryDate: lead.journeyEntryDate
        });
      });
      
      // Convert customers to unified Contact format
      customerResults.forEach(customer => {
        unifiedContacts.push({
          id: `customer_${customer.id}`, // Prefix to avoid ID conflicts with leads
          name: `${customer.firstName} ${customer.lastName}`.trim(),
          email: customer.email,
          phone: customer.phone,
          company: customer.company,
          jobTitle: customer.jobTitle,
          industry: customer.industry,
          contactType: 'customer',
          lifecycleStage: customer.lifecycleStage,
          country: customer.country,
          contactOwner: customer.contactOwner,
          contactSource: customer.contactSource,
          linkedinUrl: customer.linkedinUrl,
          legalBasis: customer.legalBasis,
          location: customer.location,
          initials: customer.initials,
          createdAt: customer.createdAt,
          currentJourneyStageId: customer.currentJourneyStageId,
          journeyEntryDate: customer.journeyEntryDate
        });
      });
      
      return unifiedContacts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Failed to get unified contacts:", error);
      return [];
    }
  }

  async getContactsBySegment(segmentId: number): Promise<Contact[]> {
    try {
      const segment = await this.getContactSegment(segmentId);
      if (!segment) {
        return [];
      }
      
      const allContacts = await this.getUnifiedContacts();
      const filters = segment.filterCriteria as ContactSegmentFilter[];
      
      return this.applyContactFilters(allContacts, filters);
    } catch (error) {
      console.error(`Failed to get contacts for segment #${segmentId}:`, error);
      return [];
    }
  }

  applyContactFilters(contacts: Contact[], filters: ContactSegmentFilter[]): Contact[] {
    return contacts.filter(contact => {
      return filters.every(filter => {
        // Skip if filter doesn't apply to this contact type
        if (filter.contactTypes && !filter.contactTypes.includes(contact.contactType)) {
          return true;
        }
        
        const fieldValue = contact[filter.field as keyof Contact];
        
        switch (filter.operator) {
          case 'equals':
            return fieldValue === filter.value;
          case 'notEquals':
            return fieldValue !== filter.value;
          case 'contains':
            return typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(String(filter.value).toLowerCase());
          case 'startsWith':
            return typeof fieldValue === 'string' && fieldValue.toLowerCase().startsWith(String(filter.value).toLowerCase());
          case 'endsWith':
            return typeof fieldValue === 'string' && fieldValue.toLowerCase().endsWith(String(filter.value).toLowerCase());
          case 'greaterThan':
            return typeof fieldValue === 'number' && fieldValue > Number(filter.value);
          case 'lessThan':
            return typeof fieldValue === 'number' && fieldValue < Number(filter.value);
          case 'greaterThanOrEqual':
            return typeof fieldValue === 'number' && fieldValue >= Number(filter.value);
          case 'lessThanOrEqual':
            return typeof fieldValue === 'number' && fieldValue <= Number(filter.value);
          case 'isEmpty':
            return fieldValue === null || fieldValue === undefined || fieldValue === '';
          case 'isNotEmpty':
            return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
          case 'in':
            return Array.isArray(filter.value) && filter.value.includes(fieldValue);
          default:
            return true;
        }
      });
    });
  }

  async refreshSegmentCounts(segmentId: number): Promise<ContactSegment> {
    try {
      const segment = await this.getContactSegment(segmentId);
      if (!segment) {
        throw new Error(`Segment ${segmentId} not found`);
      }
      
      const contacts = await this.getContactsBySegment(segmentId);
      const leadCount = contacts.filter(c => c.contactType === 'lead').length;
      const customerCount = contacts.filter(c => c.contactType === 'customer').length;
      const totalCount = contacts.length;
      
      // Calculate conversion rate and average score
      const conversionRate = leadCount > 0 ? customerCount / leadCount : 0;
      const scores = contacts.filter(c => c.score !== null && c.score !== undefined).map(c => c.score!);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      
      const [updatedSegment] = await db
        .update(contactSegments)
        .set({
          leadCount,
          customerCount,
          totalCount,
          conversionRate,
          avgScore,
          lastUpdated: new Date()
        })
        .where(eq(contactSegments.id, segmentId))
        .returning();
      
      return updatedSegment;
    } catch (error) {
      console.error(`Failed to refresh segment counts for #${segmentId}:`, error);
      throw new Error(`Failed to refresh segment counts for #${segmentId}`);
    }
  }

  // ----- Contact Notes methods -----

  async getContactNotes(contactId: string): Promise<SelectContactNote[]> {
    try {
      const result = await db
        .select()
        .from(contactNotes)
        .where(eq(contactNotes.contactId, contactId))
        .orderBy(desc(contactNotes.createdAt));
      
      return result;
    } catch (error) {
      console.error(`Failed to get notes for contact ${contactId}:`, error);
      throw new Error(`Failed to get notes for contact ${contactId}`);
    }
  }

  async addContactNote(contactNote: InsertContactNote): Promise<SelectContactNote> {
    try {
      const [result] = await db
        .insert(contactNotes)
        .values(contactNote)
        .returning();
      
      return result;
    } catch (error) {
      console.error("Failed to add contact note:", error);
      throw new Error("Failed to add contact note");
    }
  }

  async getUnifiedContactByLegacyId(legacyId: number, contactType: 'lead' | 'customer'): Promise<string | null> {
    try {
      // For now, we'll create a simple mapping strategy
      // In a real scenario, you'd have a mapping table or use the unified contacts table
      // This is a temporary solution until full migration to unified contacts
      
      if (contactType === 'lead') {
        // Check if lead exists
        const leadResult = await db.select().from(leads).where(eq(leads.id, legacyId));
        if (leadResult.length === 0) return null;
        
        // For now, return a deterministic UUID based on the legacy ID
        // In production, you'd store this mapping in a dedicated table
        return `lead-${legacyId}-uuid`;
      } else {
        // Check if customer exists
        const customerResult = await db.select().from(customers).where(eq(customers.id, legacyId));
        if (customerResult.length === 0) return null;
        
        return `customer-${legacyId}-uuid`;
      }
    } catch (error) {
      console.error(`Failed to get unified contact ID for legacy ${contactType} ${legacyId}:`, error);
      return null;
    }
  }
}