import { z } from "zod";
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "../../db";
import { emailLogs } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const emailActivitySummaryTool = defineTool({
  name: "email_activity_summary",
  description:
    "Summarise email activity in the last N days, returning counts grouped by status (sent, delivered, opened, clicked, failed). Use when the user asks how their emails are doing, open rate, recent email activity, or deliverability.",
  parameters: z.object({
    days: z.number().int().min(1).max(365).default(30),
  }),
  parametersJsonSchema: {
    type: "object",
    properties: {
      days: {
        type: "integer",
        minimum: 1,
        maximum: 365,
        description: "Look back this many days. Defaults to 30.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const cutoff = new Date(Date.now() - args.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        status: emailLogs.status,
        n: count(),
      })
      .from(emailLogs)
      .where(
        and(
          eq(emailLogs.organizationId, ctx.organizationId),
          gte(emailLogs.sentAt, cutoff),
        ),
      )
      .groupBy(emailLogs.status);

    const byStatus = rows
      .map((r) => ({ status: r.status ?? "unknown", count: r.n }))
      .sort((a, b) => b.count - a.count);
    const total = rows.reduce((acc, r) => acc + r.n, 0);

    return {
      windowDays: args.days,
      totalEmails: total,
      byStatus,
    };
  },
});
