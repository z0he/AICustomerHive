import { z } from "zod";
import { and, count, eq, ne } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const countContactsTool = defineTool({
  name: "count_contacts",
  description:
    "Count the total number of contacts in the current organization.",
  parameters: z.object({}),
  parametersJsonSchema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
  async execute(_args, ctx) {
    const [row] = await db
      .select({ value: count() })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          ne(contacts.status, "deleted"),
        ),
      );
    return { count: row?.value ?? 0 };
  },
});
