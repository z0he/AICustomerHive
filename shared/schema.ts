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
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  targetAudience: text("target_audience").notNull(),
  message: text("message").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  createdAt: timestamp("created_at").notNull(),
  conversions: integer("conversions").default(0),
  percentage: integer("percentage").default(0),
});

export const insertCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  type: z.string().min(1, "Campaign type is required"),
  targetAudience: z.object({
    inactive: z.boolean().default(false),
    top: z.boolean().default(false),
    new: z.boolean().default(false),
    industry: z.boolean().default(false),
  }),
  industryValue: z.string().optional(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  initials: text("initials").notNull(),
  phone: text("phone"),
  company: text("company"),
  createdAt: timestamp("created_at").notNull(),
  status: text("status").default("active"),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  email: true,
  phone: true,
  company: true,
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
  score: integer("score").default(0),
  createdAt: timestamp("created_at").notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).pick({
  name: true,
  industry: true,
  location: true,
  score: true,
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
