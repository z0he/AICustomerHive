import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

export function getQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key);
}

export function useQueryParam<T extends string>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [location, setLocation] = useLocation();
  
  const getCurrentValue = (): T => {
    const value = getQueryParam(key);
    return (value as T) || defaultValue;
  };

  const [value, setValue] = useState<T>(getCurrentValue);

  useEffect(() => {
    setValue(getCurrentValue());
  }, [location]);

  const updateValue = (newValue: T) => {
    const url = new URL(window.location.href);
    
    if (newValue === defaultValue || newValue === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, newValue);
    }
    
    const newPath = `${url.pathname}${url.search}`;
    setLocation(newPath);
  };

  return [value, updateValue];
}