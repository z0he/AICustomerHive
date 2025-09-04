import { pgTable, text, serial, integer, boolean, timestamp, varchar, json, jsonb, real, uuid, pgEnum, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
// Import Json type
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  googleId: text("google_id"),
  isAdmin: boolean("is_admin").default(false),
  // API Usage Tracking for hybrid model
  aiPromptsUsed: integer("ai_prompts_used").default(0),
  emailsSent: integer("emails_sent").default(0),
  // User tier for future Stripe integration
  userTier: text("user_tier").default("free"), // free, pro, enterprise
  // Personal API keys (encrypted storage)
  personalOpenAIKey: text("personal_openai_key"), // Will be encrypted
  personalMailgunKey: text("personal_mailgun_key"), // Will be encrypted
  personalMailgunDomain: text("personal_mailgun_domain"),
  // Subscription management
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status").default("trial"), // trial, active, canceled, past_due
  trialEndsAt: timestamp("trial_ends_at"),
  isPaid: boolean("is_paid").default(false), // For future Stripe integration
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  initials: true,
  googleId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SelectUser = typeof users.$inferSelect;

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  targetAudience: text("target_audience").notNull(),
  message: text("message").notNull(), // Default message for backward compatibility
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  createdAt: timestamp("created_at").notNull(),
  conversions: integer("conversions").default(0),
  percentage: integer("percentage").default(0),
  isABTestActive: boolean("is_ab_test_active").default(false),
});

// Message Variants for A/B testing
export const messageVariants = pgTable("message_variants", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  variantName: text("variant_name").notNull(), // e.g., "A", "B"
  message: text("message").notNull(),
  impressions: integer("impressions").default(0),
  conversions: integer("conversions").default(0),
  conversionRate: integer("conversion_rate").default(0),
  isControl: boolean("is_control").default(false),
  createdAt: timestamp("created_at").notNull(),
});

export const insertMessageVariantSchema = createInsertSchema(messageVariants).pick({
  campaignId: true,
  variantName: true,
  message: true,
  isControl: true,
});

export type InsertMessageVariant = z.infer<typeof insertMessageVariantSchema>;
export type MessageVariant = typeof messageVariants.$inferSelect;

export const insertCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  type: z.string().min(1, "Campaign type is required"),
  targetAudience: z.union([
    z.string().min(1, "Target audience is required"),
    z.object({
      type: z.string(),
      filters: z.object({
        source: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
      }).optional(),
    })
  ]),
  message: z.string().optional().default(""),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  isABTestActive: z.boolean().optional().default(false),
  messageVariants: z.array(
    z.object({
      variantName: z.string(),
      message: z.string().min(10, "Variant message must be at least 10 characters"),
      isControl: z.boolean().default(false),
    })
  ).optional(),
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  phone: text("phone"),
  company: text("company"),
  jobTitle: text("job_title"),
  linkedinUrl: text("linkedin_url"),
  lifecycleStage: text("lifecycle_stage").default("lead"),
  leadStatus: text("lead_status"),
  industry: text("industry"),
  contactOwner: text("contact_owner"),
  contactSource: text("contact_source"),
  contactType: text("contact_type"),
  country: text("country"),
  legalBasis: text("legal_basis"),
  customFields: json("custom_fields"), // For storing additional import fields
  createdAt: timestamp("created_at").notNull(),
  status: text("status").default("active"),
  isSample: boolean("is_sample").default(false), // Flag to identify sample data
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  jobTitle: true,
  company: true,
  linkedinUrl: true,
  lifecycleStage: true,
  leadStatus: true,
  industry: true,
  contactOwner: true,
  country: true,
  contactSource: true,
  contactType: true,
  legalBasis: true,
  customFields: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Customer Activities table
export const customerActivities = pgTable("customer_activities", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  action: text("action").notNull(),
  campaign: text("campaign"),
  date: text("date").notNull(),
  status: text("status").default("active"),
});

export type CustomerActivity = typeof customerActivities.$inferSelect;

// Leads table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  industry: text("industry").notNull(),
  location: text("location"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  jobTitle: text("job_title"),
  leadSource: text("lead_source"), // e.g. website, referral, advertisement
  leadStatus: text("lead_status").default("new"), // new, contacted, qualified, converted
  leadOwner: text("lead_owner"),
  lastContactDate: timestamp("last_contact_date"),
  nextFollowUpDate: timestamp("next_follow_up_date"),
  engagementLevel: integer("engagement_level").default(0), // 0-100
  conversionProbability: integer("conversion_probability").default(0), // 0-100
  score: integer("score").default(0), // 0-100
  tags: text("tags").array(),
  notes: text("notes"),
  customFields: json("custom_fields"), // For storing additional import fields
  // Journey mapping integration
  currentJourneyStageId: integer("current_journey_stage_id"), // Current stage in customer journey
  journeyEntryDate: timestamp("journey_entry_date"), // When lead entered the journey
  createdAt: timestamp("created_at").notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).pick({
  name: true,
  industry: true,
  location: true,
  email: true,
  phone: true,
  company: true,
  jobTitle: true,
  leadSource: true,
  leadStatus: true,
  leadOwner: true,
  lastContactDate: true,
  nextFollowUpDate: true,
  engagementLevel: true,
  conversionProbability: true,
  score: true,
  tags: true,
  notes: true,
  customFields: true,
  currentJourneyStageId: true,
  journeyEntryDate: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  dueDate: text("due_date").notNull(),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").notNull(),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  title: true,
  dueDate: true,
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// Calendar events table (for scheduling follow-ups)
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  allDay: boolean("all_day").default(false),
  eventType: text("event_type").default("meeting"), // meeting, call, task, etc.
  status: text("status").default("scheduled"), // scheduled, completed, cancelled
  relatedEntityType: text("related_entity_type"), // lead, customer, campaign
  relatedEntityId: integer("related_entity_id"),
  ownerId: integer("owner_id"), // reference to user
  
  // Enhanced reminders functionality - store multiple reminders as an array
  reminders: json("reminders"), // [{time: 15, unit: 'minutes'}, {time: 1, unit: 'days'}]
  
  // Recurring event properties
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"), // daily, weekly, monthly, yearly
  recurrenceInterval: integer("recurrence_interval").default(1), // every X days/weeks/months/years
  recurrenceDaysOfWeek: json("recurrence_days_of_week"), // [0,1,2,3,4,5,6] (0 = Sunday)
  recurrenceEndDate: timestamp("recurrence_end_date"),
  recurrenceEndAfterOccurrences: integer("recurrence_end_after_occurrences"),
  recurrenceExceptions: json("recurrence_exceptions"), // dates to exclude
  
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at"),
  location: text("location"),
  color: text("color").default("#4F46E5"), // event color for UI
  recurrence: json("recurrence"), // store legacy recurrence rules as JSON for compatibility
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).pick({
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  allDay: true,
  eventType: true,
  status: true,
  relatedEntityType: true,
  relatedEntityId: true,
  ownerId: true,
  reminders: true,
  isRecurring: true,
  recurrencePattern: true,
  recurrenceInterval: true,
  recurrenceDaysOfWeek: true,
  recurrenceEndDate: true,
  recurrenceEndAfterOccurrences: true,
  recurrenceExceptions: true,
  location: true,
  color: true,
  recurrence: true, // Keep for backward compatibility
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// Unified Contact Interface - represents both leads and customers
export interface Contact {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  industry?: string | null;
  contactType: 'lead' | 'customer';
  // Lead-specific fields
  leadSource?: string | null;
  leadStatus?: string | null;
  leadOwner?: string | null;
  score?: number | null;
  engagementLevel?: number | null;
  conversionProbability?: number | null;
  tags?: string[] | null;
  notes?: string | null;
  // Customer-specific fields
  lifecycleStage?: string | null;
  contactOwner?: string | null;
  contactSource?: string | null;
  country?: string | null;
  linkedinUrl?: string | null;
  legalBasis?: string | null;
  // Common fields
  location?: string | null;
  initials: string;
  createdAt: Date;
  // Journey mapping fields
  currentJourneyStageId?: number | null;
  journeyEntryDate?: Date | null;
}

// Unified Contact Segment Filter Interface
export interface ContactSegmentFilter {
  field: string; // Field to filter on (industry, leadStatus, score, etc.)
  operator: 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual' | 'isEmpty' | 'isNotEmpty' | 'in';
  value: string | number | string[]; // Value to compare against
  contactTypes?: ('lead' | 'customer')[]; // Specific contact types this filter applies to
}

// Email templates table
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),
  category: text("category").default("general"), // follow-up, welcome, nurture, etc.
  createdBy: integer("created_by"), // reference to user
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at"),
  variables: text("variables").array(), // available template variables
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).pick({
  name: true,
  subject: true,
  bodyHtml: true,
  bodyText: true,
  category: true,
  createdBy: true,
  isDefault: true,
  variables: true,
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// Email log (sent emails)
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Track which user sent the email
  from: text("from_address").notNull(),
  to: text("to_address").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").notNull(),
  status: text("status").default("sent"), // sent, delivered, opened, clicked, failed
  templateId: integer("template_id"),
  campaignId: integer("campaign_id"),
  relatedEntityType: text("related_entity_type"), // lead, customer
  relatedEntityId: integer("related_entity_id"),
  metadata: json("metadata"), // tracking data, error messages, etc.
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).pick({
  userId: true,
  from: true,
  to: true,
  subject: true,
  body: true,
  status: true,
  templateId: true,
  campaignId: true,
  relatedEntityType: true,
  relatedEntityId: true,
  metadata: true,
});

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

// Scheduled Emails table
export const scheduledEmails = pgTable("scheduled_emails", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id"),
  templateId: integer("template_id"),
  subject: text("subject").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: text("status").default("pending"), // pending, processing, sent, failed, cancelled
  targetAudience: json("target_audience"), // filters and targeting info
  recipientCount: integer("recipient_count").default(0),
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  metadata: json("metadata"), // personalization data, retry attempts, etc.
});

export const insertScheduledEmailSchema = createInsertSchema(scheduledEmails).pick({
  campaignId: true,
  templateId: true,
  subject: true,
  fromAddress: true,
  toAddress: true,
  htmlContent: true,
  textContent: true,
  scheduledFor: true,
  status: true,
  targetAudience: true,
  recipientCount: true,
  metadata: true,
});

export type InsertScheduledEmail = z.infer<typeof insertScheduledEmailSchema>;
export type ScheduledEmail = typeof scheduledEmails.$inferSelect;

// Marketing Forms table
export const marketingForms = pgTable("marketing_forms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  submitButtonText: text("submit_button_text").default("Submit"),
  successMessage: text("success_message").default("Thank you for your submission!"),
  redirectUrl: text("redirect_url"),
  formFields: jsonb("form_fields").notNull(), // Array of field definitions with types, labels, etc.
  formStyle: jsonb("form_style"), // CSS styling options
  formType: text("form_type").default("inline"), // inline, popup, slide-in, etc.
  status: text("status").default("active"), // active, inactive, draft
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at"),
  createdBy: integer("created_by"), // reference to user
  folder: text("folder").default("Default"),
  campaignId: integer("campaign_id"), // Optional association with a campaign
  trackingEnabled: boolean("tracking_enabled").default(true),
  captchaEnabled: boolean("captcha_enabled").default(false),
  customCss: text("custom_css"),
  customJs: text("custom_js"),
  embedCode: text("embed_code"), // Generated embed code
  views: integer("views").default(0),
  submissions: integer("submissions").default(0),
  conversionRate: integer("conversion_rate").default(0),
});

export const insertMarketingFormSchema = createInsertSchema(marketingForms).pick({
  name: true,
  title: true,
  description: true,
  submitButtonText: true,
  successMessage: true,
  redirectUrl: true,
  formFields: true,
  formStyle: true,
  formType: true,
  status: true,
  createdBy: true,
  folder: true,
  campaignId: true,
  trackingEnabled: true,
  captchaEnabled: true,
  customCss: true,
  customJs: true,
});

export type InsertMarketingForm = z.infer<typeof insertMarketingFormSchema>;
export type MarketingForm = typeof marketingForms.$inferSelect;

// Form Submissions table
export const formSubmissions = pgTable("form_submissions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").notNull(),
  data: jsonb("data").notNull(), // The form submission data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  submittedAt: timestamp("submitted_at").notNull(),
  contactId: integer("contact_id"), // Link to customer or lead if identified
  pageUrl: text("page_url"), // URL where form was submitted
  referrer: text("referrer"), // Referring URL
  formSource: text("form_source").default("website"), // Where form was embedded: website, landing page, etc.
  originalSource: text("original_source"), // Direct Traffic, Organic Search, etc.
  originalSourceDetail: text("original_source_detail"), // More specific source info
  deviceType: text("device_type"), // mobile, desktop, tablet
  geoLocation: jsonb("geo_location"), // Geolocation data if available
  conversionPath: jsonb("conversion_path"), // Array of touchpoints before conversion
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).pick({
  formId: true,
  data: true,
  ipAddress: true,
  userAgent: true,
  pageUrl: true,
  referrer: true,
  formSource: true,
  originalSource: true,
  originalSourceDetail: true,
  deviceType: true,
  geoLocation: true,
  conversionPath: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  utmTerm: true,
  utmContent: true,
});

export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;

// Web Visitor table for tracking website visitors
export const webVisitors = pgTable("web_visitors", {
  id: serial("id").primaryKey(),
  visitorId: text("visitor_id").notNull().unique(), // Anonymous cookie ID
  firstVisitAt: timestamp("first_visit_at").notNull(),
  lastVisitAt: timestamp("last_visit_at").notNull(),
  totalVisits: integer("total_visits").default(1),
  totalPageviews: integer("total_pageviews").default(1),
  contactId: integer("contact_id"), // Link to customer or lead if identified
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceType: text("device_type"), // mobile, desktop, tablet
  browser: text("browser"),
  operatingSystem: text("operating_system"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  firstReferrer: text("first_referrer"),
  latestReferrer: text("latest_referrer"),
  originalSource: text("original_source"), // Direct Traffic, Organic Search, etc.
  originalSourceDetail: text("original_source_detail"), // More specific source info
  firstPageSeen: text("first_page_seen"),
  lastPageSeen: text("last_page_seen"),
  convertedAt: timestamp("converted_at"), // When visitor became a contact 
  conversionSource: text("conversion_source"), // Form submission, chat, etc.
});

export const insertWebVisitorSchema = createInsertSchema(webVisitors).pick({
  visitorId: true,
  ipAddress: true,
  userAgent: true,
  deviceType: true,
  browser: true,
  operatingSystem: true,
  country: true,
  region: true,
  city: true,
  firstReferrer: true,
  latestReferrer: true,
  originalSource: true,
  originalSourceDetail: true,
  firstPageSeen: true,
  lastPageSeen: true,
  conversionSource: true,
});

export type InsertWebVisitor = z.infer<typeof insertWebVisitorSchema>;
export type WebVisitor = typeof webVisitors.$inferSelect;

// Page Views table to track individual page visits
export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  visitorId: text("visitor_id").notNull(), // References webVisitors.visitorId
  contactId: integer("contact_id"), // Link to customer or lead if identified
  pageUrl: text("page_url").notNull(),
  pageTitle: text("page_title"),
  timestamp: timestamp("timestamp").notNull(),
  duration: integer("duration"), // Time spent on page in seconds
  exitPage: boolean("exit_page").default(false), // Whether this was the exit page for the session
  entryPage: boolean("entry_page").default(false), // Whether this was the entry page for the session
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  deviceType: text("device_type"),
  browser: text("browser"),
  operatingSystem: text("operating_system"),
  ipAddress: text("ip_address"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
});

export const insertPageViewSchema = createInsertSchema(pageViews).pick({
  visitorId: true,
  contactId: true,
  pageUrl: true,
  pageTitle: true,
  duration: true,
  exitPage: true,
  entryPage: true,
  referrer: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  utmTerm: true,
  utmContent: true,
  deviceType: true,
  browser: true,
  operatingSystem: true,
  ipAddress: true,
  country: true,
  region: true,
  city: true,
});

export type InsertPageView = z.infer<typeof insertPageViewSchema>;
export type PageView = typeof pageViews.$inferSelect;

// Tracking Code Installations table
export const trackingInstallations = pgTable("tracking_installations", {
  id: serial("id").primaryKey(),
  websiteUrl: text("website_url").notNull().unique(),
  installationDate: timestamp("installation_date").notNull(),
  status: text("status").default("active"), // active, inactive, pending
  trackingCode: text("tracking_code").notNull(), // Generated tracking code
  lastPingAt: timestamp("last_ping_at"), // Last time the tracking code was detected
  settings: jsonb("settings"), // Tracking settings like anonymization, cookie consent, etc.
  owner: integer("owner"), // User who created/owns this installation
  notes: text("notes"),
});

export const insertTrackingInstallationSchema = createInsertSchema(trackingInstallations).pick({
  websiteUrl: true,
  status: true,
  settings: true,
  owner: true,
  notes: true,
});

export type InsertTrackingInstallation = z.infer<typeof insertTrackingInstallationSchema>;
export type TrackingInstallation = typeof trackingInstallations.$inferSelect;

// Chat conversations table for the AI Assistant
export const chatConversations = pgTable("chat_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // The user who started the conversation
  title: text("title").notNull(), // Generated title for the conversation
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at"),
  context: jsonb("context"), // Additional context data about the conversation
  status: text("status").default("active"), // active, archived
});

export const insertChatConversationSchema = createInsertSchema(chatConversations).pick({
  userId: true,
  title: true,
  context: true,
  status: true,
});

export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;

// Chat messages within a conversation
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(), // Reference to the conversation
  content: text("content").notNull(), // The message content
  role: text("role").notNull(), // user, assistant, system
  createdAt: timestamp("created_at").notNull(),
  metadata: jsonb("metadata"), // Any additional data, like referenced entities
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  conversationId: true,
  content: true,
  role: true,
  metadata: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// System Notifications table for tracking system events
export const systemNotifications = pgTable("system_notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // new_user, system_error, security_alert, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: text("severity").default("info"), // info, warning, error, critical
  isRead: boolean("is_read").default(false),
  isEmailSent: boolean("is_email_sent").default(false),
  emailRecipient: text("email_recipient"), // Where notification was sent
  createdAt: timestamp("created_at").notNull(),
  relatedEntityType: text("related_entity_type"), // user, lead, etc.
  relatedEntityId: integer("related_entity_id"),
  metadata: jsonb("metadata"), // Additional context about the event
});

export const insertSystemNotificationSchema = createInsertSchema(systemNotifications).pick({
  type: true,
  title: true,
  message: true,
  severity: true,
  isEmailSent: true,
  emailRecipient: true,
  relatedEntityType: true,
  relatedEntityId: true,
  metadata: true,
});

export type InsertSystemNotification = z.infer<typeof insertSystemNotificationSchema>;
export type SystemNotification = typeof systemNotifications.$inferSelect;

// Customer Journey Touchpoints table for tracking customer interactions
export const customerTouchpoints = pgTable("customer_touchpoints", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  leadId: integer("lead_id"), // Optional - touchpoint could be before lead creation
  touchpointType: text("touchpoint_type").notNull(), // website_visit, email_open, email_click, form_submit, phone_call, meeting, demo, trial_signup, purchase, support_ticket, etc.
  touchpointStage: text("touchpoint_stage").notNull(), // awareness, consideration, decision, retention, advocacy
  channel: text("channel").notNull(), // website, email, phone, social, direct, referral, paid_ads, organic, etc.
  source: text("source"), // Specific source like google, facebook, email_campaign_id, etc.
  medium: text("medium"), // organic, cpc, email, social, etc.
  campaign: text("campaign"), // Campaign name or ID if applicable
  content: text("content"), // Page URL, email subject, ad content, etc.
  // Integration connections
  relatedLeadId: integer("related_lead_id"), // Link to lead if touchpoint is lead-related
  relatedCampaignId: integer("related_campaign_id"), // Link to campaign if touchpoint is campaign-related
  relatedTrackingId: integer("related_tracking_id"), // Link to tracking installation if touchpoint is web-related
  description: text("description"), // Human readable description of the touchpoint
  value: integer("value").default(0), // Monetary value if applicable (in cents)
  duration: integer("duration"), // Duration in seconds if applicable (e.g., website session)
  outcome: text("outcome"), // positive, negative, neutral
  score: integer("score").default(0), // Engagement score (0-100)
  metadata: jsonb("metadata"), // Additional context data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referrerUrl: text("referrer_url"),
  landingPage: text("landing_page"),
  deviceType: text("device_type"), // desktop, mobile, tablet
  browser: text("browser"),
  operatingSystem: text("operating_system"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmTerm: text("utm_term"),
  utmContent: text("utm_content"),
  createdAt: timestamp("created_at").notNull(),
  userId: integer("user_id").notNull(), // The user who owns this customer
});

export const insertCustomerTouchpointSchema = createInsertSchema(customerTouchpoints).pick({
  customerId: true,
  leadId: true,
  touchpointType: true,
  touchpointStage: true,
  channel: true,
  source: true,
  medium: true,
  campaign: true,
  content: true,
  description: true,
  value: true,
  duration: true,
  outcome: true,
  score: true,
  metadata: true,
  ipAddress: true,
  userAgent: true,
  referrerUrl: true,
  landingPage: true,
  deviceType: true,
  browser: true,
  operatingSystem: true,
  country: true,
  region: true,
  city: true,
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  utmTerm: true,
  utmContent: true,
  userId: true,
  relatedLeadId: true,
  relatedCampaignId: true,
  relatedTrackingId: true,
});

export type InsertCustomerTouchpoint = z.infer<typeof insertCustomerTouchpointSchema>;
export type CustomerTouchpoint = typeof customerTouchpoints.$inferSelect;

// Customer Journey Stages table for defining journey stages
export const journeyStages = pgTable("journey_stages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Awareness", "Consideration", "Decision", "Onboarding", "Retention"
  description: text("description"),
  order: integer("order").notNull(), // Order in the journey (1, 2, 3, etc.)
  color: text("color").default("#6366f1"), // Color for UI visualization
  icon: text("icon"), // Icon name for UI
  expectedDuration: integer("expected_duration"), // Expected duration in days
  isActive: boolean("is_active").default(true),
  goals: text("goals").array(), // Goals for this stage
  kpis: jsonb("kpis"), // Key performance indicators for this stage
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertJourneyStageSchema = createInsertSchema(journeyStages).pick({
  name: true,
  description: true,
  order: true,
  color: true,
  icon: true,
  expectedDuration: true,
  isActive: true,
  goals: true,
  kpis: true,
});

export type InsertJourneyStage = z.infer<typeof insertJourneyStageSchema>;
export type JourneyStage = typeof journeyStages.$inferSelect;

// Unified Contact Segments table - for segmenting both leads and customers
export const contactSegments = pgTable("contact_segments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  contactTypes: text("contact_types").array().notNull().default(["lead", "customer"]), // Which contact types to include
  filterCriteria: jsonb("filter_criteria").notNull(), // Segment definition rules
  createdBy: integer("created_by").notNull(), // User who created the segment
  isActive: boolean("is_active").default(true),
  leadCount: integer("lead_count").default(0), // Cached count of matching leads
  customerCount: integer("customer_count").default(0), // Cached count of matching customers
  totalCount: integer("total_count").default(0), // Total matching contacts
  conversionRate: real("conversion_rate"), // Lead to customer conversion rate
  avgScore: integer("avg_score"), // Average lead score for this segment
  lastUpdated: timestamp("last_updated"), // When counts were last recalculated
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at"),
});

export const insertContactSegmentSchema = createInsertSchema(contactSegments).pick({
  name: true,
  description: true,
  contactTypes: true,
  filterCriteria: true,
  createdBy: true,
  isActive: true,
});

export type InsertContactSegment = z.infer<typeof insertContactSegmentSchema>;
export type ContactSegment = typeof contactSegments.$inferSelect;

// Unified Contacts Table - New Schema
export const lifecycleStageEnum = pgEnum("lifecycle_stage", [
  "lead","mql","opportunity","customer","evangelist","churned"
]);

export const contactStatusEnum = pgEnum("contact_status", [
  "active","inactive","lost"
]);

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: varchar("first_name", { length: 120 }),
  lastName: varchar("last_name", { length: 120 }),
  email: varchar("email", { length: 320 }).unique(), // nullable + unique
  phone: varchar("phone", { length: 64 }),
  company: varchar("company", { length: 160 }),
  jobTitle: varchar("job_title", { length: 160 }),
  lifecycleStage: lifecycleStageEnum("lifecycle_stage").notNull().default("lead"),
  status: contactStatusEnum("status").notNull().default("active"),
  ownerId: uuid("owner_id"),
  tags: jsonb("tags").$type<string[]>().default([]).notNull(),
  properties: jsonb("properties").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// TypeScript types for contacts
export const insertContactSchema = createInsertSchema(contacts).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  company: true,
  jobTitle: true,
  lifecycleStage: true,
  status: true,
  ownerId: true,
  tags: true,
  properties: true,
});

export type InsertContact = z.infer<typeof insertContactSchema>;
export type SelectContact = typeof contacts.$inferSelect;

// Journey Tables - Customer Journey Tracking
// Touchpoint type enum
export const touchpointTypeEnum = pgEnum("touchpoint_type", [
  "web", "email", "form", "meeting", "note", "task"
]);

// Touchpoints table
export const touchpoints = pgTable("touchpoints", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").notNull(),
  type: touchpointTypeEnum("type").notNull(),
  subtype: varchar("subtype", { length: 100 }), // optional - e.g. 'page_view', 'click', 'submit'
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>().default({}).notNull(), // url/utm/campaignId/formId/etc.
});

// Journey scores table
export const journeyScores = pgTable("journey_scores", {
  contactId: uuid("contact_id").primaryKey().notNull(),
  score: integer("score").default(0).notNull(),
  stageDays: integer("stage_days").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// TypeScript types for touchpoints
export const insertTouchpointSchema = createInsertSchema(touchpoints).pick({
  contactId: true,
  type: true,
  subtype: true,
  occurredAt: true,
  meta: true,
});

export type InsertTouchpoint = z.infer<typeof insertTouchpointSchema>;
export type SelectTouchpoint = typeof touchpoints.$inferSelect;

// TypeScript types for journey scores
export const insertJourneyScoreSchema = createInsertSchema(journeyScores).pick({
  contactId: true,
  score: true,
  stageDays: true,
});

export type InsertJourneyScore = z.infer<typeof insertJourneyScoreSchema>;
export type SelectJourneyScore = typeof journeyScores.$inferSelect;

// Segment Tables - Contact Segmentation
// Segments table
export const segments = pgTable("segments", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  description: varchar("description", { length: 480 }), // optional
  definition: jsonb("definition").$type<Record<string, unknown>>().notNull(), // filter DSL JSON
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Segment members table with composite primary key
export const segmentMembers = pgTable("segment_members", {
  segmentId: uuid("segment_id").notNull(), // FK -> segments.id
  contactId: uuid("contact_id").notNull(), // FK -> contacts.id
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.segmentId, table.contactId] }),
  };
});

// TypeScript types for segments
export const insertSegmentSchema = createInsertSchema(segments).pick({
  name: true,
  description: true,
  definition: true,
  isActive: true,
});

export type InsertSegment = z.infer<typeof insertSegmentSchema>;
export type SelectSegment = typeof segments.$inferSelect;

// TypeScript types for segment members
export const insertSegmentMemberSchema = createInsertSchema(segmentMembers).pick({
  segmentId: true,
  contactId: true,
});

export type InsertSegmentMember = z.infer<typeof insertSegmentMemberSchema>;
export type SelectSegmentMember = typeof segmentMembers.$inferSelect;

// Automation Tables - Workflow Management
// Workflows table
export const workflows = pgTable("workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  description: varchar("description", { length: 480 }), // optional
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Triggers table
export const triggers = pgTable("triggers", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id").notNull(), // FK -> workflows.id
  type: varchar("type", { length: 80 }).notNull(), // e.g. 'form_submitted','segment_enter','lifecycle_changed','web_event'
  config: jsonb("config").$type<Record<string, unknown>>().notNull(), // trigger-specific options
});

// Actions table
export const actions = pgTable("actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id").notNull(), // FK -> workflows.id
  order: integer("order").notNull(), // execution order within the workflow
  type: varchar("type", { length: 80 }).notNull(), // e.g. 'send_email','assign_owner','update_property','delay','add_tag'
  config: jsonb("config").$type<Record<string, unknown>>().notNull(), // action-specific options
});

// TypeScript types for workflows
export const insertWorkflowSchema = createInsertSchema(workflows).pick({
  name: true,
  description: true,
  isActive: true,
});

export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type SelectWorkflow = typeof workflows.$inferSelect;

// TypeScript types for triggers
export const insertTriggerSchema = createInsertSchema(triggers).pick({
  workflowId: true,
  type: true,
  config: true,
});

export type InsertTrigger = z.infer<typeof insertTriggerSchema>;
export type SelectTrigger = typeof triggers.$inferSelect;

// TypeScript types for actions
export const insertActionSchema = createInsertSchema(actions).pick({
  workflowId: true,
  order: true,
  type: true,
  config: true,
});

export type InsertAction = z.infer<typeof insertActionSchema>;
export type SelectAction = typeof actions.$inferSelect;
