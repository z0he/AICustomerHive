import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

// Fired by useQueryParam.updateValue and by the realtime-agent nav handler
// whenever the URL search string changes without a pathname change. Wouter's
// useLocation only tracks pathname, so without this signal any hook on the
// same route wouldn't notice a search-only change.
export const QUERY_PARAM_CHANGE_EVENT = 'app:queryparamchange';

export function getQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key);
}

export function useQueryParam<T extends string>(
  key: string,
  defaultValue: T,
  opts?: { replace?: boolean },
): [T, (value: T) => void] {
  const [location, setLocation] = useLocation();

  const getCurrentValue = () => {
    const value = getQueryParam(key);
    return (value as T) || defaultValue;
  };

  const [value, setValue] = useState<T>(getCurrentValue);

  useEffect(() => {
    const sync = () => setValue(getCurrentValue());
    sync(); // catch pathname changes via wouter's location dep
    window.addEventListener('popstate', sync);
    window.addEventListener(QUERY_PARAM_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(QUERY_PARAM_CHANGE_EVENT, sync);
    };
  }, [location, key, defaultValue]);

  const updateValue = (newValue: T) => {
    const url = new URL(window.location.href);

    if (newValue === defaultValue) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, newValue);
    }

    const newPath = `${url.pathname}${url.search}`;
    // `replace: true` avoids polluting browser history when the value changes
    // on every keystroke (e.g. search inputs).
    setLocation(newPath, opts?.replace ? { replace: true } : undefined);

    // Immediately update state for synchronous UI updates
    setValue(newValue);

    // Notify any sibling useQueryParam instances on the same pathname so
    // they re-read the URL (their wouter location dep won't have changed).
    window.dispatchEvent(new Event(QUERY_PARAM_CHANGE_EVENT));
  };

  return [value, updateValue];
}