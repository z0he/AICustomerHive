import { z } from "zod";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const findInactiveCustomersTool = defineTool({
  name: "find_inactive_customers",
  description:
    "Find contacts in the current organization that have not been contacted within the last N days, or have never been contacted. Returns basic identity fields and the last contact date.",
  parameters: z.object({
    daysInactive: z.number().int().min(1).max(3650).default(90),
    limit: z.number().int().min(1).max(500).default(50),
  }),
  async execute(args, ctx) {
    const cutoff = new Date(Date.now() - args.daysInactive * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        lastContactDate: contacts.lastContactDate,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          or(
            isNull(contacts.lastContactDate),
            lt(contacts.lastContactDate, cutoff),
          ),
        ),
      )
      .limit(args.limit);

    return {
      daysInactive: args.daysInactive,
      total: rows.length,
      contacts: rows,
    };
  },
});
