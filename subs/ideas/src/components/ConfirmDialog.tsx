/**
 * ConfirmDialog + useConfirm — the React replacement for the vanilla
 * shared/modal.js `showConfirmModal(...)` imperative confirm flow.
 *
 * `useConfirm()` returns an imperative `confirm(opts)` (resolves true/false) plus
 * a `<dialog/>` node to render once per page. An async `onConfirm` keeps the
 * dialog in a loading state until it settles, then closes.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  /** Optional async action run while the confirm button shows a spinner. */
  onConfirm?: () => Promise<void> | void;
}

interface DialogState extends ConfirmOptions {
  open: boolean;
  resolve?: (v: boolean) => void;
}

export function useConfirm() {
  const [state, setState] = useState<DialogState>({ open: false, title: '', message: '' });
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, open: true, resolve });
    });
  }, []);

  const close = useCallback(
    (result: boolean) => {
      state.resolve?.(result);
      setState((s) => ({ ...s, open: false, resolve: undefined }));
    },
    [state],
  );

  const handleConfirm = useCallback(async () => {
    if (state.onConfirm) {
      setLoading(true);
      try {
        await state.onConfirm();
      } finally {
        setLoading(false);
      }
    }
    close(true);
  }, [state, close]);

  const dialog = (
    <Modal isOpen={state.open} onClose={() => !loading && close(false)} backdrop="blur">
      <ModalContent>
        <ModalHeader>{state.title}</ModalHeader>
        <ModalBody className="text-foreground/80">{state.message}</ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={() => close(false)} isDisabled={loading}>
            Cancel
          </Button>
          <Button
            color={state.danger ? 'danger' : 'primary'}
            onPress={handleConfirm}
            isLoading={loading}
          >
            {state.confirmLabel || 'Confirm'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );

  return { confirm, dialog };
}
