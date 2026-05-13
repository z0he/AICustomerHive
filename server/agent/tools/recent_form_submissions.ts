import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "../../db";
import { formSubmissions } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const recentFormSubmissionsTool = defineTool({
  name: "recent_form_submissions",
  description:
    "Return form submissions received in the last N days, newest first, with form id, submitted data, page url, and original source. Use when the user asks about recent leads from forms, new sign-ups, who filled out a form, or recent inbound activity.",
  parameters: z.object({
    days: z.number().int().min(1).max(90).default(7),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  parametersJsonSchema: {
    type: "object",
    properties: {
      days: {
        type: "integer",
        minimum: 1,
        maximum: 90,
        description: "Look back this many days. Defaults to 7.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Maximum submissions to return. Defaults to 25.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const cutoff = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: formSubmissions.id,
        formId: formSubmissions.formId,
        data: formSubmissions.data,
        pageUrl: formSubmissions.pageUrl,
        originalSource: formSubmissions.originalSource,
        deviceType: formSubmissions.deviceType,
        submittedAt: formSubmissions.submittedAt,
      })
      .from(formSubmissions)
      .where(
        and(
          eq(formSubmissions.organizationId, ctx.organizationId),
          gte(formSubmissions.submittedAt, cutoff),
        ),
      )
      .orderBy(desc(formSubmissions.submittedAt))
      .limit(args.limit);

    return {
      windowDays: args.days,
      total: rows.length,
      submissions: rows,
    };
  },
});
