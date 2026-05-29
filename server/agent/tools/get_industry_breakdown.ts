import { z } from "zod";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const getIndustryBreakdownTool = defineTool({
  name: "get_industry_breakdown",
  description:
    "Break down contacts in the current organization by industry, returning the count per industry sorted from largest to smallest. Use this when the user asks about industry distribution, which industries their contacts are from, or related questions.",
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
        industry: contacts.industry,
        n: count(),
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          ne(contacts.status, "deleted"),
        ),
      )
      .groupBy(contacts.industry);

    const named = rows
      .filter((r) => r.industry !== null)
      .map((r) => ({ industry: r.industry as string, count: r.n }))
      .sort((a, b) => b.count - a.count);

    const uncategorized = rows.find((r) => r.industry === null)?.n ?? 0;
    const total = rows.reduce((acc, r) => acc + r.n, 0);

    return {
      totalContacts: total,
      contactsWithIndustry: total - uncategorized,
      uncategorized,
      industries: named,
    };
  },
});
