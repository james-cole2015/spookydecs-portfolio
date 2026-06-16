// Shared confirm dialog — replaces shared/modal.js (#332)
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: 'danger' | 'primary' | 'default';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen, title, message, confirmLabel = 'Confirm', confirmColor = 'primary',
  isLoading, onConfirm, onCancel,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody><p>{message}</p></ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onCancel} isDisabled={isLoading}>Cancel</Button>
          <Button color={confirmColor} onPress={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
