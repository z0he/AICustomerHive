import { z } from "zod";
import { count, eq } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const countContactsTool = defineTool({
  name: "count_contacts",
  description:
    "Count the total number of contacts in the current organization.",
  parameters: z.object({}),
  async execute(_args, ctx) {
    const [row] = await db
      .select({ value: count() })
      .from(contacts)
      .where(eq(contacts.organizationId, ctx.organizationId));
    return { count: row?.value ?? 0 };
  },
});
