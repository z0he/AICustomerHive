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
      // Original leads
      { id: 1, name: "Skyline Corp", initials: "SC", industry: "Technology", location: "San Francisco", score: 92, createdAt: "2023-05-10" },
      { id: 2, name: "Green Logistics", initials: "GL", industry: "Transportation", location: "Chicago", score: 86, createdAt: "2023-05-12" },
      { id: 3, name: "Apex Financial", initials: "AF", industry: "Finance", location: "New York", score: 79, createdAt: "2023-05-15" },
      { id: 4, name: "Healthcare Hub", initials: "HH", industry: "Healthcare", location: "Boston", score: 72, createdAt: "2023-05-18" },
      { id: 5, name: "EcoMade Products", initials: "EM", industry: "Manufacturing", location: "Seattle", score: 68, createdAt: "2023-05-20" },
      
      // New enhanced leads with detailed information
      { 
        id: 6, 
        name: "David Miller", 
        initials: "DM", 
        industry: "Technology", 
        location: "Boston", 
        score: 85, 
        createdAt: "2023-08-15", 
        email: "david@technovation.com", 
        phone: "+1-555-234-5678", 
        company: "Technovation Inc", 
        jobTitle: "CTO", 
        leadSource: "website", 
        leadStatus: "qualified", 
        leadOwner: "Jane Smith", 
        notes: "[2023-08-15 10:30 AM]\nInitial contact through website form. Expressed interest in enterprise solutions.\n\n[2023-08-20 2:15 PM]\nFollowed up via email. Scheduled demo for next week."
      },
      { 
        id: 7, 
        name: "Sarah Johnson", 
        initials: "SJ", 
        industry: "Retail", 
        location: "Chicago", 
        score: 65, 
        createdAt: "2023-09-01", 
        email: "sarah.j@globalretail.com", 
        phone: "+1-555-876-5432", 
        company: "Global Retail Solutions", 
        jobTitle: "Procurement Manager", 
        leadSource: "referral", 
        leadStatus: "contacted", 
        engagement_level: 65, 
        leadOwner: "John Doe",
        nextFollowUpDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 2), // 2 days from now
        notes: "[2023-09-01 11:45 AM]\nReferred by Bob Smith at Tech Solutions. Interested in inventory management system."
      },
      { 
        id: 8, 
        name: "Michael Chen", 
        initials: "MC", 
        industry: "Healthcare", 
        location: "San Francisco", 
        score: 40, 
        createdAt: "2023-09-05", 
        email: "michael@healthinnovate.org", 
        phone: "+1-555-345-6789", 
        company: "Health Innovate", 
        jobTitle: "Director of Technology", 
        leadSource: "conference", 
        leadStatus: "new", 
        engagement_level: 30,
        notes: "[2023-09-05 3:30 PM]\nMet at HealthTech Conference. Requested information about patient management solutions."
      },
      { 
        id: 9, 
        name: "Emily Rodriguez", 
        initials: "ER", 
        industry: "Education", 
        location: "Austin", 
        score: 78, 
        createdAt: "2023-08-25", 
        email: "emily@edutech.edu", 
        phone: "+1-555-456-7890", 
        company: "EduTech Systems", 
        jobTitle: "Dean of Technology", 
        leadSource: "email_campaign", 
        leadStatus: "qualified", 
        engagement_level: 80, 
        leadOwner: "Robert Johnson",
        nextFollowUpDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 24), // 1 day from now
        notes: "[2023-08-25 9:15 AM]\nResponded to email campaign. Very interested in student management platform.\n\n[2023-09-02 1:30 PM]\nCompleted product demo. Requesting proposal for 5,000-student system."
      },
      { 
        id: 10, 
        name: "James Wilson", 
        initials: "JW", 
        industry: "Construction", 
        location: "Denver", 
        score: 90, 
        createdAt: "2023-08-10", 
        email: "james@constructco.com", 
        phone: "+1-555-567-8901", 
        company: "ConstructCo Builders", 
        jobTitle: "Operations Director", 
        leadSource: "advertisement", 
        leadStatus: "proposal", 
        engagement_level: 90, 
        leadOwner: "Emily Williams",
        nextFollowUpDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 12), // 12 hours from now
        notes: "[2023-08-10 2:45 PM]\nClicked through LinkedIn ad. Requesting information on project management tools.\n\n[2023-08-17 10:00 AM]\nDemo completed. Very impressed with scheduling features.\n\n[2023-09-01 3:30 PM]\nSent proposal for enterprise plan with 50 user licenses."
      },
      { 
        id: 11, 
        name: "Olivia Thompson", 
        initials: "OT", 
        industry: "Finance", 
        location: "New York", 
        score: 95, 
        createdAt: "2023-07-28", 
        email: "olivia@financepro.com", 
        phone: "+1-555-678-9012", 
        company: "Finance Professionals LLC", 
        jobTitle: "Managing Partner", 
        leadSource: "partner", 
        leadStatus: "negotiation", 
        engagement_level: 95, 
        leadOwner: "John Doe",
        nextFollowUpDate: new Date(new Date().getTime() + 1000 * 60 * 60 * 6), // 6 hours from now
        notes: "[2023-07-28 11:30 AM]\nIntroduced by banking partner. Needs client management solution with compliance features.\n\n[2023-08-05 1:15 PM]\nDetailed requirements call completed. Sent product specifications.\n\n[2023-08-20 9:45 AM]\nProposal presented. Negotiating contract terms and implementation timeline."
      },
      { 
        id: 12, 
        name: "Daniel Garcia", 
        initials: "DG", 
        industry: "Legal", 
        location: "Miami", 
        score: 20, 
        createdAt: "2023-07-10", 
        email: "daniel@legalexperts.com", 
        phone: "+1-555-789-0123", 
        company: "Legal Experts Associates", 
        jobTitle: "IT Manager", 
        leadSource: "website", 
        leadStatus: "lost", 
        engagement_level: 20,
        notes: "[2023-07-10 10:15 AM]\nRequested information through website contact form. Interested in document management system.\n\n[2023-07-16 3:30 PM]\nDemo scheduled but canceled last minute.\n\n[2023-08-01 11:00 AM]\nFollowed up multiple times. Informed us they selected a competitor's solution."
      },
      { 
        id: 13, 
        name: "Sophia Lee", 
        initials: "SL", 
        industry: "Marketing", 
        location: "Portland", 
        score: 100, 
        createdAt: "2023-06-15", 
        email: "sophia@creativedesigns.com", 
        phone: "+1-555-890-1234", 
        company: "Creative Designs Agency", 
        jobTitle: "Founder & CEO", 
        leadSource: "social_media", 
        leadStatus: "won", 
        engagement_level: 100, 
        leadOwner: "Jane Smith",
        tags: ["VIP", "Quick Close", "Referral Source"],
        notes: "[2023-06-15 9:30 AM]\nEngaged with our Instagram post about design collaboration tools.\n\n[2023-06-22 2:00 PM]\nDemo completed with entire creative team. Enthusiastic response.\n\n[2023-07-05 11:45 AM]\nSigned annual contract for premium plan. Setting up implementation schedule."
      }
    ];
    
    leads.forEach(lead => {
      this.leads.set(lead.id, lead as Lead);
    });
    this.leadCurrentId = 14;  // Update to reflect the highest lead ID + 1
    
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
