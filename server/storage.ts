import { 
  users, type User, type InsertUser,
  campaigns, type Campaign, type InsertCampaign,
  customers, type Customer, type InsertCustomer,
  leads, type Lead, type InsertLead,
  tasks, type Task, type InsertTask,
  customerActivities, type CustomerActivity,
  messageVariants, type MessageVariant, type InsertMessageVariant
} from "@shared/schema";
import { DbStorage } from "./storage/db-storage";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Campaign methods
  getCampaigns(period?: string): Promise<Campaign[]>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  getRecentCampaigns(limit?: number): Promise<Campaign[]>;
  
  // Message Variant methods (for A/B testing)
  getMessageVariants(campaignId: number): Promise<MessageVariant[]>;
  createMessageVariant(variant: InsertMessageVariant): Promise<MessageVariant>;
  updateMessageVariantStats(variantId: number, impressions?: number, conversions?: number): Promise<MessageVariant>;
  
  // Customer methods
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomerActivities(): Promise<CustomerActivity[]>;
  
  // Lead methods
  getLeads(): Promise<Lead[]>;
  getLeadsBySource(source: string): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  getLeadsByScoreRange(minScore: number, maxScore: number): Promise<Lead[]>;
  getLeadsRequiringFollowUp(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, leadData: Partial<Lead>): Promise<Lead>;
  updateLeadScore(id: number, scoringData: any): Promise<Lead>;
  getTopLeads(limit?: number): Promise<Lead[]>;
  assignLeadOwner(id: number, ownerName: string): Promise<Lead>;
  addLeadTags(id: number, tags: string[]): Promise<Lead>;
  addLeadNote(id: number, note: string): Promise<Lead>;
  
  // Task methods
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  toggleTaskCompletion(id: number): Promise<Task>;
  
  // Dashboard metrics
  getDashboardMetrics(): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private campaigns: Map<number, Campaign>;
  private customers: Map<number, Customer>;
  private leads: Map<number, Lead>;
  private tasks: Map<number, Task>;
  private customerActivities: CustomerActivity[];
  private messageVariants: Map<number, MessageVariant>;
  
  private userCurrentId: number;
  private campaignCurrentId: number;
  private customerCurrentId: number;
  private leadCurrentId: number;
  private taskCurrentId: number;
  private activityCurrentId: number;
  private messageVariantCurrentId: number;

  constructor() {
    this.users = new Map();
    this.campaigns = new Map();
    this.customers = new Map();
    this.leads = new Map();
    this.tasks = new Map();
    this.customerActivities = [];
    this.messageVariants = new Map();
    
    this.userCurrentId = 1;
    this.campaignCurrentId = 1;
    this.customerCurrentId = 1;
    this.leadCurrentId = 1;
    this.taskCurrentId = 1;
    this.activityCurrentId = 1;
    this.messageVariantCurrentId = 1;
    
    this.seedData();
  }
  
  // ----- User methods -----
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { 
      ...insertUser, 
      id,
      name: insertUser.name || insertUser.username,
      initials: this.getInitials(insertUser.name || insertUser.username)
    };
    this.users.set(id, user);
    return user;
  }
  
  // ----- Campaign methods -----
  
  async getCampaigns(period: string = '30d'): Promise<Campaign[]> {
    return Array.from(this.campaigns.values())
      .sort((a, b) => b.id - a.id); // Sort by newest first
  }
  
  async getCampaign(id: number): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }
  
  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = this.campaignCurrentId++;
    
    // Handle targetAudience which could be a complex object or a string
    let targetAudienceStr: string;
    if (typeof insertCampaign.targetAudience === 'string') {
      targetAudienceStr = insertCampaign.targetAudience;
    } else {
      // Convert object to string representation
      targetAudienceStr = JSON.stringify(insertCampaign.targetAudience);
    }
    
    const campaign: Campaign = { 
      id,
      name: insertCampaign.name,
      type: insertCampaign.type,
      targetAudience: targetAudienceStr,
      message: insertCampaign.message,
      startDate: insertCampaign.startDate,
      endDate: insertCampaign.endDate,
      createdAt: new Date(),
      conversions: 0,
      percentage: 0
    };
    
    this.campaigns.set(id, campaign);
    return campaign;
  }
  
  async getRecentCampaigns(limit: number = 3): Promise<Campaign[]> {
    return Array.from(this.campaigns.values())
      .sort((a, b) => b.id - a.id)
      .slice(0, limit);
  }
  
  // ----- Message Variant methods (for A/B testing) -----
  
  async getMessageVariants(campaignId: number): Promise<MessageVariant[]> {
    return Array.from(this.messageVariants.values())
      .filter(variant => variant.campaignId === campaignId);
  }
  
  async createMessageVariant(variant: InsertMessageVariant): Promise<MessageVariant> {
    const id = this.messageVariantCurrentId++;
    const messageVariant: MessageVariant = {
      ...variant,
      id,
      impressions: 0,
      conversions: 0,
      conversionRate: 0,
      createdAt: new Date()
    };
    
    this.messageVariants.set(id, messageVariant);
    return messageVariant;
  }
  
  async updateMessageVariantStats(
    variantId: number, 
    impressions?: number, 
    conversions?: number
  ): Promise<MessageVariant> {
    const variant = this.messageVariants.get(variantId);
    if (!variant) {
      throw new Error(`Message variant with ID ${variantId} not found`);
    }
    
    const updatedVariant = { 
      ...variant,
      impressions: impressions !== undefined ? variant.impressions + impressions : variant.impressions,
      conversions: conversions !== undefined ? variant.conversions + conversions : variant.conversions
    };
    
    // Calculate conversion rate
    if (updatedVariant.impressions > 0) {
      updatedVariant.conversionRate = Math.round((updatedVariant.conversions / updatedVariant.impressions) * 100);
    }
    
    this.messageVariants.set(variantId, updatedVariant);
    return updatedVariant;
  }
  
  // ----- Customer methods -----
  
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }
  
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }
  
  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = this.customerCurrentId++;
    // Create full name from first and last name
    const fullName = `${insertCustomer.firstName} ${insertCustomer.lastName}`;
    
    const customer: Customer = { 
      ...insertCustomer,
      id,
      name: fullName,
      initials: this.getInitials(fullName),
      createdAt: new Date(),
      status: 'active'
    };
    this.customers.set(id, customer);
    return customer;
  }
  
  async getCustomerActivities(): Promise<CustomerActivity[]> {
    return this.customerActivities;
  }
  
  // ----- Lead methods -----
  
  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values());
  }
  
  async getLeadsBySource(source: string): Promise<Lead[]> {
    return Array.from(this.leads.values())
      .filter(lead => lead.leadSource === source);
  }
  
  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return Array.from(this.leads.values())
      .filter(lead => lead.leadStatus === status);
  }
  
  async getLeadsByScoreRange(minScore: number, maxScore: number): Promise<Lead[]> {
    return Array.from(this.leads.values())
      .filter(lead => {
        const score = lead.score ?? 0;
        return score >= minScore && score <= maxScore;
      });
  }
  
  async getLeadsRequiringFollowUp(): Promise<Lead[]> {
    const now = new Date();
    return Array.from(this.leads.values())
      .filter(lead => {
        // Include leads with nextFollowUpDate today or in the past
        if (lead.nextFollowUpDate) {
          return new Date(lead.nextFollowUpDate) <= now;
        }
        return false;
      })
      .sort((a, b) => {
        // Sort by follow-up date (oldest first)
        if (a.nextFollowUpDate && b.nextFollowUpDate) {
          return new Date(a.nextFollowUpDate).getTime() - new Date(b.nextFollowUpDate).getTime();
        }
        return 0;
      });
  }
  
  async getLead(id: number): Promise<Lead | undefined> {
    return this.leads.get(id);
  }
  
  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = this.leadCurrentId++;
    
    // Calculate an initial lead score if not provided
    let score = insertLead.score;
    if (score === undefined) {
      score = this.calculateLeadScore(insertLead);
    }
    
    const lead: Lead = { 
      ...insertLead, 
      id,
      initials: this.getInitials(insertLead.name),
      score,
      createdAt: new Date()
    };
    this.leads.set(id, lead);
    return lead;
  }
  
  async updateLead(id: number, leadData: Partial<Lead>): Promise<Lead> {
    const lead = this.leads.get(id);
    if (!lead) {
      throw new Error(`Lead with ID ${id} not found`);
    }
    
    const updatedLead = { ...lead, ...leadData };
    this.leads.set(id, updatedLead);
    return updatedLead;
  }
  
  async updateLeadScore(id: number, scoringData: any): Promise<Lead> {
    const lead = this.leads.get(id);
    if (!lead) {
      throw new Error(`Lead with ID ${id} not found`);
    }
    
    // Calculate new score based on scoring data
    // This is where we would implement our advanced lead scoring algorithm
    // For now, we'll use a simplified approach
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
    const updatedLead = { 
      ...lead, 
      score: newScore,
      engagementLevel: scoringData.engagementLevel || lead.engagementLevel,
      conversionProbability: this.calculateConversionProbability(newScore)
    };
    
    this.leads.set(id, updatedLead);
    return updatedLead;
  }
  
  async getTopLeads(limit: number = 5): Promise<Lead[]> {
    return Array.from(this.leads.values())
      .sort((a, b) => {
        // Safely handle null/undefined scores
        const scoreA = a.score ?? 0;
        const scoreB = b.score ?? 0;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }
  
  async assignLeadOwner(id: number, ownerName: string): Promise<Lead> {
    const lead = this.leads.get(id);
    if (!lead) {
      throw new Error(`Lead with ID ${id} not found`);
    }
    
    const updatedLead = { ...lead, leadOwner: ownerName };
    this.leads.set(id, updatedLead);
    return updatedLead;
  }
  
  async addLeadTags(id: number, newTags: string[]): Promise<Lead> {
    const lead = this.leads.get(id);
    if (!lead) {
      throw new Error(`Lead with ID ${id} not found`);
    }
    
    // Combine existing tags with new ones, removing duplicates
    const existingTags = lead.tags || [];
    const updatedTags = [...new Set([...existingTags, ...newTags])];
    
    const updatedLead = { ...lead, tags: updatedTags };
    this.leads.set(id, updatedLead);
    return updatedLead;
  }
  
  async addLeadNote(id: number, note: string): Promise<Lead> {
    const lead = this.leads.get(id);
    if (!lead) {
      throw new Error(`Lead with ID ${id} not found`);
    }
    
    // Append new note to existing notes
    const existingNotes = lead.notes || '';
    const timestamp = new Date().toISOString();
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n\n[${timestamp}]\n${note}`
      : `[${timestamp}]\n${note}`;
    
    const updatedLead = { ...lead, notes: updatedNotes };
    this.leads.set(id, updatedLead);
    return updatedLead;
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
    return Array.from(this.tasks.values());
  }
  
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskCurrentId++;
    const task: Task = { 
      ...insertTask, 
      id,
      createdAt: new Date(),
      completed: false
    };
    this.tasks.set(id, task);
    return task;
  }
  
  async toggleTaskCompletion(id: number): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task with ID ${id} not found`);
    }
    
    const updatedTask = { ...task, completed: !task.completed };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  // ----- Dashboard metrics -----
  
  async getDashboardMetrics(): Promise<any[]> {
    return [
      {
        title: "Total Customers",
        value: "1,284",
        change: {
          value: "12%",
          type: "increase",
          label: "vs last month"
        },
        icon: "users"
      },
      {
        title: "Active Campaigns",
        value: "5",
        change: {
          value: "3",
          type: "increase",
          label: "new this week"
        },
        icon: "campaigns"
      },
      {
        title: "Conversion Rate",
        value: "24.8%",
        change: {
          value: "2.3%",
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
      .slice(0, 2);
  }
  
  // ----- Seed data -----
  
  private seedData() {
    // NOTE: This seed data is only used when NO_DB=true and we're using in-memory storage
    // The types here might not perfectly match, but this is fallback code only
    // Our primary database implementation is DbStorage
    
    // Seed users
    this.users.set(1, {
      id: 1,
      username: "johndoe",
      password: "password",
      name: "John Doe",
      initials: "JD"
    });
    this.userCurrentId = 2;
    
    // Seed campaigns
    const campaigns = [
      { id: 1, name: "Summer Sale", type: "promotional", targetAudience: "all", message: "Summer deals", startDate: "2023-06-01", endDate: "2023-06-30", createdAt: "2023-05-15", conversions: 423, percentage: 70 },
      { id: 2, name: "Product Launch", type: "email", targetAudience: "new", message: "New product announcement", startDate: "2023-06-15", endDate: "2023-07-15", createdAt: "2023-06-01", conversions: 287, percentage: 50 },
      { id: 3, name: "Re-engagement", type: "email", targetAudience: "inactive", message: "We miss you", startDate: "2023-06-10", endDate: "2023-06-25", createdAt: "2023-06-05", conversions: 156, percentage: 30 },
      { id: 4, name: "Nurture", type: "nurture", targetAudience: "leads", message: "Learn more about our services", startDate: "2023-06-01", endDate: "2023-08-01", createdAt: "2023-05-20", conversions: 320, percentage: 60 },
      { id: 5, name: "Newsletter", type: "email", targetAudience: "all", message: "Monthly updates", startDate: "2023-06-01", endDate: "2023-06-07", createdAt: "2023-05-25", conversions: 201, percentage: 40 }
    ];
    
    campaigns.forEach(campaign => {
      this.campaigns.set(campaign.id, campaign as Campaign);
    });
    this.campaignCurrentId = 6;
    
    // Seed customers
    const customers = [
      { id: 1, name: "Jane Cooper", email: "jane@example.com", initials: "JC", phone: "555-1234", company: "Acme Inc", createdAt: "2023-01-15", status: "active" },
      { id: 2, name: "Robert Brown", email: "robert@example.com", initials: "RB", phone: "555-2345", company: "XYZ Corp", createdAt: "2023-02-20", status: "active" },
      { id: 3, name: "Angela White", email: "angela@example.com", initials: "AW", phone: "555-3456", company: "Tech Solutions", createdAt: "2023-03-10", status: "active" },
      { id: 4, name: "Thomas Martin", email: "thomas@example.com", initials: "TM", phone: "555-4567", company: "Global Services", createdAt: "2023-04-05", status: "inactive" }
    ];
    
    customers.forEach(customer => {
      this.customers.set(customer.id, customer as Customer);
    });
    this.customerCurrentId = 5;
    
    // Seed customer activities
    this.customerActivities = [
      { id: 1, customerId: 1, action: "Opened email", campaign: "Summer Sale", date: "Today, 10:32 AM", status: "active" },
      { id: 2, customerId: 2, action: "Clicked link", campaign: "Product Launch", date: "Today, 9:15 AM", status: "active" },
      { id: 3, customerId: 3, action: "Purchased product", campaign: "Re-engagement", date: "Yesterday, 5:22 PM", status: "active" },
      { id: 4, customerId: 4, action: "Unsubscribed", campaign: "Newsletter", date: "Yesterday, 3:48 PM", status: "inactive" }
    ];
    this.activityCurrentId = 5;
    
    // Seed leads
    const leads = [
      { id: 1, name: "Skyline Corp", initials: "SC", industry: "Technology", location: "San Francisco", score: 92, createdAt: "2023-05-10" },
      { id: 2, name: "Green Logistics", initials: "GL", industry: "Transportation", location: "Chicago", score: 86, createdAt: "2023-05-12" },
      { id: 3, name: "Apex Financial", initials: "AF", industry: "Finance", location: "New York", score: 79, createdAt: "2023-05-15" },
      { id: 4, name: "Healthcare Hub", initials: "HH", industry: "Healthcare", location: "Boston", score: 72, createdAt: "2023-05-18" },
      { id: 5, name: "EcoMade Products", initials: "EM", industry: "Manufacturing", location: "Seattle", score: 68, createdAt: "2023-05-20" }
    ];
    
    leads.forEach(lead => {
      this.leads.set(lead.id, lead as Lead);
    });
    this.leadCurrentId = 6;
    
    // Seed tasks
    const tasks = [
      { id: 1, title: "Follow up with Skyline Corp", dueDate: "Due today, 4:00 PM", completed: false, createdAt: "2023-06-01" },
      { id: 2, title: "Prepare Summer Campaign report", dueDate: "Due tomorrow, 10:00 AM", completed: false, createdAt: "2023-06-02" },
      { id: 3, title: "Schedule meeting with marketing team", dueDate: "Due Jun 15, 11:30 AM", completed: false, createdAt: "2023-06-03" },
      { id: 4, title: "Review lead scoring model", dueDate: "Due Jun 16, 2:00 PM", completed: false, createdAt: "2023-06-04" }
    ];
    
    tasks.forEach(task => {
      this.tasks.set(task.id, task as Task);
    });
    this.taskCurrentId = 5;
  }
}

// Use DbStorage to connect to a real PostgreSQL database
// Only fall back to MemStorage if explicitly requested with NO_DB=true environment variable
export const storage = process.env.NO_DB === 'true' 
  ? new MemStorage() 
  : new DbStorage();
