import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { voiceUsageDaily } from "@shared/schema";
import { resolveTierForOrg, OVERAGE_PENCE_PER_MINUTE } from "./tiers";

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

// Approximate audio token rates per second (OpenAI Realtime, May 2026).
// Input from mic is encoded at ~100 tok/s; output speech ~150 tok/s.
const AUDIO_INPUT_TOKENS_PER_SECOND = 100;
const AUDIO_OUTPUT_TOKENS_PER_SECOND = 150;

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
  voiceSeconds: number;
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
      voiceSeconds: params.voiceSeconds,
      requestCount: 1,
    })
    .onConflictDoUpdate({
      target: [voiceUsageDaily.userId, voiceUsageDaily.dayUtc],
      set: {
        estimatedMillipence: sql`${voiceUsageDaily.estimatedMillipence} + ${params.millipence}`,
        inputTokens: sql`${voiceUsageDaily.inputTokens} + ${params.inputTokens}`,
        outputTokens: sql`${voiceUsageDaily.outputTokens} + ${params.outputTokens}`,
        voiceSeconds: sql`${voiceUsageDaily.voiceSeconds} + ${params.voiceSeconds}`,
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
    voiceSeconds: 0,
  });
}

export interface RecordRealtimeUsageParams {
  userId: number;
  organizationId: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  inputAudioTokens: number;
  outputAudioTokens: number;
}

export async function recordRealtimeUsage(
  params: RecordRealtimeUsageParams,
): Promise<void> {
  const millipence = Math.round(
    estimateRealtimeTextMillipence(
      params.inputTokens,
      params.cachedInputTokens,
      params.outputTokens,
    ),
  );
  const voiceSeconds = Math.round(
    params.inputAudioTokens / AUDIO_INPUT_TOKENS_PER_SECOND +
      params.outputAudioTokens / AUDIO_OUTPUT_TOKENS_PER_SECOND,
  );
  await upsertUsage({
    userId: params.userId,
    organizationId: params.organizationId,
    millipence,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    voiceSeconds,
  });
}

export interface BundleStatus {
  tier: string;
  minutesUsed: number;
  minutesLimit: number;
  overageMinutes: number;
  overagePence: number;
}

function startOfMonthUtcDateString(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export async function getBundleStatus(
  userId: number,
  organizationId: number,
): Promise<BundleStatus> {
  const tier = await resolveTierForOrg(organizationId);
  const monthStart = startOfMonthUtcDateString();
  const todayStr = todayUtcDateString();

  const [row] = await db
    .select({
      seconds: sql<number>`COALESCE(SUM(${voiceUsageDaily.voiceSeconds}), 0)::int`,
    })
    .from(voiceUsageDaily)
    .where(
      and(
        eq(voiceUsageDaily.userId, userId),
        gte(voiceUsageDaily.dayUtc, monthStart),
        lte(voiceUsageDaily.dayUtc, todayStr),
      ),
    );

  const secondsUsed = row?.seconds ?? 0;
  const minutesUsed = Math.floor(secondsUsed / 60);
  const minutesLimit = tier.voiceMinutesPerMonth;
  const overageMinutes = Math.max(0, minutesUsed - minutesLimit);
  const overagePence = overageMinutes * OVERAGE_PENCE_PER_MINUTE;

  return {
    tier: tier.name,
    minutesUsed,
    minutesLimit,
    overageMinutes,
    overagePence,
  };
}
