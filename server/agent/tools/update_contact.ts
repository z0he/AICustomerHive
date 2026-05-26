import { z } from "zod";
import { and, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  contacts,
  contactSourceEnum,
  industryEnum,
  lifecycleStageEnum,
} from "@shared/schema";
import { defineTool } from "../tool-runtime";

const LIFECYCLE_VALUES = lifecycleStageEnum.enumValues;
const INDUSTRY_VALUES = industryEnum.enumValues;
const CONTACT_SOURCE_VALUES = contactSourceEnum.enumValues;

export const updateContactTool = defineTool({
  name: "update_contact",
  description:
    "Update fields on an existing contact in the current organization. Call this only after restating the change and getting explicit user confirmation, since this writes to the database. Identify the contact via contactId, email, or name (exactly one); name uses case-insensitive partial match. If the name matches more than one contact, the tool refuses to write and returns the candidates so you can ask the user to disambiguate.",
  parameters: z
    .object({
      contactId: z.string().uuid().optional(),
      email: z.string().email().optional(),
      name: z.string().min(1).max(120).optional(),
      firstName: z.string().min(1).max(120).optional(),
      lastName: z.string().min(1).max(120).optional(),
      newEmail: z.string().email().max(320).optional(),
      phone: z.string().min(1).max(64).optional(),
      company: z.string().min(1).max(160).optional(),
      jobTitle: z.string().min(1).max(160).optional(),
      country: z.string().min(1).max(100).optional(),
      lifecycleStage: z.enum(LIFECYCLE_VALUES).optional(),
      industry: z.enum(INDUSTRY_VALUES).optional(),
      contactSource: z.enum(CONTACT_SOURCE_VALUES).optional(),
    })
    .refine(
      (v) => Boolean(v.contactId) || Boolean(v.email) || Boolean(v.name),
      { message: "Provide contactId, email, or name to identify the contact." },
    )
    .refine(
      (v) =>
        v.firstName !== undefined ||
        v.lastName !== undefined ||
        v.newEmail !== undefined ||
        v.phone !== undefined ||
        v.company !== undefined ||
        v.jobTitle !== undefined ||
        v.country !== undefined ||
        v.lifecycleStage !== undefined ||
        v.industry !== undefined ||
        v.contactSource !== undefined,
      { message: "Provide at least one field to update." },
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
        description:
          "Current email address used to find the contact. Use newEmail to change the address.",
      },
      name: {
        type: "string",
        minLength: 1,
        maxLength: 120,
        description:
          "Contact name (free text). Partial case-insensitive match against first/last/full name. If multiple contacts match, the tool returns candidates and does NOT update.",
      },
      firstName: {
        type: "string",
        minLength: 1,
        maxLength: 120,
        description: "New first name.",
      },
      lastName: {
        type: "string",
        minLength: 1,
        maxLength: 120,
        description: "New last name.",
      },
      newEmail: {
        type: "string",
        format: "email",
        maxLength: 320,
        description:
          "New email address. Distinct from the `email` identifier above: use `email` to find the contact, `newEmail` to change it.",
      },
      phone: { type: "string", minLength: 1, maxLength: 64 },
      company: { type: "string", minLength: 1, maxLength: 160 },
      jobTitle: { type: "string", minLength: 1, maxLength: 160 },
      country: { type: "string", minLength: 1, maxLength: 100 },
      lifecycleStage: {
        type: "string",
        enum: LIFECYCLE_VALUES,
        description: "Lifecycle stage.",
      },
      industry: {
        type: "string",
        enum: INDUSTRY_VALUES,
        description: "LinkedIn-style industry. Must match one of the allowed values exactly.",
      },
      contactSource: {
        type: "string",
        enum: CONTACT_SOURCE_VALUES,
        description: "Where the contact came from.",
      },
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    // 1. Resolve the contact to update.
    let target: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null = null;

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
          updated: false,
          multipleMatches: true,
          reason:
            "Multiple contacts match that name. Ask the user which one before updating.",
          candidates: rows,
        };
      }
      target = rows[0];
    }

    if (!target) {
      return { found: false, reason: "Contact not found in this organization." };
    }

    // 2. Email-collision guard: if newEmail is set and another contact in
    // the org already has it, refuse to write and let the model surface
    // the conflict to the user.
    if (args.newEmail) {
      const [conflict] = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            eq(contacts.email, args.newEmail),
            ne(contacts.id, target.id),
          ),
        )
        .limit(1);

      if (conflict) {
        return {
          updated: false,
          emailConflict: true,
          conflictWith: conflict,
          reason: `Another contact in this organization already uses ${args.newEmail}.`,
        };
      }
    }

    // 3. Build partial update payload from whichever fields were supplied.
    const updateData: Record<string, unknown> = {};
    if (args.firstName !== undefined) updateData.firstName = args.firstName;
    if (args.lastName !== undefined) updateData.lastName = args.lastName;
    if (args.newEmail !== undefined) updateData.email = args.newEmail;
    if (args.phone !== undefined) updateData.phone = args.phone;
    if (args.company !== undefined) updateData.company = args.company;
    if (args.jobTitle !== undefined) updateData.jobTitle = args.jobTitle;
    if (args.country !== undefined) updateData.country = args.country;
    if (args.lifecycleStage !== undefined) updateData.lifecycleStage = args.lifecycleStage;
    if (args.industry !== undefined) updateData.industry = args.industry;
    if (args.contactSource !== undefined) updateData.contactSource = args.contactSource;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(contacts)
      .set(updateData)
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
        phone: contacts.phone,
        company: contacts.company,
        jobTitle: contacts.jobTitle,
        country: contacts.country,
        lifecycleStage: contacts.lifecycleStage,
        industry: contacts.industry,
        contactSource: contacts.contactSource,
      });

    const changedFields = Object.keys(updateData).filter((k) => k !== "updatedAt");

    return {
      updated: true,
      contact: updated,
      changedFields,
      navigate: { route: "/contacts", params: { contactId: updated.id } },
      dataInvalidate: ["contacts"],
    };
  },
});
