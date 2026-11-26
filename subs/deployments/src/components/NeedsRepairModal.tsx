import { useEffect, useState } from 'react';
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from '@heroui/react';
import { useAuth, useToast } from '@spookydecs/ui';
import { createRepairRecord, type RepairCriticality, type UnresolvedDecoration } from '../api/deploymentsApi';

const CRITICALITIES: RepairCriticality[] = ['low', 'medium', 'high', 'critical'];

interface Props {
  item: UnresolvedDecoration | null;
  deploymentLabel: string;
  /** Called with the new repair record id; persists the "Needs repair" decision. Rejects on failure. */
  onSaved: (itemId: string, repairRecordId: string) => Promise<void>;
  onClose: () => void;
}

/**
 * "Needs repair" for a staged decoration that was not deployed (#714). Creates a scheduled repair
 * record through the maintenance API, then saves the decision. The decision is saved only after the
 * repair exists. If saving fails after a successful create, the record id is kept so a retry saves
 * the decision again instead of creating a duplicate repair.
 */
export function NeedsRepairModal({ item, deploymentLabel, onSaved, onClose }: Props) {
  const auth = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [criticality, setCriticality] = useState<RepairCriticality | ''>('');
  const [saving, setSaving] = useState(false);
  const [repairRecordId, setRepairRecordId] = useState<string | null>(null);

  useEffect(() => {
    setTitle('');
    setCriticality('');
    setRepairRecordId(null);
    setSaving(false);
  }, [item?.item_id]);

  if (!item) return null;
  const name = item.short_name || item.item_id;
  const performedBy = (auth.claims?.email as string | undefined) || 'SpookyDecs Ent';

  async function save() {
    if (!item || !title.trim()) return;
    setSaving(true);
    let recordId = repairRecordId;
    try {
      if (!recordId) {
        recordId = await createRepairRecord({
          item_id: item.item_id,
          title: title.trim(),
          description: `Staged for ${deploymentLabel} but not deployed. Flagged at deployment complete.`,
          performed_by: performedBy,
          ...(criticality ? { criticality } : {}),
        });
        setRepairRecordId(recordId);
      }
      await onSaved(item.item_id, recordId);
      onClose();
    } catch (e: any) {
      toast.showError(
        recordId
          ? `Repair record ${recordId} was created but the decision was not saved: ${e?.message}. Press "Retry save".`
          : `Could not create repair record: ${e?.message}`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} backdrop="blur" placement="center" isDismissable={!saving}>
      <ModalContent>
        <ModalHeader>Needs repair: {name}</ModalHeader>
        <ModalBody className="gap-3">
          <p className="text-sm text-default-500">
            Creates a scheduled repair record for this item. It goes back to Ready when the deployment is completed.
          </p>
          <Input
            label="Title"
            variant="bordered"
            isRequired
            value={title}
            onValueChange={setTitle}
            isDisabled={!!repairRecordId}
            data-testid="repair-title"
          />
          <Select
            label="Criticality (optional)"
            variant="bordered"
            selectedKeys={criticality ? [criticality] : []}
            onSelectionChange={(keys) => setCriticality(((Array.from(keys)[0] as RepairCriticality) || '') as RepairCriticality | '')}
            isDisabled={!!repairRecordId}
            data-testid="repair-criticality"
          >
            {CRITICALITIES.map((c) => (
              <SelectItem key={c}>{c}</SelectItem>
            ))}
          </Select>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button color="primary" onPress={save} isLoading={saving} isDisabled={!title.trim()} data-testid="repair-save">
            {repairRecordId ? 'Retry save' : 'Create repair & save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
