import { z } from "zod";
import { and, eq, or } from "drizzle-orm";
import { db } from "../../db";
import { contacts } from "@shared/schema";
import { defineTool } from "../tool-runtime";

export const getContactDetailsTool = defineTool({
  name: "get_contact_details",
  description:
    "Fetch the full record for a single contact by id or email. Use this after search_contacts has narrowed things down, or whenever the user asks for details about one specific person.",
  parameters: z
    .object({
      id: z.string().uuid().optional(),
      email: z.string().email().optional(),
    })
    .refine((v) => Boolean(v.id) || Boolean(v.email), {
      message: "Provide either id or email.",
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
    },
    required: [],
    additionalProperties: false,
  },
  async execute(args, ctx) {
    if (!args.id && !args.email) {
      return { found: false, reason: "No id or email provided." };
    }

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

    if (!row) {
      return { found: false };
    }

    return { found: true, contact: row };
  },
});
