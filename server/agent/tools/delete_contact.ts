import { z } from "zod";
import { and, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const deleteContactTool = defineTool({
  name: "delete_contact",
  description:
    "Soft-delete a contact in the current organization. Sets the contact's status to 'deleted' so it disappears from the contacts list and from all other voice tool results. The underlying row is preserved so the deletion can be reversed in the database if needed. Call this only after restating the action and getting explicit user confirmation, since this writes to the database. Identify the contact via contactId, email, or name (exactly one); name uses case-insensitive partial match and refuses to write if it matches more than one contact.",
  parameters: z
    .object({
      contactId: z.string().uuid().optional(),
      email: z.string().email().optional(),
      name: z.string().min(1).max(120).optional(),
    })
    .refine(
      (v) => Boolean(v.contactId) || Boolean(v.email) || Boolean(v.name),
      { message: "Provide contactId, email, or name to identify the contact." },
    ),
  parametersJsonSchema: {
    type: "object",
    properties: {
      contactId: {
        type: "string",
        format: "uuid",
        description:
          "Contact UUID. Prefer this when known (e.g. just returned from another tool).",
      },
      email: {
        type: "string",
        format: "email",
        description: "Email address used to find the contact.",
      },
      name: {
        type: "string",
        minLength: 1,
        maxLength: 120,
        description:
          "Contact name (free text). Partial case-insensitive match against first/last/full name. If multiple contacts match, the tool returns candidates and does NOT delete.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    // Resolve the contact. Lookups exclude already-deleted rows so the
    // model can't "re-delete" something and so a fresh name search after a
    // delete doesn't keep matching the same ghost.
    let target: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    } | null = null;

    if (args.contactId) {
      const [row] = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            ne(contacts.status, "deleted"),
            eq(contacts.id, args.contactId),
          ),
        )
        .limit(1);
      target = row ?? null;
    } else if (args.email) {
      const [row] = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            ne(contacts.status, "deleted"),
            eq(contacts.email, args.email),
          ),
        )
        .limit(1);
      target = row ?? null;
    } else if (args.name) {
      const pattern = `%${args.name}%`;
      const fullName = sql<string>`coalesce(${contacts.firstName}, '') || ' ' || coalesce(${contacts.lastName}, '')`;
      const rows = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            ne(contacts.status, "deleted"),
            or(
              ilike(contacts.firstName, pattern),
              ilike(contacts.lastName, pattern),
              ilike(fullName, pattern),
            ),
          ),
        )
        .limit(5);

      if (rows.length === 0) {
        return { found: false, reason: `No contact matches "${args.name}".` };
      }
      if (rows.length > 1) {
        return {
          found: true,
          deleted: false,
          multipleMatches: true,
          reason:
            "Multiple contacts match that name. Ask the user which one before deleting.",
          candidates: rows,
        };
      }
      target = rows[0];
    }

    if (!target) {
      return { found: false, reason: "Contact not found in this organization." };
    }

    const [updated] = await db
      .update(contacts)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(
        and(
          eq(contacts.organizationId, ctx.organizationId),
          eq(contacts.id, target.id),
        ),
      )
      .returning({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
      });

    return {
      deleted: true,
      contact: updated,
      navigate: { route: "/contacts" },
      dataInvalidate: ["contacts"],
    };
  },
});
