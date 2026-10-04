// DeferModal — pick a future season target for an idea (#604). Confirming
// persists status=Planning + bucket via the caller; the bucket field is the
// only deferral record (no new status, no history log).
import { useState } from 'react';
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from '@heroui/react';
import { deferTargets } from '../config/ideasConfig';

export function DeferModal({
  title,
  isOpen,
  onClose,
  onConfirm,
}: {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bucket: string) => Promise<void>;
}) {
  const targets = deferTargets();
  const [target, setTarget] = useState<string>(targets[0]);
  const [saving, setSaving] = useState(false);

  // onConfirm reports its own failure via toast; swallow here so the modal stays
  // open for a retry instead of surfacing an unhandled rejection.
  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm(target);
      onClose();
    } catch {
      /* toast shown by caller */
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" placement="center">
      <ModalContent>
        <ModalHeader>Defer "{title}"</ModalHeader>
        <ModalBody className="gap-3">
          <p className="text-small text-default-500">
            Moves the idea to Planning and records the season it is punted to.
          </p>
          <Select
            label="Defer to"
            selectedKeys={[target]}
            disallowEmptySelection
            onChange={(e) => setTarget(e.target.value)}
          >
            {targets.map((t) => (
              <SelectItem key={t}>{t}</SelectItem>
            ))}
          </Select>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button color="warning" onPress={handleConfirm} isLoading={saving}>
            Defer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
