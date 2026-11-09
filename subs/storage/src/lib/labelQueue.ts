/**
 * Print-sheet queue (#707): tote IDs waiting to be printed, kept in this browser only.
 * Lets you add totes from their detail pages and print them two at a time on the
 * labels page. No backend, no cross-device sync by design.
 */
import { useCallback, useEffect, useState } from 'react';

const KEY = 'storage.labelQueue';
const EVENT = 'storage-label-queue';

export function readQueue(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function writeQueue(ids: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* storage unavailable — queue simply won't persist */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useLabelQueue() {
  const [ids, setIds] = useState<string[]>(readQueue);
  useEffect(() => {
    const sync = () => setIds(readQueue());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync); // other tabs
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const add = useCallback((id: string) => writeQueue([...readQueue(), id]), []);
  const remove = useCallback((id: string) => writeQueue(readQueue().filter((x) => x !== id)), []);
  return { ids, add, remove, has: (id: string) => ids.includes(id) };
}
