import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { IStorage } from "../storage";
import { 
  users, type User, type InsertUser,
  campaigns, type Campaign, type InsertCampaign,
  customers, type Customer, type InsertCustomer,
  customerActivities, type CustomerActivity,
  leads, type Lead, type InsertLead,
  tasks, type Task, type InsertTask,
  messageVariants, type MessageVariant, type InsertMessageVariant
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
}