import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

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
    const newValue = getCurrentValue();
    setValue(newValue);
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
  };

  return [value, updateValue];
}