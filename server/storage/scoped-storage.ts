import { IStorage } from "../storage";
import type {
  Campaign, InsertCampaign,
  Customer, InsertCustomer,
  Lead, InsertLead,
  Task, InsertTask,
  CalendarEvent, InsertCalendarEvent,
  EmailTemplate, InsertEmailTemplate,
  EmailLog, InsertEmailLog,
  ScheduledEmail, InsertScheduledEmail,
  MarketingForm, InsertMarketingForm,
  FormSubmission, InsertFormSubmission,
  WebVisitor, InsertWebVisitor,
  PageView, InsertPageView,
  TrackingInstallation, InsertTrackingInstallation,
  ChatConversation, InsertChatConversation,
  ChatMessage, InsertChatMessage,
  CustomerTouchpoint, InsertCustomerTouchpoint,
  JourneyStage, InsertJourneyStage,
  ContactSegment, InsertContactSegment,
  SelectContact, SelectContactNote, InsertContactNote
} from "@shared/schema";

export class OrganizationScopedStorage implements IStorage {
  constructor(
    private baseStorage: IStorage,
    private organizationId: number
  ) {}

  private addOrgId<T extends Record<string, any>>(data: T): T & { organizationId: number } {
    return { ...data, organizationId: this.organizationId };
  }

  async getUser(id: number) {
    return this.baseStorage.getUser(id);
  }

  async getUserByUsername(username: string) {
    return this.baseStorage.getUserByUsername(username);
  }

  async createUser(user: any) {
    return this.baseStorage.createUser(user);
  }

  async updateUserPersonalKeys(userId: number, keys: any) {
    return this.baseStorage.updateUserPersonalKeys(userId, keys);
  }

  async updateUserBusinessProfile(userId: number, profile: any) {
    return this.baseStorage.updateUserBusinessProfile(userId, profile);
  }

  async getCustomers(): Promise<Customer[]> {
    return await this.baseStorage.getCustomers(this.organizationId);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return await this.baseStorage.getCustomer(id, this.organizationId);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return this.baseStorage.createCustomer(this.addOrgId(customer));
  }

  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer> {
    return this.baseStorage.updateCustomer(id, data, this.organizationId);
  }

  async deleteCustomer(id: number): Promise<boolean> {
    return this.baseStorage.deleteCustomer(id, this.organizationId);
  }

  async getLeads(): Promise<Lead[]> {
    return await this.baseStorage.getLeads(this.organizationId);
  }

  async getLead(id: number): Promise<Lead | undefined> {
    return await this.baseStorage.getLead(id, this.organizationId);
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    return this.baseStorage.createLead(this.addOrgId(lead));
  }

  async updateLead(id: number, data: Partial<InsertLead>): Promise<Lead> {
    return this.baseStorage.updateLead(id, data, this.organizationId);
  }

  async deleteLead(id: number): Promise<boolean> {
    return this.baseStorage.deleteLead(id, this.organizationId);
  }

  async getCampaigns(period?: string): Promise<Campaign[]> {
    return await this.baseStorage.getCampaigns(period, this.organizationId);
  }

  async getCampaign(id: number): Promise<Campaign | undefined> {
    return await this.baseStorage.getCampaign(id, this.organizationId);
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    return this.baseStorage.createCampaign(this.addOrgId(campaign));
  }

  async getRecentCampaigns(limit?: number): Promise<Campaign[]> {
    return await this.baseStorage.getRecentCampaigns(limit, this.organizationId);
  }

  async getMarketingForms(folder?: string): Promise<MarketingForm[]> {
    return await this.baseStorage.getMarketingForms(folder, this.organizationId);
  }

  async getMarketingForm(id: number): Promise<MarketingForm | undefined> {
    return await this.baseStorage.getMarketingForm(id, this.organizationId);
  }

  async createMarketingForm(form: InsertMarketingForm): Promise<MarketingForm> {
    return this.baseStorage.createMarketingForm(this.addOrgId(form));
  }

  async updateMarketingForm(id: number, form: Partial<InsertMarketingForm>): Promise<MarketingForm> {
    return this.baseStorage.updateMarketingForm(id, form, this.organizationId);
  }

  async deleteMarketingForm(id: number): Promise<boolean> {
    return this.baseStorage.deleteMarketingForm(id, this.organizationId);
  }

  async getFormSubmissions(formId: number): Promise<FormSubmission[]> {
    return this.baseStorage.getFormSubmissions(formId, this.organizationId);
  }

  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    return this.baseStorage.createFormSubmission(this.addOrgId(submission));
  }

  async incrementFormViews(formId: number): Promise<void> {
    const form = await this.getMarketingForm(formId);
    if (!form) throw new Error('Form not found in this organization');
    return this.baseStorage.incrementFormViews(formId);
  }

  async incrementFormSubmissions(formId: number): Promise<void> {
    const form = await this.getMarketingForm(formId);
    if (!form) throw new Error('Form not found in this organization');
    return this.baseStorage.incrementFormSubmissions(formId);
  }

  async generateFormEmbedCode(formId: number): Promise<string> {
    const form = await this.getMarketingForm(formId);
    if (!form) throw new Error('Form not found in this organization');
    return this.baseStorage.generateFormEmbedCode(formId);
  }

  async getTasks(): Promise<Task[]> {
    const all = await this.baseStorage.getTasks();
    return all.filter(t => t.organizationId === this.organizationId);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const task = await this.baseStorage.getTask(id);
    return task?.organizationId === this.organizationId ? task : undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    return this.baseStorage.createTask(this.addOrgId(task));
  }

  async toggleTaskCompletion(id: number): Promise<Task> {
    const existing = await this.getTask(id);
    if (!existing) throw new Error('Task not found in this organization');
    return this.baseStorage.toggleTaskCompletion(id);
  }

  async getCalendarEvents(startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    const all = await this.baseStorage.getCalendarEvents(startDate, endDate);
    return all.filter(e => e.organizationId === this.organizationId);
  }

  async getCalendarEventsByOwner(ownerId: number, startDate?: Date, endDate?: Date): Promise<CalendarEvent[]> {
    const all = await this.baseStorage.getCalendarEventsByOwner(ownerId, startDate, endDate);
    return all.filter(e => e.organizationId === this.organizationId);
  }

  async getCalendarEventsByEntity(entityType: string, entityId: number): Promise<CalendarEvent[]> {
    const all = await this.baseStorage.getCalendarEventsByEntity(entityType, entityId);
    return all.filter(e => e.organizationId === this.organizationId);
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const event = await this.baseStorage.getCalendarEvent(id);
    return event?.organizationId === this.organizationId ? event : undefined;
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    return this.baseStorage.createCalendarEvent(this.addOrgId(event));
  }

  async updateCalendarEvent(id: number, eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const existing = await this.getCalendarEvent(id);
    if (!existing) throw new Error('Event not found in this organization');
    return this.baseStorage.updateCalendarEvent(id, eventData);
  }

  async deleteCalendarEvent(id: number): Promise<boolean> {
    const existing = await this.getCalendarEvent(id);
    if (!existing) return false;
    return this.baseStorage.deleteCalendarEvent(id);
  }

  async getEmailTemplates(category?: string): Promise<EmailTemplate[]> {
    const all = await this.baseStorage.getEmailTemplates(category);
    return all.filter(t => t.organizationId === this.organizationId);
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const template = await this.baseStorage.getEmailTemplate(id);
    return template?.organizationId === this.organizationId ? template : undefined;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    return this.baseStorage.createEmailTemplate(this.addOrgId(template));
  }

  async updateEmailTemplate(id: number, templateData: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const existing = await this.getEmailTemplate(id);
    if (!existing) throw new Error('Template not found in this organization');
    return this.baseStorage.updateEmailTemplate(id, templateData);
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    const existing = await this.getEmailTemplate(id);
    if (!existing) return false;
    return this.baseStorage.deleteEmailTemplate(id);
  }

  async getEmailLogs(entityType?: string, entityId?: number): Promise<EmailLog[]> {
    const all = await this.baseStorage.getEmailLogs(entityType, entityId);
    return all.filter(l => l.organizationId === this.organizationId);
  }

  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    return this.baseStorage.createEmailLog(this.addOrgId(log));
  }

  async sendEmail(from: string, to: string, subject: string, body: string, options?: any): Promise<EmailLog> {
    return this.baseStorage.sendEmail(from, to, subject, body, options);
  }

  async sendEmailWithTemplate(templateId: number, to: string, data: any, options?: any): Promise<EmailLog> {
    const template = await this.getEmailTemplate(templateId);
    if (!template) throw new Error('Template not found in this organization');
    return this.baseStorage.sendEmailWithTemplate(templateId, to, data, options);
  }

  async getScheduledEmails(status?: string): Promise<ScheduledEmail[]> {
    const all = await this.baseStorage.getScheduledEmails(status);
    return all.filter(e => e.organizationId === this.organizationId);
  }

  async getScheduledEmail(id: number): Promise<ScheduledEmail | undefined> {
    const email = await this.baseStorage.getScheduledEmail(id);
    return email?.organizationId === this.organizationId ? email : undefined;
  }

  async createScheduledEmail(scheduledEmail: InsertScheduledEmail): Promise<ScheduledEmail> {
    return this.baseStorage.createScheduledEmail(this.addOrgId(scheduledEmail));
  }

  async updateScheduledEmail(id: number, data: Partial<ScheduledEmail>): Promise<ScheduledEmail> {
    const existing = await this.getScheduledEmail(id);
    if (!existing) throw new Error('Scheduled email not found in this organization');
    return this.baseStorage.updateScheduledEmail(id, data);
  }

  async deleteScheduledEmail(id: number): Promise<boolean> {
    const existing = await this.getScheduledEmail(id);
    if (!existing) return false;
    return this.baseStorage.deleteScheduledEmail(id);
  }

  async getScheduledEmailsReady(): Promise<ScheduledEmail[]> {
    const all = await this.baseStorage.getScheduledEmailsReady();
    return all.filter(e => e.organizationId === this.organizationId);
  }

  async getChatConversations(): Promise<ChatConversation[]> {
    const all = await this.baseStorage.getChatConversations();
    return all.filter(c => c.organizationId === this.organizationId);
  }

  async getChatConversationsByUserId(userId: number): Promise<ChatConversation[]> {
    const all = await this.baseStorage.getChatConversationsByUserId(userId);
    return all.filter(c => c.organizationId === this.organizationId);
  }

  async getChatConversationById(id: number): Promise<ChatConversation | undefined> {
    const conv = await this.baseStorage.getChatConversationById(id);
    return conv?.organizationId === this.organizationId ? conv : undefined;
  }

  async createChatConversation(conversation: InsertChatConversation & { createdAt: Date }): Promise<ChatConversation> {
    return this.baseStorage.createChatConversation(this.addOrgId(conversation));
  }

  async updateChatConversation(id: number, conversationData: Partial<ChatConversation>): Promise<ChatConversation> {
    const existing = await this.getChatConversationById(id);
    if (!existing) throw new Error('Conversation not found in this organization');
    return this.baseStorage.updateChatConversation(id, conversationData);
  }

  async deleteChatConversation(id: number): Promise<void> {
    const existing = await this.getChatConversationById(id);
    if (!existing) throw new Error('Conversation not found in this organization');
    return this.baseStorage.deleteChatConversation(id);
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    return this.baseStorage.getChatMessages();
  }

  async getChatMessagesByConversationId(conversationId: number): Promise<ChatMessage[]> {
    const conv = await this.getChatConversationById(conversationId);
    if (!conv) return [];
    return this.baseStorage.getChatMessagesByConversationId(conversationId);
  }

  async getChatMessageById(id: number): Promise<ChatMessage | undefined> {
    return this.baseStorage.getChatMessageById(id);
  }

  async createChatMessage(message: InsertChatMessage & { createdAt: Date }): Promise<ChatMessage> {
    return this.baseStorage.createChatMessage(message);
  }

  async updateChatMessage(id: number, messageData: Partial<ChatMessage>): Promise<ChatMessage> {
    return this.baseStorage.updateChatMessage(id, messageData);
  }

  async deleteChatMessage(id: number): Promise<void> {
    return this.baseStorage.deleteChatMessage(id);
  }

  async getJourneyStages(): Promise<JourneyStage[]> {
    const all = await this.baseStorage.getJourneyStages();
    return all.filter(s => s.organizationId === this.organizationId);
  }

  async getJourneyStage(id: number): Promise<JourneyStage | undefined> {
    const stage = await this.baseStorage.getJourneyStage(id);
    return stage?.organizationId === this.organizationId ? stage : undefined;
  }

  async createJourneyStage(stage: InsertJourneyStage): Promise<JourneyStage> {
    return this.baseStorage.createJourneyStage(this.addOrgId(stage));
  }

  async updateJourneyStage(id: number, stageData: Partial<JourneyStage>): Promise<JourneyStage> {
    const existing = await this.getJourneyStage(id);
    if (!existing) throw new Error('Journey stage not found in this organization');
    return this.baseStorage.updateJourneyStage(id, stageData);
  }

  async deleteJourneyStage(id: number): Promise<void> {
    const existing = await this.getJourneyStage(id);
    if (!existing) throw new Error('Journey stage not found in this organization');
    return this.baseStorage.deleteJourneyStage(id);
  }

  async getContactSegments(userId?: number): Promise<ContactSegment[]> {
    const all = await this.baseStorage.getContactSegments(userId);
    return all.filter(s => s.organizationId === this.organizationId);
  }

  async getContactSegment(id: number): Promise<ContactSegment | undefined> {
    const segment = await this.baseStorage.getContactSegment(id);
    return segment?.organizationId === this.organizationId ? segment : undefined;
  }

  async createContactSegment(segment: InsertContactSegment): Promise<ContactSegment> {
    return this.baseStorage.createContactSegment(this.addOrgId(segment));
  }

  async updateContactSegment(id: number, segmentData: Partial<ContactSegment>): Promise<ContactSegment> {
    const existing = await this.getContactSegment(id);
    if (!existing) throw new Error('Segment not found in this organization');
    return this.baseStorage.updateContactSegment(id, segmentData);
  }

  async deleteContactSegment(id: number): Promise<void> {
    const existing = await this.getContactSegment(id);
    if (!existing) throw new Error('Segment not found in this organization');
    return this.baseStorage.deleteContactSegment(id);
  }

  async getContactNotes(contactId: string): Promise<SelectContactNote[]> {
    return this.baseStorage.getContactNotes(contactId);
  }

  async addContactNote(contactNote: InsertContactNote): Promise<SelectContactNote> {
    return this.baseStorage.addContactNote(contactNote);
  }

  async getUnifiedContactByLegacyId(legacyId: number, contactType: 'lead' | 'customer'): Promise<string | null> {
    return this.baseStorage.getUnifiedContactByLegacyId(legacyId, contactType);
  }

  async getContact(id: string): Promise<SelectContact | undefined> {
    return this.baseStorage.getContact(id);
  }

  async updateContact(id: string, data: Partial<SelectContact>): Promise<SelectContact> {
    return this.baseStorage.updateContact(id, data);
  }

  async deleteContact(id: string): Promise<boolean> {
    return this.baseStorage.deleteContact(id);
  }

  async filterContacts(filters: any): Promise<SelectContact[]> {
    return this.baseStorage.filterContacts(filters);
  }

  async getDashboardMetrics(): Promise<any[]> {
    return this.baseStorage.getDashboardMetrics();
  }

  async getWebVisitorByVisitorId(visitorId: string): Promise<WebVisitor | undefined> {
    return this.baseStorage.getWebVisitorByVisitorId(visitorId);
  }

  async createWebVisitor(visitor: InsertWebVisitor): Promise<WebVisitor> {
    return this.baseStorage.createWebVisitor(visitor);
  }

  async updateWebVisitor(visitorId: string, data: Partial<WebVisitor>): Promise<WebVisitor> {
    return this.baseStorage.updateWebVisitor(visitorId, data);
  }

  async createPageView(pageView: InsertPageView): Promise<PageView> {
    return this.baseStorage.createPageView(this.addOrgId(pageView));
  }

  async getTrackingInstallations(): Promise<TrackingInstallation[]> {
    const all = await this.baseStorage.getTrackingInstallations();
    return all.filter(t => t.organizationId === this.organizationId);
  }

  async getTrackingInstallation(id: number): Promise<TrackingInstallation | undefined> {
    const inst = await this.baseStorage.getTrackingInstallation(id);
    return inst?.organizationId === this.organizationId ? inst : undefined;
  }

  async createTrackingInstallation(installation: InsertTrackingInstallation): Promise<TrackingInstallation> {
    return this.baseStorage.createTrackingInstallation(this.addOrgId(installation));
  }

  async updateTrackingInstallation(id: number, data: Partial<TrackingInstallation>): Promise<TrackingInstallation> {
    const existing = await this.getTrackingInstallation(id);
    if (!existing) throw new Error('Tracking installation not found in this organization');
    return this.baseStorage.updateTrackingInstallation(id, data);
  }

  async generateTrackingCode(websiteUrl: string, options: {owner: number}): Promise<string> {
    return this.baseStorage.generateTrackingCode(websiteUrl, options);
  }

  async getMessageVariants(campaignId: number): Promise<any[]> {
    return this.baseStorage.getMessageVariants(campaignId);
  }

  async createMessageVariant(variant: any): Promise<any> {
    return this.baseStorage.createMessageVariant(variant);
  }

  async updateMessageVariantStats(variantId: number, impressions?: number, conversions?: number): Promise<any> {
    return this.baseStorage.updateMessageVariantStats(variantId, impressions, conversions);
  }

  async getCustomerActivities(): Promise<any[]> {
    // Note: Filtering in memory until customer_activities table has organizationId column
    const all = await this.baseStorage.getCustomerActivities();
    return all; // TODO: Add filtering once schema is updated
  }

  async exportCustomers(): Promise<any> {
    return this.baseStorage.exportCustomers(this.organizationId);
  }

  async importCustomers(customerData: any[]): Promise<{ imported: number; errors: any[] }> {
    return this.baseStorage.importCustomers(customerData);
  }

  async getLeadsBySource(source: string): Promise<Lead[]> {
    return await this.baseStorage.getLeadsBySource(source, this.organizationId);
  }

  async getLeadsByStatus(status: string): Promise<Lead[]> {
    return await this.baseStorage.getLeadsByStatus(status, this.organizationId);
  }

  async getLeadsByScoreRange(minScore: number, maxScore: number): Promise<Lead[]> {
    return await this.baseStorage.getLeadsByScoreRange(minScore, maxScore, this.organizationId);
  }

  async getLeadsRequiringFollowUp(): Promise<Lead[]> {
    return await this.baseStorage.getLeadsRequiringFollowUp(this.organizationId);
  }

  async insertLead(lead: any): Promise<Lead> {
    return this.baseStorage.insertLead(this.addOrgId(lead));
  }

  async updateLeadScore(id: number, scoringData: any): Promise<Lead> {
    return this.baseStorage.updateLeadScore(id, scoringData, this.organizationId);
  }

  async getTopLeads(limit?: number): Promise<Lead[]> {
    return await this.baseStorage.getTopLeads(limit, this.organizationId);
  }

  async assignLeadOwner(id: number, ownerName: string): Promise<Lead> {
    return this.baseStorage.assignLeadOwner(id, ownerName, this.organizationId);
  }

  async addLeadTags(id: number, tags: string[]): Promise<Lead> {
    return this.baseStorage.addLeadTags(id, tags, this.organizationId);
  }

  async addLeadNote(id: number, note: string): Promise<Lead> {
    return this.baseStorage.addLeadNote(id, note, this.organizationId);
  }

  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    const submission = await this.baseStorage.getFormSubmission(id);
    return submission?.organizationId === this.organizationId ? submission : undefined;
  }

  async getFormSubmissionsByContact(contactId: number): Promise<FormSubmission[]> {
    return this.baseStorage.getFormSubmissionsByContact(contactId);
  }

  async getWebVisitors(): Promise<WebVisitor[]> {
    return this.baseStorage.getWebVisitors();
  }

  async getWebVisitor(id: number): Promise<WebVisitor | undefined> {
    return this.baseStorage.getWebVisitor(id);
  }

  async identifyVisitor(visitorId: string, contactId: number): Promise<WebVisitor> {
    return this.baseStorage.identifyVisitor(visitorId, contactId);
  }

  async getPageViews(visitorId?: string): Promise<PageView[]> {
    const all = await this.baseStorage.getPageViews(visitorId);
    return all.filter(p => p.organizationId === this.organizationId);
  }

  async getVisitorPageViews(visitorId: string): Promise<PageView[]> {
    const all = await this.baseStorage.getVisitorPageViews(visitorId);
    return all.filter(p => p.organizationId === this.organizationId);
  }

  async getContactPageViews(contactId: number): Promise<PageView[]> {
    return this.baseStorage.getContactPageViews(contactId);
  }

  async updateTrackingLastPing(id: number): Promise<TrackingInstallation> {
    const existing = await this.getTrackingInstallation(id);
    if (!existing) throw new Error('Tracking installation not found in this organization');
    return this.baseStorage.updateTrackingLastPing(id);
  }

  async getCustomerTouchpoints(): Promise<CustomerTouchpoint[]> {
    const all = await this.baseStorage.getCustomerTouchpoints();
    return all.filter(t => t.organizationId === this.organizationId);
  }

  async getCustomerTouchpoint(id: number): Promise<CustomerTouchpoint | undefined> {
    const touchpoint = await this.baseStorage.getCustomerTouchpoint(id);
    return touchpoint?.organizationId === this.organizationId ? touchpoint : undefined;
  }

  async createCustomerTouchpoint(touchpoint: InsertCustomerTouchpoint): Promise<CustomerTouchpoint> {
    return this.baseStorage.createCustomerTouchpoint(this.addOrgId(touchpoint));
  }

  async updateCustomerTouchpoint(id: number, touchpointData: Partial<CustomerTouchpoint>): Promise<CustomerTouchpoint> {
    const existing = await this.getCustomerTouchpoint(id);
    if (!existing) throw new Error('Touchpoint not found in this organization');
    return this.baseStorage.updateCustomerTouchpoint(id, touchpointData);
  }

  async deleteCustomerTouchpoint(id: number): Promise<void> {
    const existing = await this.getCustomerTouchpoint(id);
    if (!existing) throw new Error('Touchpoint not found in this organization');
    return this.baseStorage.deleteCustomerTouchpoint(id);
  }

  async getUnifiedContacts(userId?: number): Promise<any[]> {
    return this.baseStorage.getUnifiedContacts(userId);
  }

  async getContactsBySegment(segmentId: number): Promise<any[]> {
    const segment = await this.getContactSegment(segmentId);
    if (!segment) return [];
    return this.baseStorage.getContactsBySegment(segmentId);
  }

  async applyContactFilters(contacts: any[], filters: any[]): any[] {
    return this.baseStorage.applyContactFilters(contacts, filters);
  }

  async refreshSegmentCounts(segmentId: number): Promise<ContactSegment> {
    const existing = await this.getContactSegment(segmentId);
    if (!existing) throw new Error('Segment not found in this organization');
    return this.baseStorage.refreshSegmentCounts(segmentId);
  }
}

export function createOrganizationScopedStorage(
  baseStorage: IStorage,
  organizationId: number
): IStorage {
  return new OrganizationScopedStorage(baseStorage, organizationId);
}
