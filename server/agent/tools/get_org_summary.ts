import { z } from "zod";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "../../db";
import { campaigns, contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const getOrgSummaryTool = defineTool({
  name: "get_org_summary",
  description:
    "Get a high-level summary of the current organization: total contacts and total campaigns.",
  parameters: z.object({}),
  parametersJsonSchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
  async execute(_args, ctx) {
    const [contactRow] = await db
      .select({ value: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          ne(contacts.status, "deleted"),
        ),
      );

    const [campaignRow] = await db
      .select({ value: count() })
      .from(campaigns)
      .where(eq(campaigns.organizationId, ctx.organizationId));

    return {
      contacts: contactRow?.value ?? 0,
      campaigns: campaignRow?.value ?? 0,
    };
  },
});
