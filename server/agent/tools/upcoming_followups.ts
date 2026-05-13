import { z } from "zod";
import { and, asc, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const upcomingFollowupsTool = defineTool({
  name: "upcoming_followups",
  description:
    "Return contacts whose nextFollowUpDate is on or before now + N days, ordered by soonest first. Includes already-overdue follow-ups so they surface for attention. Use when the user asks about follow-ups due, who to call/email next, overdue follow-ups, or upcoming touches.",
  parameters: z.object({
    days: z.number().int().min(0).max(365).default(7),
    limit: z.number().int().min(1).max(200).default(50),
  }),
  parametersJsonSchema: {
    type: "object",
    properties: {
      days: {
        type: "integer",
        minimum: 0,
        maximum: 365,
        description:
          "Look ahead this many days from now. 0 returns only overdue/today. Defaults to 7.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 200,
        description: "Maximum contacts to return. Defaults to 50.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const cutoff = new Date(Date.now() + args.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        company: contacts.company,
        nextFollowUpDate: contacts.nextFollowUpDate,
        lifecycleStage: contacts.lifecycleStage,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          isNotNull(contacts.nextFollowUpDate),
          lte(contacts.nextFollowUpDate, cutoff),
        ),
      )
      .orderBy(asc(contacts.nextFollowUpDate))
      .limit(args.limit);

    const now = Date.now();
    const decorated = rows.map((r) => ({
      ...r,
      overdue: r.nextFollowUpDate
        ? r.nextFollowUpDate.getTime() < now
        : false,
    }));

    return {
      windowDays: args.days,
      total: decorated.length,
      contacts: decorated,
    };
  },
});
