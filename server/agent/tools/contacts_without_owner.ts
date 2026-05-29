import { z } from "zod";
import { and, desc, eq, isNull, ne } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const contactsWithoutOwnerTool = defineTool({
  name: "contacts_without_owner",
  description:
    "Return contacts in the current organization that have no owner assigned. Use when the user asks about unassigned contacts, orphan leads, contacts that need to be allocated, or who hasn't been picked up.",
  parameters: z.object({
    limit: z.number().int().min(1).max(200).default(50),
  }),
  parametersJsonSchema: {
    type: "object",
    properties: {
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
    const rows = await db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        company: contacts.company,
        lifecycleStage: contacts.lifecycleStage,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          ne(contacts.status, "deleted"),
          isNull(contacts.ownerId),
        ),
      )
      .orderBy(desc(contacts.createdAt))
      .limit(args.limit);

    return {
      total: rows.length,
      contacts: rows,
      navigate: {
        route: "/contacts",
        params: { owner: "unassigned" },
      },
    };
  },
});
