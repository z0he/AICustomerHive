import { useQuery } from "@tanstack/react-query";

type FeatureFlags = Record<string, boolean>;

/**
 * Fetch all feature flags from the API
 * Returns empty object if fetch fails (safe default - all flags will be false)
 */
async function fetchFeatureFlags(): Promise<FeatureFlags> {
  try {
    const response = await fetch("/api/flags", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
      },
    });

    if (!response.ok) {
      console.warn('Failed to fetch feature flags, using safe defaults');
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return {}; // Safe default
  }
}

/**
 * Hook to fetch all feature flags
 * Caches results and refetches on window focus
 */
export function useFeatureFlags() {
  return useQuery({
    queryKey: ['/api/flags'],
    queryFn: fetchFeatureFlags,
    staleTime: 60 * 1000, // 1 minute - matches server cache TTL
    cacheTime: 5 * 60 * 1000, // 5 minutes in cache
    retry: false, // Don't retry on failure, use safe defaults
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });
}

/**
 * Hook to check if a specific feature flag is enabled
 * Returns false by default if flag doesn't exist or fetch fails
 * 
 * @param key - Feature flag key (e.g., 'ff.contacts_unified')
 * @returns boolean - Whether the flag is enabled
 */
export function useFlag(key: string): boolean {
  const { data: flags = {} } = useFeatureFlags();
  return flags[key] || false; // Safe default: false
}

/**
 * Hook to check multiple feature flags at once
 * Returns an object with flag keys as properties and boolean values
 * 
 * @param keys - Array of feature flag keys
 * @returns object with flag keys as properties
 */
export function useFlags(keys: string[]): Record<string, boolean> {
  const { data: flags = {} } = useFeatureFlags();
  
  const result: Record<string, boolean> = {};
  keys.forEach(key => {
    result[key] = flags[key] || false; // Safe default: false
  });
  
  return result;
}