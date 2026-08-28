/**
 * Shared confirmation dialog — the single fleet-wide confirm surface
 * (design.md §6 finding F2). Built from the superset of the 8 per-sub copies:
 *
 *  - cancel handler canonicalized on `onClose`, cancel button on `variant="light"`
 *  - destructive intent expressed via the canonical `isDestructive` boolean
 *    (→ `color="danger"`); `confirmColor` remains as an override for the
 *    non-destructive semantic cases (a `secondary`/`primary` state change).
 *
 * For imperative, promise-based confirms (the `ideas` pattern) use the
 * `useConfirm()` hook, which renders this same component.
 */
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import type { ReactNode } from 'react';

export type ConfirmColor = 'primary' | 'danger' | 'secondary' | 'warning' | 'default';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Canonical destructive signal → renders the confirm button `danger`. */
  isDestructive?: boolean;
  /** Override for non-destructive semantic confirms (wins over `isDestructive`). */
  confirmColor?: ConfirmColor;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  /** Optional `data-testid` on the confirm button — the confirm label often
   *  matches the trigger button's text (e.g. "Stage Tote"), so a testid is
   *  the only reliable way for e2e tests to target the dialog's own button. */
  confirmTestId?: string;
}

export function ConfirmDialog({
  isOpen,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  confirmColor,
  isLoading = false,
  onConfirm,
  onClose,
  confirmTestId,
}: ConfirmDialogProps) {
  const color: ConfirmColor = confirmColor ?? (isDestructive ? 'danger' : 'primary');
  return (
    <Modal isOpen={isOpen} onClose={onClose} backdrop="blur" placement="center">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody className="text-foreground/80">{body}</ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            {cancelLabel}
          </Button>
          <Button color={color} onPress={onConfirm} isLoading={isLoading} data-testid={confirmTestId}>
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
