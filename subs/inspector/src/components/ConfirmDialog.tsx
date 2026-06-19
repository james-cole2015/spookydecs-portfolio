import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import type { ReactNode } from 'react';

export function ConfirmDialog({
  isOpen,
  title,
  body,
  confirmLabel = 'Confirm',
  confirmColor = 'primary',
  isLoading = false,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  confirmColor?: 'primary' | 'danger' | 'secondary';
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} backdrop="blur">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody className="text-foreground/80">{body}</ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button color={confirmColor} onPress={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
