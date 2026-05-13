import { z } from "zod";
import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const searchContactsTool = defineTool({
  name: "search_contacts",
  description:
    "Search contacts in the current organization by partial match on first name, last name, email, or company. Use this whenever the user names a person, an email fragment, or a company and asks to find, look up, or pull up that contact.",
  parameters: z.object({
    query: z.string().min(1).max(120),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  parametersJsonSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        minLength: 1,
        maxLength: 120,
        description:
          "Free-text search term. Matched case-insensitively against first name, last name, email, and company.",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: 50,
        description: "Maximum contacts to return. Defaults to 20.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const pattern = `%${args.query}%`;

    const rows = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        company: contacts.company,
        jobTitle: contacts.jobTitle,
        lifecycleStage: contacts.lifecycleStage,
        score: contacts.score,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          or(
            ilike(contacts.firstName, pattern),
            ilike(contacts.lastName, pattern),
            ilike(contacts.email, pattern),
            ilike(contacts.company, pattern),
          ),
        ),
      )
      .limit(args.limit);

    return {
      query: args.query,
      total: rows.length,
      contacts: rows,
    };
  },
});
