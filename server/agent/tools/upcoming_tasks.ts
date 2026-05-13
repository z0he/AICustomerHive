import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { tasks } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const upcomingTasksTool = defineTool({
  name: "upcoming_tasks",
  description:
    "Return open (not completed) tasks ordered by due date. Use when the user asks about their to-do list, open tasks, what's on their plate, or what's due next. Note: dueDate is stored as text; results are ordered alphabetically by that string which matches ISO date order for properly formatted dates.",
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
        description: "Maximum tasks to return. Defaults to 25.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.organizationId, ctx.organizationId),
          eq(tasks.completed, false),
        ),
      )
      .orderBy(asc(tasks.dueDate))
      .limit(args.limit);

    return {
      total: rows.length,
      tasks: rows,
    };
  },
});
