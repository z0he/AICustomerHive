import { useLocation } from "wouter";
import { useCallback } from "react";

/**
 * Hook to read and write URL query parameters
 * Provides utilities for managing URL state in React components
 */
export function useQueryParams() {
  const [location, setLocation] = useLocation();
  
  // Parse current query parameters
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const params = Object.fromEntries(searchParams.entries());

  /**
   * Get a specific query parameter value
   */
  const getParam = useCallback((key: string, defaultValue?: string): string => {
    return searchParams.get(key) || defaultValue || '';
  }, [searchParams]);

  /**
   * Set multiple query parameters at once
   */
  const setParams = useCallback((updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    
    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });

    // Build new URL
    const basePath = location.split('?')[0];
    const queryString = newParams.toString();
    const newLocation = queryString ? `${basePath}?${queryString}` : basePath;
    
    setLocation(newLocation);
  }, [location, setLocation, searchParams]);

  /**
   * Set a single query parameter
   */
  const setParam = useCallback((key: string, value: string | null) => {
    setParams({ [key]: value });
  }, [setParams]);

  return {
    params,
    getParam,
    setParam,
    setParams,
  };
}

/**
 * Hook specifically for contacts page query parameters
 * Handles stage, search query, and owner filtering with defaults
 */
export function useContactsParams() {
  const { getParam, setParams } = useQueryParams();
  
  // Get current values with defaults and validation
  const rawStage = getParam('stage', 'all');
  const validStages = ['all', 'lead', 'mql', 'opportunity', 'customer', 'evangelist', 'churned'];
  const stage = validStages.includes(rawStage) ? rawStage : 'all';
  
  const q = getParam('q', '');
  const owner = getParam('owner', '');

  /**
   * Update contacts filtering parameters
   */
  const updateParams = useCallback((updates: {
    stage?: string;
    q?: string;
    owner?: string;
  }) => {
    const newParams: Record<string, string | null> = {};
    
    if (updates.stage !== undefined) {
      // Validate stage, default to 'all' for invalid values
      const validStage = validStages.includes(updates.stage) ? updates.stage : 'all';
      newParams.stage = validStage === 'all' ? null : validStage; // Remove 'all' from URL
    }
    
    if (updates.q !== undefined) {
      newParams.q = updates.q || null; // Remove empty search
    }
    
    if (updates.owner !== undefined) {
      newParams.owner = updates.owner || null; // Remove empty owner
    }

    setParams(newParams);
  }, [setParams]);

  return {
    stage,
    q,
    owner,
    updateParams,
  };
}