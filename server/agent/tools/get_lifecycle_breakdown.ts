import { z } from "zod";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const getLifecycleBreakdownTool = defineTool({
  name: "get_lifecycle_breakdown",
  description:
    "Break down contacts by lifecycle stage (lead, opportunity, customer, evangelist, churned). Use this when the user asks about funnel position, lifecycle distribution, how many leads vs customers, etc.",
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
        stage: contacts.lifecycleStage,
        n: count(),
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          ne(contacts.status, "deleted"),
        ),
      )
      .groupBy(contacts.lifecycleStage);

    const stages = rows
      .map((r) => ({ stage: r.stage, count: r.n }))
      .sort((a, b) => b.count - a.count);

    return {
      totalContacts: rows.reduce((acc, r) => acc + r.n, 0),
      stages,
    };
  },
});
