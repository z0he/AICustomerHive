import { z } from "zod";
import { and, desc, eq, isNotNull, ne } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const topContactsByScoreTool = defineTool({
  name: "top_contacts_by_score",
  description:
    "Return the highest-scoring contacts in the current organization, ordered by lead score from highest to lowest. Use this when the user asks about top leads, hottest contacts, best prospects, or who they should follow up with.",
  parameters: z.object({
    limit: z.number().int().min(1).max(50).default(10),
  }),
  parametersJsonSchema: {
    type: "object",
    properties: {
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        description: "Maximum contacts to return. Defaults to 10.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const rows = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        company: contacts.company,
        score: contacts.score,
        lifecycleStage: contacts.lifecycleStage,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          ne(contacts.status, "deleted"),
          isNotNull(contacts.score),
        ),
      )
      .orderBy(desc(contacts.score))
      .limit(args.limit);

    return {
      total: rows.length,
      contacts: rows,
      navigate: {
        route: "/contacts",
        params: { sort: "score" },
      },
    };
  },
});
