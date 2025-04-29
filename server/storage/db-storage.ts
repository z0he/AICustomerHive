import { eq, desc, and, sql, asc, gte, lte } from "drizzle-orm";
import { db } from "../lib/db";
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
  calendarEvents, type CalendarEvent, type InsertCalendarEvent
} from "@shared/schema";

export class DbStorage implements IStorage {
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
            'contactIndustry', 'contactOwner', 'contactSource', 'contactType',
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
          contactIndustry: data.contactIndustry || null,
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
      industry: lead.contactIndustry || lead.industry || null,
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
  
  async updateLead(id: number, leadData: Partial<Lead>): Promise<Lead> {
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
    // In a real implementation, we would calculate metrics based on actual data
    // For now, returning sample metrics
    return [
      {
        title: "Total Customers",
        value: "1,234",
        change: {
          value: "+5.2%",
          type: "increase",
          label: "vs last month"
        },
        icon: "users"
      },
      {
        title: "Active Campaigns",
        value: "12",
        change: {
          value: "+2",
          type: "increase",
          label: "vs last month"
        },
        icon: "campaigns"
      },
      {
        title: "Conversion Rate",
        value: "24.8%",
        change: {
          value: "-1.1%",
          type: "decrease",
          label: "vs last month"
        },
        icon: "conversion"
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
      const success = await sendEmail({
        from,
        to,
        subject,
        html: body,
        text: options.text || body.replace(/<[^>]*>?/gm, '') // Strip HTML if no text provided
      });
      
      if (!success) {
        throw new Error('Failed to send email through Mailgun');
      }
      
      // Log the email
      const emailLog = await this.createEmailLog({
        from,
        to,
        subject,
        body,
        status: 'sent',
        campaignId: options.campaignId,
        relatedEntityType: options.relatedEntityType,
        relatedEntityId: options.relatedEntityId,
        templateId: options.templateId,
        metadata: options.metadata || {}
      });
      
      return emailLog;
    } catch (error) {
      console.error("Failed to send email:", error);
      
      // Log the failed email
      const emailLog = await this.createEmailLog({
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
      
      // Import the sendTemplateEmail function from mailgun.ts
      const { sendTemplateEmail } = await import('../lib/mailgun');
      
      // Get from address
      const from = options.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@example.com';
      
      // Send the email
      const success = await sendTemplateEmail(
        to,
        from,
        template.subject,
        data,
        template.name
      );
      
      if (!success) {
        throw new Error('Failed to send template email through Mailgun');
      }
      
      // Log the email
      const emailLog = await this.createEmailLog({
        from,
        to,
        subject: template.subject,
        body: template.bodyHtml,
        status: 'sent',
        templateId,
        campaignId: options.campaignId,
        relatedEntityType: options.relatedEntityType,
        relatedEntityId: options.relatedEntityId,
        metadata: { templateData: data }
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
}