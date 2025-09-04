import { useLocation } from "wouter";

/**
 * Hook for managing URL query parameters with Wouter
 * Returns current URLSearchParams and a setter function
 */
export function useQueryParams(): [URLSearchParams, (next: Record<string, string | undefined>) => void] {
  const [loc, setLoc] = useLocation();
  
  // Parse current location to extract query parameters
  const url = new URL(loc, "http://dummy");
  const params = new URLSearchParams(url.search);
  
  // Function to update query parameters
  const setParams = (next: Record<string, string | undefined>) => {
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    
    // Update the URL with new query parameters
    const newSearch = params.toString();
    const newPath = url.pathname + (newSearch ? "?" + newSearch : "");
    setLoc(newPath);
  };
  
  return [params, setParams];
}

/**
 * Hook for getting and setting a single query parameter
 */
export function useQueryParam(key: string): [string | null, (value: string | undefined) => void] {
  const [params, setParams] = useQueryParams();
  
  const value = params.get(key);
  const setValue = (newValue: string | undefined) => {
    setParams({ [key]: newValue });
  };
  
  return [value, setValue];
}