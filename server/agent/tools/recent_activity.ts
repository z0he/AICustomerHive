import { z } from "zod";
import { and, desc, eq, gte, ne } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const recentActivityTool = defineTool({
  name: "recent_activity",
  description:
    "Return contacts that have been created or updated in the last N days, ordered by most recent first. Use this when the user asks what's happened recently, what's new, recent changes, or new contacts.",
  parameters: z.object({
    days: z.number().int().min(1).max(365).default(7),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  parametersJsonSchema: {
    type: "object",
    properties: {
      days: {
        type: "integer",
        minimum: 1,
        maximum: 365,
        description: "Look back this many days. Defaults to 7.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Maximum contacts to return. Defaults to 25.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const cutoff = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        company: contacts.company,
        lifecycleStage: contacts.lifecycleStage,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          ne(contacts.status, "deleted"),
          gte(contacts.updatedAt, cutoff),
        ),
      )
      .orderBy(desc(contacts.updatedAt))
      .limit(args.limit);

    return {
      days: args.days,
      total: rows.length,
      contacts: rows,
    };
  },
});
