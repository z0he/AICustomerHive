import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { campaigns } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const listCampaignsTool = defineTool({
  name: "list_campaigns",
  description:
    "List campaigns in the current organization, newest first, with name, type, start/end dates, target audience, and conversion counts. Use when the user asks about their campaigns, recent campaigns, campaign performance, or how a specific campaign is doing.",
  parameters: z.object({
    limit: z.number().int().min(1).max(100).default(25),
  }),
  parametersJsonSchema: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Maximum campaigns to return. Defaults to 25.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const rows = await db
      .select({
        id: campaigns.id,
        name: campaigns.name,
        type: campaigns.type,
        targetAudience: campaigns.targetAudience,
        startDate: campaigns.startDate,
        endDate: campaigns.endDate,
        conversions: campaigns.conversions,
        percentage: campaigns.percentage,
        isABTestActive: campaigns.isABTestActive,
        createdAt: campaigns.createdAt,
      })
      .from(campaigns)
      .where(eq(campaigns.organizationId, ctx.organizationId))
      .orderBy(desc(campaigns.createdAt))
      .limit(args.limit);

    return {
      total: rows.length,
      campaigns: rows,
      navigate: { route: "/campaigns" },
    };
  },
});
