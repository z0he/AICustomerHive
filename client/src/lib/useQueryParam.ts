import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export function getQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key);
}

export function useQueryParam<T extends string>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [location, setLocation] = useLocation();
  
  const getCurrentValue = () => {
    const value = getQueryParam(key);
    return (value as T) || defaultValue;
  };

  const [value, setValue] = useState<T>(getCurrentValue);

  useEffect(() => {
    const newValue = getCurrentValue();
    console.log(`[useQueryParam] Location changed, updating ${key} from "${value}" to "${newValue}"`);
    setValue(newValue);
  }, [location, key, defaultValue]);

  const updateValue = (newValue: T) => {
    console.log(`[useQueryParam] Updating ${key} from "${value}" to "${newValue}"`);
    
    const url = new URL(window.location.href);
    
    if (newValue === defaultValue) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, newValue);
    }
    
    const newPath = `${url.pathname}${url.search}`;
    console.log(`[useQueryParam] Setting location to: ${newPath}`);
    setLocation(newPath);
    
    // Immediately update state for synchronous UI updates
    setValue(newValue);
  };

  return [value, updateValue];
}