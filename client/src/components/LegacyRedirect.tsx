import { useEffect } from "react";
import { useLocation } from "wouter";

interface LegacyRedirectProps {
  to: string;
  transform?: Record<string, string>;
}

export const LegacyRedirect = ({ to, transform }: LegacyRedirectProps) => {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Get current URL search params
    const currentParams = new URLSearchParams(window.location.search);
    const newParams = new URLSearchParams();

    // Copy existing params
    currentParams.forEach((value, key) => {
      newParams.set(key, value);
    });

    // Apply transform params (these override existing ones)
    if (transform) {
      Object.entries(transform).forEach(([key, value]) => {
        newParams.set(key, value);
      });
    }

    // Build the new URL
    const queryString = newParams.toString();
    const newPath = queryString ? `${to}?${queryString}` : to;

    // Navigate to the new path
    setLocation(newPath);
  }, [to, transform, setLocation]);

  return null;
};