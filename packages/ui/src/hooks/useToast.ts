/**
 * useToast — thin adapter over HeroUI's native toast queue (`addToast`).
 * Preserves the storage sub's `{ showSuccess, showError, showWarning, showInfo }`
 * surface so call sites change only their import path. Reusable playbook artifact.
 *
 * Provider: mount `<ToastProvider />` from `@heroui/react` once at the app root —
 * it is not re-exported here (the barrel owns this adapter, not HeroUI's region).
 */
import { useMemo } from 'react';
import { addToast } from '@heroui/react';

export interface ToastApi {
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

type ToastColor = 'success' | 'danger' | 'warning' | 'secondary';

export function useToast(): ToastApi {
  return useMemo(() => {
    const push = (color: ToastColor, defaultTitle: string, message: string, title?: string) =>
      addToast({ title: title ?? defaultTitle, description: message, color, timeout: 4000 });
    return {
      showSuccess: (m, t) => push('success', 'Success', m, t),
      showError: (m, t) => push('danger', 'Error', m, t),
      showWarning: (m, t) => push('warning', 'Warning', m, t),
      showInfo: (m, t) => push('secondary', 'Info', m, t),
    };
  }, []);
}
