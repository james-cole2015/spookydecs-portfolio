import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';

/**
 * Replaces the vanilla `promptExportFormat()` (a hijacked confirm modal whose two
 * buttons were relabeled JSON / CSV) with a proper HeroUI prompt. Returns the
 * chosen format to the caller, which then builds + downloads the export.
 */
export function ExportFormatPrompt({
  isOpen,
  count,
  onChoose,
  onCancel,
}: {
  isOpen: boolean;
  count: number;
  onChoose: (format: 'json' | 'csv') => void;
  onCancel: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="sm">
      <ModalContent>
        <ModalHeader>Export format</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-600">
            Export {count} record{count === 1 ? '' : 's'} as JSON or CSV?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" variant="light" onPress={onCancel}>
            Cancel
          </Button>
          <Button size="sm" variant="flat" onPress={() => onChoose('csv')}>
            CSV
          </Button>
          <Button size="sm" color="secondary" onPress={() => onChoose('json')}>
            JSON
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
