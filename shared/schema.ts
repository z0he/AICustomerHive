import { pgTable, text, serial, integer, boolean, timestamp, varchar, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  googleId: text("google_id"),
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
  targetAudience: z.string().min(1, "Target audience is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
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
  contactIndustry: text("contact_industry"),
  contactOwner: text("contact_owner"),
  contactSource: text("contact_source"),
  contactType: text("contact_type"),
  country: text("country"),
  legalBasis: text("legal_basis"),
  createdAt: timestamp("created_at").notNull(),
  status: text("status").default("active"),
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
  contactIndustry: true,
  contactOwner: true,
  country: true,
  contactSource: true,
  contactType: true,
  legalBasis: true,
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
  reminderMinutes: integer("reminder_minutes"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at"),
  location: text("location"),
  color: text("color").default("#4F46E5"), // event color for UI
  recurrence: json("recurrence"), // store recurrence rules as JSON
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
  reminderMinutes: true,
  location: true,
  color: true,
  recurrence: true,
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

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
