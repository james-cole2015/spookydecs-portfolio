/**
 * ConfigProvider — resolves `window.SpookyConfig.get()` ONCE at app boot and
 * exposes the result synchronously via context. Replaces the vanilla pattern of
 * `await window.SpookyConfig.get()` on every API call.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Spinner } from '@heroui/react';
import type { SpookyConfigValues } from '../types/spooky-globals';

const ConfigContext = createContext<SpookyConfigValues | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SpookyConfigValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    window.SpookyConfig.get()
      .then((c) => {
        if (active) setConfig(c);
      })
      .catch((e) => {
        if (active) setError(e?.message ?? 'Failed to load configuration');
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-danger">
        Configuration error: {error}
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner label="Loading…" color="secondary" />
      </div>
    );
  }

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

/** Access the resolved runtime config. Must be used under <ConfigProvider>. */
export function useConfig(): SpookyConfigValues {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used within <ConfigProvider>');
  return ctx;
}
