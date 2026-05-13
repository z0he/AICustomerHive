import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { voiceUsageDaily } from "@shared/schema";

export const DAILY_CAP_PENCE = 200; // £2.00 per user per UTC day

// gpt-4o-mini text pricing (May 2026). Rates are pence per 1,000,000 tokens.
// Source: $0.15/M input, $0.60/M output, GBP/USD ~ 0.80.
const TEXT_INPUT_PENCE_PER_MILLION = 12;
const TEXT_OUTPUT_PENCE_PER_MILLION = 48;

// gpt-4o-mini-realtime-preview pricing (May 2026). Pence per 1,000,000 tokens.
// Source: $10/M input, $20/M output, $0.40/M cached input, GBP/USD ~ 0.80.
// Realtime is ~60x more expensive per token than Chat Completions for text.
const REALTIME_INPUT_PENCE_PER_MILLION = 800;
const REALTIME_CACHED_INPUT_PENCE_PER_MILLION = 32;
const REALTIME_OUTPUT_PENCE_PER_MILLION = 1600;

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

export interface RecordRealtimeTextUsageParams {
  userId: number;
  organizationId: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

export function estimateRealtimeTextPence(
  inputTokens: number,
  cachedInputTokens: number,
  outputTokens: number,
): number {
  const nonCachedInput = Math.max(0, inputTokens - cachedInputTokens);
  return (
    (nonCachedInput * REALTIME_INPUT_PENCE_PER_MILLION) / 1_000_000 +
    (cachedInputTokens * REALTIME_CACHED_INPUT_PENCE_PER_MILLION) / 1_000_000 +
    (outputTokens * REALTIME_OUTPUT_PENCE_PER_MILLION) / 1_000_000
  );
}

async function upsertUsage(params: {
  userId: number;
  organizationId: number;
  pence: number;
  inputTokens: number;
  outputTokens: number;
}): Promise<void> {
  const today = todayUtcDateString();
  await db
    .insert(voiceUsageDaily)
    .values({
      userId: params.userId,
      organizationId: params.organizationId,
      dayUtc: today,
      estimatedPence: params.pence,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      requestCount: 1,
    })
    .onConflictDoUpdate({
      target: [voiceUsageDaily.userId, voiceUsageDaily.dayUtc],
      set: {
        estimatedPence: sql`${voiceUsageDaily.estimatedPence} + ${params.pence}`,
        inputTokens: sql`${voiceUsageDaily.inputTokens} + ${params.inputTokens}`,
        outputTokens: sql`${voiceUsageDaily.outputTokens} + ${params.outputTokens}`,
        requestCount: sql`${voiceUsageDaily.requestCount} + 1`,
        updatedAt: sql`now()`,
      },
    });
}

export async function recordRealtimeTextUsage(
  params: RecordRealtimeTextUsageParams,
): Promise<void> {
  const pence = Math.round(
    estimateRealtimeTextPence(
      params.inputTokens,
      params.cachedInputTokens,
      params.outputTokens,
    ),
  );
  await upsertUsage({
    userId: params.userId,
    organizationId: params.organizationId,
    pence,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
  });
}
