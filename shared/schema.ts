import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
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
