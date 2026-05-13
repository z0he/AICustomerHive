import { z } from "zod";
import { count, eq } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const countContactsByOwnerTool = defineTool({
  name: "count_contacts_by_owner",
  description:
    "Break down contacts by owner (sales rep / assigned user), returning the count per owner sorted from largest to smallest. Also reports how many contacts have no owner assigned. Use when the user asks about ownership distribution, rep workload, or who owns most contacts. Note: owner names are not resolved yet — only owner IDs are returned.",
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
        ownerId: contacts.ownerId,
        n: count(),
      })
      .from(contacts)
      .where(eq(contacts.organizationId, ctx.organizationId))
      .groupBy(contacts.ownerId);

    const owned = rows
      .filter((r) => r.ownerId !== null)
      .map((r) => ({ ownerId: r.ownerId as string, count: r.n }))
      .sort((a, b) => b.count - a.count);

    const unassigned = rows.find((r) => r.ownerId === null)?.n ?? 0;
    const total = rows.reduce((acc, r) => acc + r.n, 0);

    return {
      totalContacts: total,
      assigned: total - unassigned,
      unassigned,
      owners: owned,
    };
  },
});
