import { useState } from "react";

/**
 * A yes/no choice that is remembered in this browser (for example "sidebar collapsed").
 * Works like useState, but also writes the value to localStorage so a refresh keeps it.
 */
export function useStored(key: string, initial: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : saved === "1";
    } catch {
      return initial; // storage can be blocked (private browsing); fall back to the default
    }
  });
  function set(next: boolean) {
    setValue(next);
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {
      /* not saved, but still applied for this visit */
    }
  }
  return [value, set] as const;
}
