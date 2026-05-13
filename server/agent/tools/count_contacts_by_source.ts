import { z } from "zod";
import { count, eq } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const countContactsBySourceTool = defineTool({
  name: "count_contacts_by_source",
  description:
    "Break down contacts by acquisition source (website, referral, social media, email campaign, event, paid search, etc.), returning the count per source sorted from largest to smallest. Use when the user asks where contacts came from, top channels, or attribution-style questions.",
  parameters: z.object({}),
  parametersJsonSchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
  async execute(_args, ctx) {
    const rows = await db
      .select({
        source: contacts.contactSource,
        n: count(),
      })
      .from(contacts)
      .where(eq(contacts.organizationId, ctx.organizationId))
      .groupBy(contacts.contactSource);

    const named = rows
      .filter((r) => r.source !== null)
      .map((r) => ({ source: r.source as string, count: r.n }))
      .sort((a, b) => b.count - a.count);

    const unknown = rows.find((r) => r.source === null)?.n ?? 0;
    const total = rows.reduce((acc, r) => acc + r.n, 0);

    return {
      totalContacts: total,
      contactsWithSource: total - unknown,
      unknown,
      sources: named,
    };
  },
});
