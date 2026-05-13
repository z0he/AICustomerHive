import { z } from "zod";
import { count, eq } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const countContactsByCountryTool = defineTool({
  name: "count_contacts_by_country",
  description:
    "Break down contacts by country, returning the count per country sorted from largest to smallest. Use when the user asks where their contacts are based, geographic distribution, top countries, or how many in a specific country.",
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
        description:
          "Maximum number of countries to return, ordered by contact count desc. Defaults to 25.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    const rows = await db
      .select({
        country: contacts.country,
        n: count(),
      })
      .from(contacts)
      .where(eq(contacts.organizationId, ctx.organizationId))
      .groupBy(contacts.country);

    const named = rows
      .filter((r) => r.country !== null && r.country !== "")
      .map((r) => ({ country: r.country as string, count: r.n }))
      .sort((a, b) => b.count - a.count)
      .slice(0, args.limit);

    const unknown = rows
      .filter((r) => r.country === null || r.country === "")
      .reduce((acc, r) => acc + r.n, 0);
    const total = rows.reduce((acc, r) => acc + r.n, 0);

    return {
      totalContacts: total,
      contactsWithCountry: total - unknown,
      unknown,
      countries: named,
    };
  },
});
