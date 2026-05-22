import { z } from "zod";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const getContactDetailsTool = defineTool({
  name: "get_contact_details",
  description:
    "Fetch the full record for a single contact by id, email, or name. When given a name, performs a case-insensitive partial match against first name, last name, full name, and company; returns the single best match or flags ambiguity. Use whenever the user asks about one specific person.",
  parameters: z
    .object({
      id: z.string().uuid().optional(),
      email: z.string().email().optional(),
      name: z.string().min(1).max(120).optional(),
    })
    .refine((v) => Boolean(v.id) || Boolean(v.email) || Boolean(v.name), {
      message: "Provide id, email, or name.",
    }),
  parametersJsonSchema: {
    type: "object",
    properties: {
      id: {
        type: "string",
        format: "uuid",
        description: "Contact UUID. Prefer this when known.",
      },
      email: {
        type: "string",
        format: "email",
        description: "Contact email address. Used if id is not provided.",
      },
      name: {
        type: "string",
        minLength: 1,
        maxLength: 120,
        description:
          "Contact name (free text). Partial case-insensitive match across first name, last name, full name, and company. Use when the user names a person but you don't have their id or email.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    if (!args.id && !args.email && !args.name) {
      return { found: false, reason: "No id, email, or name provided." };
    }

    if (args.id || args.email) {
      const matchClause = args.id
        ? eq(contacts.id, args.id)
        : eq(contacts.email, args.email!);

      const [row] = await db
        .select()
        .from(contacts)
        .where(
          and(eq(contacts.organizationId, ctx.organizationId), matchClause),
        )
        .limit(1);

      if (!row) return { found: false };

      return {
        found: true,
        contact: row,
        navigate: { route: "/contacts", params: { contactId: row.id } },
      };
    }

    // Name lookup: ILIKE against first, last, full ("first last"), and company.
    const pattern = `%${args.name!}%`;
    const fullName = sql<string>`coalesce(${contacts.firstName}, '') || ' ' || coalesce(${contacts.lastName}, '')`;

    const rows = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          or(
            ilike(contacts.firstName, pattern),
            ilike(contacts.lastName, pattern),
            ilike(fullName, pattern),
            ilike(contacts.company, pattern),
          ),
        ),
      )
      .limit(5);

    if (rows.length === 0) return { found: false };

    const [best, ...rest] = rows;
    return {
      found: true,
      contact: best,
      multipleMatches: rest.length > 0,
      otherMatches: rest.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.email,
      })),
      navigate: { route: "/contacts", params: { contactId: best.id } },
    };
  },
});
