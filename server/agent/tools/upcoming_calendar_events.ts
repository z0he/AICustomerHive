import { z } from "zod";
import { and, asc, eq, gte, lte, ne } from "drizzle-orm";
import { db } from "../../db";
import { calendarEvents } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const upcomingCalendarEventsTool = defineTool({
  name: "upcoming_calendar_events",
  description:
    "Return scheduled calendar events starting between now and now + N days, soonest first. Cancelled events are excluded. Use when the user asks about their calendar, upcoming meetings, what's on the schedule, or this week's events.",
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
        description: "Look ahead this many days. Defaults to 7.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        description: "Maximum events to return. Defaults to 25.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const now = new Date();
    const horizon = new Date(Date.now() + args.days * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        description: calendarEvents.description,
        startDate: calendarEvents.startDate,
        endDate: calendarEvents.endDate,
        eventType: calendarEvents.eventType,
        location: calendarEvents.location,
        status: calendarEvents.status,
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.organizationId, ctx.organizationId),
          gte(calendarEvents.startDate, now),
          lte(calendarEvents.startDate, horizon),
          ne(calendarEvents.status, "cancelled"),
        ),
      )
      .orderBy(asc(calendarEvents.startDate))
      .limit(args.limit);

    return {
      windowDays: args.days,
      total: rows.length,
      events: rows,
    };
  },
});
