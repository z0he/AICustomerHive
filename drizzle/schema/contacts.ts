// drizzle/schema/contacts.ts
import {
  pgTable, uuid, varchar, timestamp, jsonb, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// TypeScript types
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