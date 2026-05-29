import { z } from "zod";
import { and, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { contactNotes, contacts, touchpoints } from "@shared/schema";
import { defineTool } from "../tool-runtime";

const ACTIVITY_KINDS = ["call", "email", "meeting", "note"] as const;

export const logContactActivityTool = defineTool({
  name: "log_contact_activity",
  description:
    "Log an activity (call, email, meeting, or note) against a contact and bump the contact's last-contact date. Call this only after restating the action and getting explicit user confirmation, since this writes to the database. Identify the contact via contactId, email, or name (exactly one); name uses case-insensitive partial match and refuses to write if it matches more than one contact.",
  parameters: z
    .object({
      contactId: z.string().uuid().optional(),
      email: z.string().email().optional(),
      name: z.string().min(1).max(120).optional(),
      kind: z.enum(ACTIVITY_KINDS),
      notes: z.string().min(1).max(2000).optional(),
      occurredAt: z.string().min(1).optional(),
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
          "Contact name (free text). Partial case-insensitive match against first/last/full name. If multiple contacts match, the tool returns candidates and does NOT log the activity.",
      },
      kind: {
        type: "string",
        enum: ACTIVITY_KINDS,
        description:
          "Kind of activity: 'call', 'email', 'meeting', or 'note'.",
      },
      notes: {
        type: "string",
        minLength: 1,
        maxLength: 2000,
        description:
          "Optional free-text notes about the activity (what was discussed, outcome, etc.).",
      },
      occurredAt: {
        type: "string",
        description:
          "When the activity happened. Accepts any date-time string the JS Date constructor can parse — ISO 8601 preferred (e.g. '2026-05-27T22:30:00Z' or '2026-05-27T22:30:00+01:00'), but '2026-05-27 14:30' also works. Defaults to now. Omit this field entirely unless the user specified a past time.",
      },
    },
    required: ["kind"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    // 1. Resolve the contact.
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
          logged: false,
          multipleMatches: true,
          reason:
            "Multiple contacts match that name. Ask the user which one before logging.",
          candidates: rows,
        };
      }
      target = rows[0];
    }

    if (!target) {
      return { found: false, reason: "Contact not found in this organization." };
    }

    // 2. Resolve occurredAt (default now). Parse leniently; if the model
    // hands us garbage, return a clear error so it can retry instead of
    // silently logging "now" when the user specified a past time.
    let occurredAt: Date;
    if (args.occurredAt) {
      const parsed = new Date(args.occurredAt);
      if (Number.isNaN(parsed.getTime())) {
        return {
          logged: false,
          reason: `Could not parse occurredAt "${args.occurredAt}". Use ISO 8601 (e.g. 2026-05-27T22:30:00Z) or omit the field to log "now".`,
        };
      }
      occurredAt = parsed;
    } else {
      occurredAt = new Date();
    }

    // 3. Insert touchpoint and bump lastContactDate atomically.
    // GREATEST(NULL, ts) -> ts in Postgres, so an existing NULL is replaced.
    // An older occurredAt won't move lastContactDate backwards.
    const meta: Record<string, unknown> = { source: "voice" };
    if (args.notes) meta.notes = args.notes;

    const result = await db.transaction(async (tx) => {
      const [touchpoint] = await tx
        .insert(touchpoints)
        .values({
          organizationId: ctx.organizationId,
          contactId: target!.id,
          type: args.kind,
          occurredAt,
          meta,
        })
        .returning({
          id: touchpoints.id,
          type: touchpoints.type,
          occurredAt: touchpoints.occurredAt,
        });

      const [updatedContact] = await tx
        .update(contacts)
        .set({
          lastContactDate: sql`GREATEST(${contacts.lastContactDate}, ${occurredAt.toISOString()}::timestamptz)`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            eq(contacts.id, target!.id),
          ),
        )
        .returning({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          lastContactDate: contacts.lastContactDate,
        });

      if (args.notes) {
        await tx.insert(contactNotes).values({
          organizationId: ctx.organizationId,
          contactId: target!.id,
          content: `${args.kind.charAt(0).toUpperCase()}${args.kind.slice(1)}: ${args.notes}`,
        });
      }

      return { touchpoint, updatedContact };
    });

    return {
      logged: true,
      kind: args.kind,
      occurredAt: result.touchpoint.occurredAt,
      notes: args.notes,
      contact: result.updatedContact,
      navigate: { route: "/contacts", params: { contactId: target.id } },
      dataInvalidate: ["contacts", "contactNotes", "contactTouchpoints"],
    };
  },
});
