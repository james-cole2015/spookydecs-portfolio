/**
 * useConfirm — imperative, promise-based confirmation (the `ideas` pattern),
 * built on the shared declarative `<ConfirmDialog>`. Call `confirm(opts)` and
 * `await` a boolean; mount `dialog` once in the tree.
 *
 *   const { confirm, dialog } = useConfirm();
 *   const ok = await confirm({ title: 'Delete?', body: '…', isDestructive: true });
 *   if (ok) { … }
 *   // …then render `{dialog}` somewhere in the component.
 *
 * The dialog closes as soon as the choice is made; run any async work in the
 * caller after the promise resolves (no `isLoading` in imperative mode).
 */
import { createElement, useCallback, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { ConfirmDialog, type ConfirmColor } from '../components/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  confirmColor?: ConfirmColor;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
}

export interface UseConfirm {
  /** Open the dialog; resolves `true` on confirm, `false` on cancel/dismiss. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** The dialog element to mount once in the component tree. */
  dialog: ReactElement;
}

const CLOSED: ConfirmState = { isOpen: false, title: '', body: null };

export function useConfirm(): UseConfirm {
  const [state, setState] = useState<ConfirmState>(CLOSED);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const settle = useCallback(
    (value: boolean) => {
      resolver?.(value);
      setResolver(null);
      setState((prev) => ({ ...prev, isOpen: false }));
    },
    [resolver],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
      setState({ ...options, isOpen: true });
    });
  }, []);

  const dialog = useMemo(
    () =>
      createElement(ConfirmDialog, {
        isOpen: state.isOpen,
        title: state.title,
        body: state.body,
        confirmLabel: state.confirmLabel,
        cancelLabel: state.cancelLabel,
        isDestructive: state.isDestructive,
        confirmColor: state.confirmColor,
        onConfirm: () => settle(true),
        onClose: () => settle(false),
      }),
    [state, settle],
  );

  return { confirm, dialog };
}
