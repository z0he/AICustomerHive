import { pgTable, uuid, varchar, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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