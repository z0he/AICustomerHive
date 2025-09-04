import { db } from "../db.js";
import { featureFlags } from "../../shared/schema.js";
import { eq, and, isNull, or } from "drizzle-orm";

interface FlagCache {
  flags: Record<string, boolean>;
  timestamp: number;
}

// In-memory cache with 60 second TTL
const cache = new Map<string, FlagCache>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Get feature flags for a user (with global fallbacks)
 * Returns cached results if available and not expired
 * Safe default: returns false for any flag if DB/cache fails
 */
export async function getFeatureFlags(userId?: string | number): Promise<Record<string, boolean>> {
  // Convert userId to string and validate if it's a UUID format
  let validUserId: string | undefined;
  if (userId) {
    const userIdStr = String(userId);
    // Only use userId if it's a valid UUID format, otherwise treat as global
    if (isValidUUID(userIdStr)) {
      validUserId = userIdStr;
    }
  }
  
  const cacheKey = validUserId || 'global';
  
  try {
    // Check cache first
    const cached = cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      return cached.flags;
    }

    // Fetch from database
    const flags = await fetchFlagsFromDb(validUserId);
    
    // Cache the result
    cache.set(cacheKey, {
      flags,
      timestamp: now
    });

    return flags;
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    // Safe default: return empty object (all flags will be false)
    return {};
  }
}

/**
 * Simple UUID validation
 */
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Fetch feature flags from database
 * For user requests: get user-specific flags + global flags (user-specific takes precedence)
 * For global requests: get only global flags
 */
async function fetchFlagsFromDb(userId?: string): Promise<Record<string, boolean>> {
  try {
    let dbFlags;

    if (userId) {
      // Get both user-specific and global flags
      dbFlags = await db
        .select()
        .from(featureFlags)
        .where(
          or(
            eq(featureFlags.userId, userId),
            isNull(featureFlags.userId)
          )
        );
    } else {
      // Get only global flags
      dbFlags = await db
        .select()
        .from(featureFlags)
        .where(isNull(featureFlags.userId));
    }

    // Convert to key-value map
    // User-specific flags override global flags
    const flagMap: Record<string, boolean> = {};
    
    // First, add global flags
    dbFlags
      .filter(flag => !flag.userId)
      .forEach(flag => {
        flagMap[flag.key] = flag.isEnabled;
      });

    // Then, add user-specific flags (these override global)
    if (userId) {
      dbFlags
        .filter(flag => flag.userId === userId)
        .forEach(flag => {
          flagMap[flag.key] = flag.isEnabled;
        });
    }

    return flagMap;
  } catch (error) {
    console.error('Database error fetching feature flags:', error);
    return {}; // Safe default
  }
}

/**
 * Get a single feature flag value
 * Safe default: returns false if flag doesn't exist or error occurs
 */
export async function getFeatureFlag(key: string, userId?: string | number): Promise<boolean> {
  try {
    const flags = await getFeatureFlags(userId);
    return flags[key] || false; // Safe default: false
  } catch (error) {
    console.error(`Error fetching feature flag '${key}':`, error);
    return false; // Safe default
  }
}

/**
 * Clear cache for a specific user or global cache
 * Useful for testing or immediate flag updates
 */
export function clearFlagCache(userId?: string): void {
  const cacheKey = userId || 'global';
  cache.delete(cacheKey);
}

/**
 * Clear all flag caches
 * Useful for testing or system-wide flag updates
 */
export function clearAllFlagCaches(): void {
  cache.clear();
}