import { pgTable, uuid, varchar, timestamp, jsonb, integer, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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