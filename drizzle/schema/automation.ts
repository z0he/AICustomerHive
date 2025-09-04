import { pgTable, uuid, varchar, boolean, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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