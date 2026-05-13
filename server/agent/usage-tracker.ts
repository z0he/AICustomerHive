import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { voiceUsageDaily } from "@shared/schema";

// Cost is tracked in MILLIPENCE (1 unit = 0.001 pence = 1/100,000 of a £).
// At Realtime mini text rates a single request is ~50-500 millipence, so
// storing as integer pence (with rounding) was collapsing every request to 0.
export const DAILY_CAP_MILLIPENCE = 200_000; // £2.00 per user per UTC day

// gpt-4o-mini text (Chat Completions) pricing. Rates are millipence per 1M tokens.
// Source: $0.15/M input, $0.60/M output, GBP/USD ~ 0.80.
const TEXT_INPUT_MILLIPENCE_PER_MILLION = 12_000;
const TEXT_OUTPUT_MILLIPENCE_PER_MILLION = 48_000;

// gpt-4o-mini-realtime-preview pricing (May 2026). Millipence per 1M tokens.
// Source: $10/M input, $20/M output, $0.40/M cached input.
const REALTIME_INPUT_MILLIPENCE_PER_MILLION = 800_000;
const REALTIME_CACHED_INPUT_MILLIPENCE_PER_MILLION = 32_000;
const REALTIME_OUTPUT_MILLIPENCE_PER_MILLION = 1_600_000;

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function estimateTextMillipence(
  inputTokens: number,
  outputTokens: number,
): number {
  return (
    (inputTokens * TEXT_INPUT_MILLIPENCE_PER_MILLION) / 1_000_000 +
    (outputTokens * TEXT_OUTPUT_MILLIPENCE_PER_MILLION) / 1_000_000
  );
}

export function estimateRealtimeTextMillipence(
  inputTokens: number,
  cachedInputTokens: number,
  outputTokens: number,
): number {
  const nonCachedInput = Math.max(0, inputTokens - cachedInputTokens);
  return (
    (nonCachedInput * REALTIME_INPUT_MILLIPENCE_PER_MILLION) / 1_000_000 +
    (cachedInputTokens * REALTIME_CACHED_INPUT_MILLIPENCE_PER_MILLION) / 1_000_000 +
    (outputTokens * REALTIME_OUTPUT_MILLIPENCE_PER_MILLION) / 1_000_000
  );
}

export interface CapStatus {
  ok: boolean;
  millipence: number;
  capMillipence: number;
}

export async function checkDailyCap(userId: number): Promise<CapStatus> {
  const today = todayUtcDateString();
  const [row] = await db
    .select({ estimatedMillipence: voiceUsageDaily.estimatedMillipence })
    .from(voiceUsageDaily)
    .where(
      and(
        eq(voiceUsageDaily.userId, userId),
        eq(voiceUsageDaily.dayUtc, today),
      ),
    )
    .limit(1);

  const spent = row?.estimatedMillipence ?? 0;
  return {
    ok: spent < DAILY_CAP_MILLIPENCE,
    millipence: spent,
    capMillipence: DAILY_CAP_MILLIPENCE,
  };
}

async function upsertUsage(params: {
  userId: number;
  organizationId: number;
  millipence: number;
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
      estimatedMillipence: params.millipence,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      requestCount: 1,
    })
    .onConflictDoUpdate({
      target: [voiceUsageDaily.userId, voiceUsageDaily.dayUtc],
      set: {
        estimatedMillipence: sql`${voiceUsageDaily.estimatedMillipence} + ${params.millipence}`,
        inputTokens: sql`${voiceUsageDaily.inputTokens} + ${params.inputTokens}`,
        outputTokens: sql`${voiceUsageDaily.outputTokens} + ${params.outputTokens}`,
        requestCount: sql`${voiceUsageDaily.requestCount} + 1`,
        updatedAt: sql`now()`,
      },
    });
}

export interface RecordTextUsageParams {
  userId: number;
  organizationId: number;
  inputTokens: number;
  outputTokens: number;
}

export async function recordTextUsage(
  params: RecordTextUsageParams,
): Promise<void> {
  const millipence = Math.round(
    estimateTextMillipence(params.inputTokens, params.outputTokens),
  );
  await upsertUsage({
    userId: params.userId,
    organizationId: params.organizationId,
    millipence,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
  });
}

export interface RecordRealtimeTextUsageParams {
  userId: number;
  organizationId: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

export async function recordRealtimeTextUsage(
  params: RecordRealtimeTextUsageParams,
): Promise<void> {
  const millipence = Math.round(
    estimateRealtimeTextMillipence(
      params.inputTokens,
      params.cachedInputTokens,
      params.outputTokens,
    ),
  );
  await upsertUsage({
    userId: params.userId,
    organizationId: params.organizationId,
    millipence,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
  });
}
