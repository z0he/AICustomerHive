import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { voiceUsageDaily } from "@shared/schema";

export const DAILY_CAP_PENCE = 200; // £2.00 per user per UTC day

// gpt-4o-mini text pricing (May 2026). Rates are pence per 1,000,000 tokens.
// Source: $0.15/M input, $0.60/M output, GBP/USD ~ 0.80.
const TEXT_INPUT_PENCE_PER_MILLION = 12;
const TEXT_OUTPUT_PENCE_PER_MILLION = 48;

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function estimateTextPence(
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    (inputTokens * TEXT_INPUT_PENCE_PER_MILLION) / 1_000_000 +
    (outputTokens * TEXT_OUTPUT_PENCE_PER_MILLION) / 1_000_000
  );
}

export interface CapStatus {
  ok: boolean;
  pence: number;
  capPence: number;
}

export async function checkDailyCap(userId: number): Promise<CapStatus> {
  const today = todayUtcDateString();
  const [row] = await db
    .select({ estimatedPence: voiceUsageDaily.estimatedPence })
    .from(voiceUsageDaily)
    .where(
      and(
        eq(voiceUsageDaily.userId, userId),
        eq(voiceUsageDaily.dayUtc, today),
      ),
    )
    .limit(1);

  const spent = row?.estimatedPence ?? 0;
  return {
    ok: spent < DAILY_CAP_PENCE,
    pence: spent,
    capPence: DAILY_CAP_PENCE,
  };
}

export interface RecordTextUsageParams {
  userId: number;
  organizationId: number;
  inputTokens: number;
  outputTokens: number;
}

// We store cost in integer pence (rounded). In text mode (E1/E2), individual
// requests cost much less than 1p and round to 0 — the counter barely moves.
// That is expected: the cap is provisioned for Realtime API costs in E3.
export async function recordTextUsage(
  params: RecordTextUsageParams,
): Promise<void> {
  const pence = Math.round(
    estimateTextPence(params.inputTokens, params.outputTokens),
  );
  const today = todayUtcDateString();

  await db
    .insert(voiceUsageDaily)
    .values({
      userId: params.userId,
      organizationId: params.organizationId,
      dayUtc: today,
      estimatedPence: pence,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      requestCount: 1,
    })
    .onConflictDoUpdate({
      target: [voiceUsageDaily.userId, voiceUsageDaily.dayUtc],
      set: {
        estimatedPence: sql`${voiceUsageDaily.estimatedPence} + ${pence}`,
        inputTokens: sql`${voiceUsageDaily.inputTokens} + ${params.inputTokens}`,
        outputTokens: sql`${voiceUsageDaily.outputTokens} + ${params.outputTokens}`,
        requestCount: sql`${voiceUsageDaily.requestCount} + 1`,
        updatedAt: sql`now()`,
      },
    });
}
