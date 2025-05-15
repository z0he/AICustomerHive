import { 
  users, type User, type InsertUser,
  campaigns, type Campaign, type InsertCampaign,
  customers, type Customer, type InsertCustomer,
  leads, type Lead, type InsertLead,
  tasks, type Task, type InsertTask,
  customerActivities, type CustomerActivity,
  messageVariants, type MessageVariant, type InsertMessageVariant,
  calendarEvents, type CalendarEvent, type InsertCalendarEvent,
  emailTemplates, type EmailTemplate, type InsertEmailTemplate,
  emailLogs, type EmailLog, type InsertEmailLog,
  marketingForms, type MarketingForm, type InsertMarketingForm,
  formSubmissions, type FormSubmission, type InsertFormSubmission,
  webVisitors, type WebVisitor, type InsertWebVisitor,
  pageViews, type PageView, type InsertPageView,
  trackingInstallations, type TrackingInstallation, type InsertTrackingInstallation,
  chatConversations, type ChatConversation, type InsertChatConversation,
  chatMessages, type ChatMessage, type InsertChatMessage
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
  
  // Marketing Forms methods
  getMarketingForms(): Promise<MarketingForm[]>;
  getMarketingForm(id: number): Promise<MarketingForm | undefined>;
  createMarketingForm(form: InsertMarketingForm): Promise<MarketingForm>;
  updateMarketingForm(id: number, form: Partial<InsertMarketingForm>): Promise<MarketingForm>;
  deleteMarketingForm(id: number): Promise<boolean>;
  getFormSubmissions(formId: number): Promise<FormSubmission[]>;
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  incrementFormViews(formId: number): Promise<void>;
  incrementFormSubmissions(formId: number): Promise<void>;
  generateFormEmbedCode(formId: number): Promise<string>;
  
  // Chat Assistant methods
  getChatConversations(): Promise<ChatConversation[]>;
  getChatConversationsByUserId(userId: number): Promise<ChatConversation[]>;
  getChatConversationById(id: number): Promise<ChatConversation | undefined>;
  createChatConversation(conversation: InsertChatConversation & { createdAt: Date }): Promise<ChatConversation>;
  updateChatConversation(id: number, conversationData: Partial<ChatConversation>): Promise<ChatConversation>;
  deleteChatConversation(id: number): Promise<void>;
  getChatMessages(): Promise<ChatMessage[]>;
  getChatMessagesByConversationId(conversationId: number): Promise<ChatMessage[]>;
  getChatMessageById(id: number): Promise<ChatMessage | undefined>;
  createChatMessage(message: InsertChatMessage & { createdAt: Date }): Promise<ChatMessage>;
  
  // Web Visitor Tracking methods
  getWebVisitorByVisitorId(visitorId: string): Promise<WebVisitor | undefined>;
  createWebVisitor(visitor: InsertWebVisitor): Promise<WebVisitor>;
  updateWebVisitor(visitorId: string, data: Partial<WebVisitor>): Promise<WebVisitor>;
  createPageView(pageView: InsertPageView): Promise<PageView>;
  
  // Tracking Installations methods
  getTrackingInstallations(): Promise<TrackingInstallation[]>;
  getTrackingInstallation(id: number): Promise<TrackingInstallation | undefined>;
  createTrackingInstallation(installation: InsertTrackingInstallation): Promise<TrackingInstallation>;
  updateTrackingInstallation(id: number, data: Partial<TrackingInstallation>): Promise<TrackingInstallation>;
  generateTrackingCode(websiteUrl: string, options: {owner: number}): Promise<string>;
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
  exportCustomers(): Promise<any>; // Exports customer data in standard format
  importCustomers(customerData: any[]): Promise<{ imported: number; errors: any[] }>;
  
  // Lead methods
  getLeads(): Promise<Lead[]>;
  getLeadsBySource(source: string): Promise<Lead[]>;
  getLeadsByStatus(status: string): Promise<Lead[]>;
  getLeadsByScoreRange(minScore: number, maxScore: number): Promise<Lead[]>;
  getLeadsRequiringFollowUp(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  insertLead(lead: any): Promise<Lead>; // For import API
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
  
  // Calendar/Scheduling methods
  getCalendarEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]>;
  getCalendarEventsByOwner(ownerId: number, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]>;
  getCalendarEventsByEntity(entityType: string, entityId: number): Promise<CalendarEvent[]>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, eventData: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<boolean>;
  
  // Email methods
  getEmailTemplates(category?: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, templateData: Partial<EmailTemplate>): Promise<EmailTemplate>;
  deleteEmailTemplate(id: number): Promise<boolean>;
  
  // Email logs
  getEmailLogs(entityType?: string, entityId?: number): Promise<EmailLog[]>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
  sendEmail(from: string, to: string, subject: string, body: string, options?: any): Promise<EmailLog>;
  sendEmailWithTemplate(templateId: number, to: string, data: any, options?: any): Promise<EmailLog>;
  
  // Marketing Forms
  getMarketingForms(folder?: string): Promise<MarketingForm[]>;
  getMarketingForm(id: number): Promise<MarketingForm | undefined>;
  createMarketingForm(form: InsertMarketingForm): Promise<MarketingForm>;
  updateMarketingForm(id: number, formData: Partial<MarketingForm>): Promise<MarketingForm>;
  deleteMarketingForm(id: number): Promise<boolean>;
  generateFormEmbedCode(formId: number): Promise<string>;
  incrementFormViews(formId: number): Promise<MarketingForm>;
  incrementFormSubmissions(formId: number): Promise<MarketingForm>;
  
  // Form Submissions
  getFormSubmissions(formId?: number): Promise<FormSubmission[]>;
  getFormSubmission(id: number): Promise<FormSubmission | undefined>;
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  getFormSubmissionsByContact(contactId: number): Promise<FormSubmission[]>;
  
  // Web Visitor Tracking
  getWebVisitors(): Promise<WebVisitor[]>;
  getWebVisitor(id: number): Promise<WebVisitor | undefined>;
  getWebVisitorByVisitorId(visitorId: string): Promise<WebVisitor | undefined>;
  createWebVisitor(visitor: InsertWebVisitor): Promise<WebVisitor>;
  updateWebVisitor(visitorId: string, visitorData: Partial<WebVisitor>): Promise<WebVisitor>;
  identifyVisitor(visitorId: string, contactId: number): Promise<WebVisitor>;
  
  // Page Views
  getPageViews(visitorId?: string): Promise<PageView[]>;
  createPageView(pageView: InsertPageView): Promise<PageView>;
  getVisitorPageViews(visitorId: string): Promise<PageView[]>;
  getContactPageViews(contactId: number): Promise<PageView[]>;
  
  // Tracking Installations
  getTrackingInstallations(): Promise<TrackingInstallation[]>;
  getTrackingInstallation(id: number): Promise<TrackingInstallation | undefined>;
  createTrackingInstallation(installation: InsertTrackingInstallation): Promise<TrackingInstallation>;
  updateTrackingInstallation(id: number, data: Partial<TrackingInstallation>): Promise<TrackingInstallation>;
  generateTrackingCode(websiteUrl: string, settings?: any): Promise<string>;
  updateTrackingLastPing(id: number): Promise<TrackingInstallation>;
  
  // Chat Conversation methods
  getChatConversations(): Promise<ChatConversation[]>;
  getChatConversationsByUserId(userId: number): Promise<ChatConversation[]>;
  getChatConversationById(id: number): Promise<ChatConversation | undefined>;
  createChatConversation(conversation: InsertChatConversation & { createdAt: Date }): Promise<ChatConversation>;
  updateChatConversation(id: number, conversationData: Partial<ChatConversation>): Promise<ChatConversation>;
  deleteChatConversation(id: number): Promise<void>;
  
  // Chat Message methods
  getChatMessages(): Promise<ChatMessage[]>;
  getChatMessagesByConversationId(conversationId: number): Promise<ChatMessage[]>;
  getChatMessageById(id: number): Promise<ChatMessage | undefined>;
  createChatMessage(message: InsertChatMessage & { createdAt: Date }): Promise<ChatMessage>;
  updateChatMessage(id: number, messageData: Partial<ChatMessage>): Promise<ChatMessage>;
  deleteChatMessage(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  // ----- Marketing Forms methods -----
  async getMarketingForms(folder?: string): Promise<MarketingForm[]> {
    let forms = Array.from(this.marketingForms.values());
    
    if (folder) {
      forms = forms.filter(form => form.folder === folder);
    }
    
    return forms.sort((a, b) => b.id - a.id);
  }
  
  async getMarketingForm(id: number): Promise<MarketingForm | undefined> {
    return this.marketingForms.get(id);
  }
  
  async createMarketingForm(form: InsertMarketingForm): Promise<MarketingForm> {
    const id = this.marketingFormCurrentId++;
    
    const marketingForm: MarketingForm = {
      ...form,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      embedCode: '', // Will be generated separately
      views: 0,
      submissions: 0,
      conversionRate: 0
    };
    
    this.marketingForms.set(id, marketingForm);
    
    // Generate and update the embed code
    const embedCode = await this.generateFormEmbedCode(id);
    marketingForm.embedCode = embedCode;
    
    return marketingForm;
  }
  
  async updateMarketingForm(id: number, formData: Partial<MarketingForm>): Promise<MarketingForm> {
    const existingForm = this.marketingForms.get(id);
    
    if (!existingForm) {
      throw new Error(`Marketing form with ID ${id} not found`);
    }
    
    const updatedForm: MarketingForm = {
      ...existingForm,
      ...formData,
      id,
      updatedAt: new Date()
    };
    
    this.marketingForms.set(id, updatedForm);
    
    // If form fields were updated, regenerate the embed code
    if (formData.formFields || formData.formType || formData.formStyle) {
      updatedForm.embedCode = await this.generateFormEmbedCode(id);
    }
    
    return updatedForm;
  }
  
  async deleteMarketingForm(id: number): Promise<boolean> {
    return this.marketingForms.delete(id);
  }
  
  async incrementFormViews(formId: number): Promise<MarketingForm> {
    const form = this.marketingForms.get(formId);
    
    if (!form) {
      throw new Error(`Marketing form with ID ${formId} not found`);
    }
    
    const updatedForm = {
      ...form,
      views: form.views + 1
    };
    
    // Update conversion rate
    if (updatedForm.views > 0 && updatedForm.submissions > 0) {
      updatedForm.conversionRate = Math.round((updatedForm.submissions / updatedForm.views) * 100);
    }
    
    this.marketingForms.set(formId, updatedForm);
    return updatedForm;
  }
  
  async incrementFormSubmissions(formId: number): Promise<MarketingForm> {
    const form = this.marketingForms.get(formId);
    
    if (!form) {
      throw new Error(`Marketing form with ID ${formId} not found`);
    }
    
    const updatedForm = {
      ...form,
      submissions: form.submissions + 1
    };
    
    // Update conversion rate
    if (updatedForm.views > 0) {
      updatedForm.conversionRate = Math.round((updatedForm.submissions / updatedForm.views) * 100);
    }
    
    this.marketingForms.set(formId, updatedForm);
    return updatedForm;
  }
  
  async getFormSubmissions(formId?: number): Promise<FormSubmission[]> {
    let submissions = Array.from(this.formSubmissions.values());
    
    if (formId !== undefined) {
      submissions = submissions.filter(sub => sub.formId === formId);
    }
    
    return submissions.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }
  
  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    return this.formSubmissions.get(id);
  }
  
  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    const id = this.formSubmissionCurrentId++;
    
    const formSubmission: FormSubmission = {
      ...submission,
      id,
      submittedAt: new Date()
    };
    
    this.formSubmissions.set(id, formSubmission);
    return formSubmission;
  }
  
  async getFormSubmissionsByContact(contactId: number): Promise<FormSubmission[]> {
    return Array.from(this.formSubmissions.values())
      .filter(sub => sub.contactId === contactId)
      .sort((a, b) => 
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
  }
  
  async generateFormEmbedCode(formId: number): Promise<string> {
    // Generate JavaScript embed code for the form
    const embedCode = `<script src="https://yourcrm.com/api/marketing/forms/embed/${formId}.js"></script>
<div id="crm-form-${formId}"></div>`;
    
    return embedCode;
  }
  
  // ----- Web Visitor Tracking methods -----
  async getWebVisitors(): Promise<WebVisitor[]> {
    return Array.from(this.webVisitors.values())
      .sort((a, b) => 
        new Date(b.lastVisitAt).getTime() - new Date(a.lastVisitAt).getTime()
      );
  }
  
  async getWebVisitor(id: number): Promise<WebVisitor | undefined> {
    return Array.from(this.webVisitors.values())
      .find(visitor => visitor.id === id);
  }
  
  async getWebVisitorByVisitorId(visitorId: string): Promise<WebVisitor | undefined> {
    return this.webVisitors.get(visitorId);
  }
  
  async createWebVisitor(visitor: InsertWebVisitor): Promise<WebVisitor> {
    // For web visitors, we use the visitorId as the key in the map
    // But we still assign a numeric id for API consistency
    const id = this.webVisitors.size + 1;
    
    const webVisitor: WebVisitor = {
      ...visitor,
      id,
      totalVisits: 1,
      totalPageviews: 1
    };
    
    this.webVisitors.set(visitor.visitorId, webVisitor);
    return webVisitor;
  }
  
  async updateWebVisitor(visitorId: string, visitorData: Partial<WebVisitor>): Promise<WebVisitor> {
    const existingVisitor = this.webVisitors.get(visitorId);
    
    if (!existingVisitor) {
      throw new Error(`Web visitor with ID ${visitorId} not found`);
    }
    
    const updatedVisitor: WebVisitor = {
      ...existingVisitor,
      ...visitorData
    };
    
    this.webVisitors.set(visitorId, updatedVisitor);
    return updatedVisitor;
  }
  
  async identifyVisitor(visitorId: string, contactId: number): Promise<WebVisitor> {
    const visitor = this.webVisitors.get(visitorId);
    
    if (!visitor) {
      throw new Error(`Web visitor with ID ${visitorId} not found`);
    }
    
    const updatedVisitor: WebVisitor = {
      ...visitor,
      contactId
    };
    
    this.webVisitors.set(visitorId, updatedVisitor);
    return updatedVisitor;
  }
  
  async getPageViews(visitorId?: string): Promise<PageView[]> {
    let pageViews = Array.from(this.pageViews.values());
    
    if (visitorId) {
      pageViews = pageViews.filter(view => view.visitorId === visitorId);
    }
    
    return pageViews.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  
  async createPageView(pageView: InsertPageView): Promise<PageView> {
    const id = this.pageViewCurrentId++;
    
    const newPageView: PageView = {
      ...pageView,
      id
    };
    
    this.pageViews.set(id, newPageView);
    return newPageView;
  }
  
  async getVisitorPageViews(visitorId: string): Promise<PageView[]> {
    return Array.from(this.pageViews.values())
      .filter(view => view.visitorId === visitorId)
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
  
  async getContactPageViews(contactId: number): Promise<PageView[]> {
    // First get all visitors associated with this contact
    const visitors = Array.from(this.webVisitors.values())
      .filter(visitor => visitor.contactId === contactId)
      .map(visitor => visitor.visitorId);
    
    // Then get all page views from these visitors
    return Array.from(this.pageViews.values())
      .filter(view => visitors.includes(view.visitorId))
      .sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }
  
  async getTrackingInstallations(): Promise<TrackingInstallation[]> {
    return Array.from(this.trackingInstallations.values());
  }
  
  async getTrackingInstallation(id: number): Promise<TrackingInstallation | undefined> {
    return this.trackingInstallations.get(id);
  }
  
  async createTrackingInstallation(installation: InsertTrackingInstallation): Promise<TrackingInstallation> {
    const id = this.trackingInstallationCurrentId++;
    
    const trackingInstallation: TrackingInstallation = {
      ...installation,
      id,
      installDate: new Date(),
      lastPing: new Date(),
      status: 'active'
    };
    
    this.trackingInstallations.set(id, trackingInstallation);
    return trackingInstallation;
  }
  
  async updateTrackingInstallation(id: number, data: Partial<TrackingInstallation>): Promise<TrackingInstallation> {
    const installation = this.trackingInstallations.get(id);
    
    if (!installation) {
      throw new Error(`Tracking installation with ID ${id} not found`);
    }
    
    const updatedInstallation: TrackingInstallation = {
      ...installation,
      ...data
    };
    
    this.trackingInstallations.set(id, updatedInstallation);
    return updatedInstallation;
  }
  
  async updateTrackingLastPing(id: number): Promise<TrackingInstallation> {
    return this.updateTrackingInstallation(id, { lastPing: new Date() });
  }
  
  async generateTrackingCode(websiteUrl: string, settings?: any): Promise<string> {
    // Create a new tracking installation
    const installation = await this.createTrackingInstallation({
      websiteUrl,
      settings: settings || {},
      domain: new URL(websiteUrl).hostname
    });
    
    // Generate JavaScript tracking code
    const trackingCode = `<!-- CRM Tracking Code -->
<script>
  (function(w,d,s,l,i){
    w[l]=w[l]||[];w[l].push({'installationId':i});
    var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
    j.async=true;j.src='https://yourcrm.com/api/marketing/tracking/script.js?id='+i+dl;
    f.parentNode.insertBefore(j,f);
  })(window,document,'script','crmTracker','${installation.id}');
</script>
<!-- End CRM Tracking Code -->`;
    
    // Update the installation with the generated code
    await this.updateTrackingInstallation(installation.id, { 
      trackingCode, 
      status: 'pending' 
    });
    
    return trackingCode;
  }
  private users: Map<number, User>;
  private campaigns: Map<number, Campaign>;
  private customers: Map<number, Customer>;
  private leads: Map<number, Lead>;
  private tasks: Map<number, Task>;
  private customerActivities: CustomerActivity[];
  private messageVariants: Map<number, MessageVariant>;
  private calendarEvents: Map<number, CalendarEvent>;
  private emailTemplates: Map<number, EmailTemplate>;
  private emailLogs: Map<number, EmailLog>;
  private marketingForms: Map<number, MarketingForm>;
  private formSubmissions: Map<number, FormSubmission>;
  private webVisitors: Map<string, WebVisitor>;
  private pageViews: Map<number, PageView>;
  private trackingInstallations: Map<number, TrackingInstallation>;
  private chatConversations: Map<number, ChatConversation>;
  private chatMessages: Map<number, ChatMessage>;
  
  private userCurrentId: number;
  private campaignCurrentId: number;
  private customerCurrentId: number;
  private leadCurrentId: number;
  private taskCurrentId: number;
  private activityCurrentId: number;
  private messageVariantCurrentId: number;
  private calendarEventCurrentId: number;
  private emailTemplateCurrentId: number;
  private emailLogCurrentId: number;
  private marketingFormCurrentId: number;
  private formSubmissionCurrentId: number;
  private pageViewCurrentId: number;
  private trackingInstallationCurrentId: number;
  private chatConversationCurrentId: number;
  private chatMessageCurrentId: number;

  constructor() {
    this.users = new Map();
    this.campaigns = new Map();
    this.customers = new Map();
    this.leads = new Map();
    this.tasks = new Map();
    this.customerActivities = [];
    this.messageVariants = new Map();
    this.calendarEvents = new Map();
    this.emailTemplates = new Map();
    this.emailLogs = new Map();
    this.marketingForms = new Map();
    this.formSubmissions = new Map();
    this.webVisitors = new Map();
    this.pageViews = new Map();
    this.trackingInstallations = new Map();
    this.chatConversations = new Map();
    this.chatMessages = new Map();
    
    this.userCurrentId = 1;
    this.campaignCurrentId = 1;
    this.customerCurrentId = 1;
    this.leadCurrentId = 1;
    this.taskCurrentId = 1;
    this.activityCurrentId = 1;
    this.messageVariantCurrentId = 1;
    this.calendarEventCurrentId = 1;
    this.emailTemplateCurrentId = 1;
    this.emailLogCurrentId = 1;
    this.marketingFormCurrentId = 1;
    this.formSubmissionCurrentId = 1;
    this.pageViewCurrentId = 1;
    this.trackingInstallationCurrentId = 1;
    this.chatConversationCurrentId = 1;
    this.chatMessageCurrentId = 1;
    
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
  
  async exportCustomers(): Promise<any> {
    const customers = Array.from(this.customers.values());
    
    // Format the data for export in a standard format (CSV data structure)
    const exportData = {
      data: customers,
      metadata: {
        totalCount: customers.length,
        exportDate: new Date().toISOString(),
        fields: [
          'id', 'email', 'firstName', 'lastName', 'name', 'phone', 'company', 
          'jobTitle', 'linkedinUrl', 'lifecycleStage', 'leadStatus',
          'contactIndustry', 'contactOwner', 'contactSource', 'contactType',
          'country', 'legalBasis', 'createdAt', 'status'
        ]
      }
    };
    
    return exportData;
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
        const existingCustomer = Array.from(this.customers.values())
          .find(customer => customer.email === data.email);
        
        if (existingCustomer) {
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
          legalBasis: data.legalBasis || null
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
  
  async insertLead(lead: any): Promise<Lead> {
    const id = this.leadCurrentId++;
    
    // Ensure fullName is created from firstName and lastName
    const fullName = `${lead.firstName} ${lead.lastName}`;
    
    // Calculate an initial lead score if not provided
    let score = lead.score;
    if (score === undefined) {
      score = this.calculateLeadScore({
        ...lead,
        name: fullName
      });
    }
    
    // Create a Lead object from the imported data
    const newLead: Lead = {
      id,
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
      initials: this.getInitials(fullName),
      createdAt: new Date()
    };
    
    this.leads.set(id, newLead);
    return newLead;
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
  
  // ----- Calendar/Scheduling methods -----
  
  async getCalendarEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    let events = Array.from(this.calendarEvents.values());
    
    // Filter by date range if provided
    if (startDate || endDate) {
      events = events.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        if (startDate && endDate) {
          return eventStart >= startDate && eventEnd <= endDate;
        } else if (startDate) {
          return eventStart >= startDate;
        } else if (endDate) {
          return eventEnd <= endDate;
        }
        
        return true;
      });
    }
    
    return events;
  }
  
  async getCalendarEventsByOwner(ownerId: number, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    // First get all events, possibly filtered by date
    const events = await this.getCalendarEvents(startDate, endDate);
    
    // Then filter by owner
    return events.filter(event => event.ownerId === ownerId);
  }
  
  async getCalendarEventsByEntity(entityType: string, entityId: number): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values())
      .filter(event => event.relatedEntityType === entityType && event.relatedEntityId === entityId);
  }
  
  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    return this.calendarEvents.get(id);
  }
  
  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = this.calendarEventCurrentId++;
    
    const calendarEvent: CalendarEvent = {
      ...event,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.calendarEvents.set(id, calendarEvent);
    return calendarEvent;
  }
  
  async updateCalendarEvent(id: number, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const event = this.calendarEvents.get(id);
    if (!event) {
      throw new Error(`Calendar event with ID ${id} not found`);
    }
    
    const updatedEvent = { 
      ...event, 
      ...eventData,
      updatedAt: new Date()
    };
    
    this.calendarEvents.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteCalendarEvent(id: number): Promise<boolean> {
    const exists = this.calendarEvents.has(id);
    if (!exists) {
      throw new Error(`Calendar event with ID ${id} not found`);
    }
    
    return this.calendarEvents.delete(id);
  }
  
  // ----- Email methods -----
  
  async getEmailTemplates(category?: string): Promise<EmailTemplate[]> {
    let templates = Array.from(this.emailTemplates.values());
    
    // Filter by category if provided
    if (category) {
      templates = templates.filter(template => template.category === category);
    }
    
    return templates;
  }
  
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    return this.emailTemplates.get(id);
  }
  
  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = this.emailTemplateCurrentId++;
    
    const emailTemplate: EmailTemplate = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.emailTemplates.set(id, emailTemplate);
    return emailTemplate;
  }
  
  async updateEmailTemplate(id: number, templateData: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const template = this.emailTemplates.get(id);
    if (!template) {
      throw new Error(`Email template with ID ${id} not found`);
    }
    
    const updatedTemplate = { 
      ...template, 
      ...templateData,
      updatedAt: new Date()
    };
    
    this.emailTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }
  
  async deleteEmailTemplate(id: number): Promise<boolean> {
    const exists = this.emailTemplates.has(id);
    if (!exists) {
      throw new Error(`Email template with ID ${id} not found`);
    }
    
    return this.emailTemplates.delete(id);
  }
  
  // ----- Email logs -----
  
  async getEmailLogs(entityType?: string, entityId?: number): Promise<EmailLog[]> {
    let logs = Array.from(this.emailLogs.values());
    
    // Filter by entity if provided
    if (entityType && entityId) {
      logs = logs.filter(log => 
        log.relatedEntityType === entityType && 
        log.relatedEntityId === entityId
      );
    } else if (entityType) {
      logs = logs.filter(log => log.relatedEntityType === entityType);
    }
    
    return logs.sort((a, b) => {
      // Sort by sent date, newest first
      return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
    });
  }
  
  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const id = this.emailLogCurrentId++;
    
    const emailLog: EmailLog = {
      ...log,
      id,
      sentAt: new Date()
    };
    
    this.emailLogs.set(id, emailLog);
    return emailLog;
  }
  
  async sendEmail(from: string, to: string, subject: string, body: string, options: any = {}): Promise<EmailLog> {
    // Use Mailgun to send emails
    try {
      // Process options
      const {
        relatedEntityType,
        relatedEntityId,
        campaignId,
        metadata = {},
        html
      } = options;
      
      // Try to send the email with Mailgun
      const emailParams = {
        from,
        to,
        subject,
        text: body,
        html: html || body // Use HTML if provided, otherwise use text content
      };
      
      // Import the sendEmail function from mailgun.ts
      const { sendEmail } = await import('./lib/mailgun');
      const success = await sendEmail(emailParams);
      
      // Log the email
      const emailLog: InsertEmailLog = {
        from,
        to,
        subject,
        body,
        status: success ? 'sent' : 'failed',
        relatedEntityType,
        relatedEntityId,
        campaignId,
        metadata
      };
      
      // Create the log entry
      return await this.createEmailLog(emailLog);
    } catch (error) {
      // If sending fails, log it as failed
      const emailLog: InsertEmailLog = {
        from,
        to,
        subject,
        body,
        status: 'failed',
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
      
      return await this.createEmailLog(emailLog);
    }
  }
  
  async sendEmailWithTemplate(templateId: number, to: string, data: any, options: any = {}): Promise<EmailLog> {
    // Find the template
    const template = await this.getEmailTemplate(templateId);
    if (!template) {
      throw new Error(`Email template with ID ${templateId} not found`);
    }
    
    // Process template with data
    let body = template.bodyHtml;
    let subject = template.subject;
    
    try {
      // Import the sendTemplateEmail function from mailgun.ts
      const { sendTemplateEmail } = await import('./lib/mailgun');
      
      // Try to use Mailgun's native template functionality
      // If we have a Mailgun template name in options, use that
      if (options.mailgunTemplate) {
        const success = await sendTemplateEmail(
          to,
          options.from || 'noreply@example.com',
          subject,
          data,
          options.mailgunTemplate
        );
        
        // Log the email
        const emailLog: InsertEmailLog = {
          from: options.from || 'noreply@example.com',
          to,
          subject,
          body: template.bodyHtml,
          status: success ? 'sent' : 'failed',
          templateId: template.id,
          metadata: { templateData: data }
        };
        
        return await this.createEmailLog(emailLog);
      }
      
      // Otherwise, use our local template processing
      
      // Replace variables in the template
      if (template.variables) {
        template.variables.forEach(variable => {
          const value = data[variable] || '';
          const regex = new RegExp(`{{${variable}}}`, 'g');
          body = body.replace(regex, value);
          subject = subject.replace(regex, value);
        });
      }
      
      // Combine options with template data
      const emailOptions = {
        ...options,
        templateId: template.id,
        html: body // Use the processed HTML template
      };
      
      // Send the email using our regular sendEmail method
      return await this.sendEmail(options.from || 'noreply@example.com', to, subject, body, emailOptions);
    } catch (error) {
      // Log a failed email attempt
      const emailLog: InsertEmailLog = {
        from: options.from || 'noreply@example.com',
        to,
        subject,
        body: template.bodyHtml,
        status: 'failed',
        templateId: template.id,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          templateData: data
        }
      };
      
      return await this.createEmailLog(emailLog);
    }
  }
  
  // ----- Dashboard metrics -----
  
  async getDashboardMetrics(): Promise<any[]> {
    // Get actual customer count
    const customers = await db.query.customers.findMany();
    const customerCount = customers.length;
    
    // Get actual leads count
    const leads = await db.query.leads.findMany();
    const leadsCount = leads.length;
    
    // Get actual campaign count
    const campaigns = await db.query.campaigns.findMany();
    const activeCampaigns = campaigns.filter(c => 
      new Date(c.endDate) >= new Date() && new Date(c.startDate) <= new Date()
    ).length;
    
    return [
      {
        title: "Total Customers",
        value: customerCount.toString(),
        change: {
          value: "12%",
          type: "increase",
          label: "vs last month"
        },
        icon: "users"
      },
      {
        title: "Total Leads",
        value: leadsCount.toString(),
        change: {
          value: "5%",
          type: "increase",
          label: "vs last month"
        },
        icon: "users-plus"
      },
      {
        title: "Active Campaigns",
        value: activeCampaigns.toString(),
        change: {
          value: "3",
          type: "increase",
          label: "new this week"
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
      initials: "JD",
      googleId: null
    });
    this.userCurrentId = 2;
    
    // Seed marketing forms
    this.seedMarketingForms();
    
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
    
    // Seed email templates
    const emailTemplates = [
      { 
        id: 1, 
        name: "Welcome Email", 
        subject: "Welcome to our CRM!", 
        bodyHtml: "<h1>Welcome!</h1><p>Dear {{name}},</p><p>Thank you for joining our platform. We're excited to have you on board!</p><p>Best regards,<br>The Team</p>",
        bodyText: "Welcome!\n\nDear {{name}},\n\nThank you for joining our platform. We're excited to have you on board!\n\nBest regards,\nThe Team",
        category: "onboarding",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 1,
        isDefault: true,
        variables: ["name"]
      },
      { 
        id: 2, 
        name: "Lead Follow-up", 
        subject: "Following up on our conversation", 
        bodyHtml: "<p>Hello {{name}},</p><p>I wanted to follow up on our recent conversation about {{topic}}. Do you have any questions I can answer?</p><p>Looking forward to hearing from you,<br>{{sender}}</p>",
        bodyText: "Hello {{name}},\n\nI wanted to follow up on our recent conversation about {{topic}}. Do you have any questions I can answer?\n\nLooking forward to hearing from you,\n{{sender}}",
        category: "sales",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 1,
        isDefault: true,
        variables: ["name", "topic", "sender"]
      },
      { 
        id: 3, 
        name: "Monthly Newsletter", 
        subject: "{{month}} Newsletter - Latest Updates", 
        bodyHtml: "<h2>{{month}} Newsletter</h2><p>Dear {{name}},</p><p>Here are our latest updates:</p><ul><li>{{update1}}</li><li>{{update2}}</li><li>{{update3}}</li></ul><p>Thank you for being a valued customer!</p>",
        bodyText: "{{month}} Newsletter\n\nDear {{name}},\n\nHere are our latest updates:\n- {{update1}}\n- {{update2}}\n- {{update3}}\n\nThank you for being a valued customer!",
        category: "marketing",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 1,
        isDefault: true,
        variables: ["month", "name", "update1", "update2", "update3"]
      }
    ];
    
    emailTemplates.forEach(template => {
      this.emailTemplates.set(template.id, template as EmailTemplate);
    });
    this.emailTemplateCurrentId = 4;
    
    // Initialize empty email logs
    this.emailLogCurrentId = 1;
    
    // Initialize marketing forms collections
    this.marketingForms = new Map();
    this.formSubmissions = new Map();
    this.webVisitors = new Map();
    this.pageViews = new Map();
    this.trackingInstallations = new Map();
    
    this.marketingFormCurrentId = 1;
    this.formSubmissionCurrentId = 1;
    this.pageViewCurrentId = 1;
    this.trackingInstallationCurrentId = 1;
  }
  
  // ----- Seed Marketing Forms data -----
  private seedMarketingForms() {
    // Create sample marketing forms
    const contactForm: MarketingForm = {
      id: this.marketingFormCurrentId++,
      name: "Contact Us Form",
      title: "Contact Us",
      description: "Get in touch with our team",
      submitButtonText: "Send Message",
      successMessage: "Thank you for contacting us! We'll be in touch soon.",
      redirectUrl: null,
      formFields: [
        { 
          id: "name", 
          type: "text", 
          label: "Full Name", 
          placeholder: "Enter your full name",
          required: true,
          order: 1
        },
        { 
          id: "email", 
          type: "email", 
          label: "Email Address", 
          placeholder: "your@email.com",
          required: true,
          order: 2
        },
        { 
          id: "company", 
          type: "text", 
          label: "Company", 
          placeholder: "Your company name",
          required: false,
          order: 3
        },
        { 
          id: "message", 
          type: "textarea", 
          label: "Message", 
          placeholder: "How can we help you?",
          required: true,
          order: 4
        }
      ],
      formStyle: {
        theme: "light",
        borderRadius: "4px",
        primaryColor: "#4F46E5",
        buttonStyle: "filled",
        width: "100%"
      },
      formType: "inline",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 1,
      folder: "Website Forms",
      campaignId: null,
      trackingEnabled: true,
      captchaEnabled: false,
      customCss: null,
      customJs: null,
      embedCode: '<script src="https://yourcrm.com/api/marketing/forms/embed/1.js"></script>\n<div id="crm-form-1"></div>',
      views: 156,
      submissions: 23,
      conversionRate: 14
    };
    
    const leadMagnetForm: MarketingForm = {
      id: this.marketingFormCurrentId++,
      name: "Whitepaper Download",
      title: "Get Our Free Guide",
      description: "Download our comprehensive guide to increasing sales",
      submitButtonText: "Get The Guide",
      successMessage: "Thank you! Your download link has been sent to your email.",
      redirectUrl: "/thank-you",
      formFields: [
        { 
          id: "firstName", 
          type: "text", 
          label: "First Name", 
          placeholder: "John",
          required: true,
          order: 1
        },
        { 
          id: "lastName", 
          type: "text", 
          label: "Last Name", 
          placeholder: "Doe",
          required: true,
          order: 2
        },
        { 
          id: "email", 
          type: "email", 
          label: "Work Email", 
          placeholder: "you@company.com",
          required: true,
          order: 3
        },
        { 
          id: "company", 
          type: "text", 
          label: "Company", 
          placeholder: "Your company",
          required: true,
          order: 4
        },
        { 
          id: "jobTitle", 
          type: "text", 
          label: "Job Title", 
          placeholder: "Your role",
          required: false,
          order: 5
        },
        { 
          id: "consent", 
          type: "checkbox", 
          label: "I agree to receive marketing communications", 
          required: true,
          order: 6
        }
      ],
      formStyle: {
        theme: "light",
        borderRadius: "8px",
        primaryColor: "#2563EB",
        buttonStyle: "gradient",
        width: "400px",
        boxShadow: true
      },
      formType: "popup",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 1,
      folder: "Lead Magnets",
      campaignId: 2,
      trackingEnabled: true,
      captchaEnabled: true,
      customCss: null,
      customJs: null,
      embedCode: '<script src="https://yourcrm.com/api/marketing/forms/embed/2.js"></script>\n<div id="crm-form-2"></div>',
      views: 428,
      submissions: 112,
      conversionRate: 26
    };
    
    this.marketingForms.set(contactForm.id, contactForm);
    this.marketingForms.set(leadMagnetForm.id, leadMagnetForm);
  }
  
  // ----- Chat Conversation methods -----
  
  async getChatConversations(): Promise<ChatConversation[]> {
    return Array.from(this.chatConversations.values());
  }
  
  async getChatConversationsByUserId(userId: number): Promise<ChatConversation[]> {
    return Array.from(this.chatConversations.values())
      .filter(conversation => conversation.userId === userId);
  }
  
  async getChatConversationById(id: number): Promise<ChatConversation | undefined> {
    return this.chatConversations.get(id);
  }
  
  async createChatConversation(conversation: InsertChatConversation & { createdAt: Date }): Promise<ChatConversation> {
    const newConversation: ChatConversation = {
      id: this.chatConversationCurrentId++,
      ...conversation
    };
    
    this.chatConversations.set(newConversation.id, newConversation);
    return newConversation;
  }
  
  async updateChatConversation(id: number, conversationData: Partial<ChatConversation>): Promise<ChatConversation> {
    const conversation = await this.getChatConversationById(id);
    
    if (!conversation) {
      throw new Error(`Chat conversation with id ${id} not found`);
    }
    
    const updatedConversation = {
      ...conversation,
      ...conversationData,
      id: conversation.id, // Ensure ID doesn't change
    };
    
    this.chatConversations.set(id, updatedConversation);
    return updatedConversation;
  }
  
  async deleteChatConversation(id: number): Promise<void> {
    if (!this.chatConversations.has(id)) {
      throw new Error(`Chat conversation with id ${id} not found`);
    }
    
    // Delete all messages related to this conversation
    const messages = await this.getChatMessagesByConversationId(id);
    messages.forEach(message => {
      this.chatMessages.delete(message.id);
    });
    
    this.chatConversations.delete(id);
  }
  
  // ----- Chat Message methods -----
  
  async getChatMessages(): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values());
  }
  
  async getChatMessagesByConversationId(conversationId: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  async getChatMessageById(id: number): Promise<ChatMessage | undefined> {
    return this.chatMessages.get(id);
  }
  
  async createChatMessage(message: InsertChatMessage & { createdAt: Date }): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      id: this.chatMessageCurrentId++,
      ...message
    };
    
    this.chatMessages.set(newMessage.id, newMessage);
    
    // Update lastMessageAt in the conversation
    const conversation = await this.getChatConversationById(newMessage.conversationId);
    if (conversation) {
      await this.updateChatConversation(conversation.id, {
        lastMessageAt: newMessage.createdAt
      });
    }
    
    return newMessage;
  }
  
  async updateChatMessage(id: number, messageData: Partial<ChatMessage>): Promise<ChatMessage> {
    const message = await this.getChatMessageById(id);
    
    if (!message) {
      throw new Error(`Chat message with id ${id} not found`);
    }
    
    const updatedMessage = {
      ...message,
      ...messageData,
      id: message.id, // Ensure ID doesn't change
      conversationId: message.conversationId // Ensure conversation ID doesn't change
    };
    
    this.chatMessages.set(id, updatedMessage);
    return updatedMessage;
  }
  
  async deleteChatMessage(id: number): Promise<void> {
    if (!this.chatMessages.has(id)) {
      throw new Error(`Chat message with id ${id} not found`);
    }
    
    this.chatMessages.delete(id);
  }
}

// Use DbStorage to connect to a real PostgreSQL database
// Only fall back to MemStorage if explicitly requested with NO_DB=true environment variable
export const storage = process.env.NO_DB === 'true' 
  ? new MemStorage() 
  : new DbStorage();
