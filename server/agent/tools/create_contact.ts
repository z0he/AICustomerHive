import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const createContactTool = defineTool({
  name: "create_contact",
  description:
    "Create a new contact in the current organization. Call this only after restating the action and getting explicit user confirmation, since this writes to the database. Returns the new contact's id and opens its drawer.",
  parameters: z.object({
    firstName: z.string().min(1).max(120),
    lastName: z.string().min(1).max(120).optional(),
    email: z.string().email().max(320).optional(),
    phone: z.string().min(1).max(64).optional(),
    company: z.string().min(1).max(160).optional(),
    jobTitle: z.string().min(1).max(160).optional(),
  }),
  parametersJsonSchema: {
    type: "object",
    properties: {
      firstName: {
        type: "string",
        minLength: 1,
        maxLength: 120,
        description: "Contact's first name. Required.",
      },
      lastName: {
        type: "string",
        minLength: 1,
        maxLength: 120,
        description: "Contact's last name.",
      },
      email: {
        type: "string",
        format: "email",
        maxLength: 320,
        description: "Contact's email address.",
      },
      phone: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        description: "Contact's phone number.",
      },
      company: {
        type: "string",
        minLength: 1,
        maxLength: 160,
        description: "Contact's company.",
      },
      jobTitle: {
        type: "string",
        minLength: 1,
        maxLength: 160,
        description: "Contact's job title.",
      },
    },
    required: ["firstName"],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    // If an email was provided and a contact with the same email already
    // exists in this org, return that one instead of writing a duplicate.
    // No unique constraint enforces this at the DB level (multi-tenancy
    // dropped it), so the dedupe lives here.
    if (args.email) {
      const [existing] = await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          email: contacts.email,
          company: contacts.company,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.organizationId, ctx.organizationId),
            eq(contacts.email, args.email),
          ),
        )
        .limit(1);

      if (existing) {
        return {
          alreadyExists: true,
          contact: existing,
          navigate: { route: "/contacts", params: { contactId: existing.id } },
          dataInvalidate: ["contacts"],
        };
      }
    }

    const [inserted] = await db
      .insert(contacts)
      .values({
        organizationId: ctx.organizationId,
        firstName: args.firstName,
        lastName: args.lastName ?? null,
        email: args.email ?? null,
        phone: args.phone ?? null,
        company: args.company ?? null,
        jobTitle: args.jobTitle ?? null,
      })
      .returning({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        company: contacts.company,
        jobTitle: contacts.jobTitle,
      });

    return {
      created: true,
      contact: inserted,
      navigate: { route: "/contacts", params: { contactId: inserted.id } },
      dataInvalidate: ["contacts"],
    };
  },
});
