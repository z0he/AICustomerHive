import { eq } from "drizzle-orm";
import { db } from "../db";
import { organizations } from "@shared/schema";

export interface VoiceTier {
  id: "starter" | "growth" | "power";
  name: string;
  priceGBP: number;
  voiceMinutesPerMonth: number;
}

export const TIERS: Record<VoiceTier["id"], VoiceTier> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceGBP: 25,
    voiceMinutesPerMonth: 120,
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceGBP: 65,
    voiceMinutesPerMonth: 400,
  },
  power: {
    id: "power",
    name: "Power",
    priceGBP: 120,
    voiceMinutesPerMonth: 600,
  },
};

export const OVERAGE_PENCE_PER_MINUTE = 15;

// Maps the existing organizations.plan column ("trial" | "free" | "pro" |
// "enterprise") to our voice tiers. The plan column predates the voice tiers
// — once a proper subscription product is wired up, this mapping can be
// replaced with a direct lookup of a voice-specific tier column.
function planToTier(plan: string | null | undefined): VoiceTier {
  switch (plan) {
    case "pro":
      return TIERS.growth;
    case "enterprise":
      return TIERS.power;
    case "trial":
    case "free":
    default:
      return TIERS.starter;
  }
}

export async function resolveTierForOrg(
  organizationId: number,
): Promise<VoiceTier> {
  const [row] = await db
    .select({ plan: organizations.plan })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return planToTier(row?.plan ?? null);
}
