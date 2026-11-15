// Retire action (#706): reason / disposal / notes form, then a shared ConfirmDialog before the POST.
import { useState } from 'react';
import {
  Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem, Textarea,
} from '@heroui/react';
import { ConfirmDialog, useToast } from '@spookydecs/ui';
import { retireItem } from '../api/itemsApi';
import { DEFAULT_DISPOSAL, DISPOSAL_METHODS, RETIRE_REASONS } from '../config/itemsConfig';
import type { Item } from '../api/types';

interface Props {
  item: Item;
  isOpen: boolean;
  onClose: () => void;
  onRetired: () => void;
}

export default function RetireItemModal({ item, isOpen, onClose, onRetired }: Props) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [disposal, setDisposal] = useState('');
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  // beyond_repair presets disposal to trash and locks it (server applies the same default).
  const presetDisposal = DEFAULT_DISPOSAL[reason];
  const effectiveDisposal = presetDisposal ?? disposal;
  const needsDisposal = reason !== '' && !presetDisposal;
  const canSubmit = reason !== '' && (!needsDisposal || disposal !== '');

  function reset() {
    setReason(''); setDisposal(''); setNotes(''); setConfirming(false);
  }
  function close() {
    if (saving) return;
    reset();
    onClose();
  }

  async function submit() {
    setSaving(true);
    try {
      await retireItem(item.id, {
        reason,
        disposal_method: effectiveDisposal || undefined,
        notes: notes.trim() || undefined,
      });
      toast.showSuccess(`${item.short_name} retired.`);
      reset();
      onClose();
      onRetired();
    } catch (e: any) {
      setConfirming(false);
      toast.showError(e?.message ?? 'Failed to retire item.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Modal isOpen={isOpen && !confirming} onClose={close} placement="center">
        <ModalContent>
          <ModalHeader>Retire {item.short_name}</ModalHeader>
          <ModalBody>
            <Select
              label="Reason"
              isRequired
              selectedKeys={reason ? [reason] : []}
              onChange={(e) => setReason(e.target.value)}
            >
              {RETIRE_REASONS.map((r) => <SelectItem key={r.value}>{r.label}</SelectItem>)}
            </Select>
            <Select
              label="Disposal"
              isRequired={needsDisposal}
              isDisabled={!reason || !!presetDisposal}
              selectedKeys={effectiveDisposal ? [effectiveDisposal] : []}
              onChange={(e) => setDisposal(e.target.value)}
              description={presetDisposal ? 'Beyond-repair items are trashed.' : undefined}
            >
              {DISPOSAL_METHODS.map((d) => <SelectItem key={d.value}>{d.label}</SelectItem>)}
            </Select>
            <Textarea label="Notes" placeholder="Optional" value={notes} onValueChange={setNotes} maxLength={1000} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={close}>Cancel</Button>
            <Button color="danger" isDisabled={!canSubmit} onPress={() => setConfirming(true)}>Retire…</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <ConfirmDialog
        isOpen={isOpen && confirming}
        title="Retire this item?"
        body="Open maintenance and violations for this item will be closed, and a packed item is taken out of its tote. Retiring can't be undone."
        confirmLabel="Retire Item"
        isDestructive
        isLoading={saving}
        onConfirm={submit}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
