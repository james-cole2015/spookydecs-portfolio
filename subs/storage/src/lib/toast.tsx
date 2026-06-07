/**
 * Lightweight toast system (replaces the vanilla shared/toast.js).
 * HeroUI-styled, context-driven. Reusable playbook artifact.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastApi {
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastType, string> = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
const COLORS: Record<ToastType, string> = {
  success: 'border-success bg-success/10 text-success',
  error: 'border-danger bg-danger/10 text-danger',
  warning: 'border-warning bg-warning/10 text-warning',
  info: 'border-secondary bg-secondary/10 text-secondary-300',
};

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = ++counter;
      setToasts((t) => [...t, { id, type, title: title ?? type[0].toUpperCase() + type.slice(1), message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const api: ToastApi = {
    showSuccess: (m, t) => push('success', m, t),
    showError: (m, t) => push('error', m, t),
    showWarning: (m, t) => push('warning', m, t),
    showInfo: (m, t) => push('info', m, t),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur min-w-[260px] max-w-sm ${COLORS[t.type]}`}
            role="alert"
          >
            <span className="text-lg leading-none">{ICONS[t.type]}</span>
            <div className="flex-1">
              <div className="font-semibold text-foreground">{t.title}</div>
              {t.message && <div className="text-sm text-foreground/80">{t.message}</div>}
            </div>
            <button className="text-foreground/60 hover:text-foreground" onClick={() => remove(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
