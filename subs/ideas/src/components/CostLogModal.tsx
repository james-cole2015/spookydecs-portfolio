/**
 * CostLogModal — shared "Log Cost" dialog used by both the idea detail and the
 * build workspace. Posts to POST /finance/costs with related_idea_id; an optional
 * receipt is uploaded first via the shared usePhotoUpload().uploadFiles
 * (context=receipt → receipt_data.url). Receipt-upload failure is surfaced and
 * aborts the save (matching the vanilla flow).
 */
import { useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
} from '@heroui/react';
import { usePhotoUpload, useToast } from '@spookydecs/ui';
import { createIdeaCost } from '../api/ideasApi';
import { COST_TYPES, COST_CATEGORIES, type Idea } from '../config/ideasConfig';

const todayIso = () => new Date().toISOString().slice(0, 10);

export function CostLogModal({
  idea,
  isOpen,
  onClose,
  onSaved,
}: {
  idea: Pick<Idea, 'id' | 'season'>;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const { uploadFiles } = usePhotoUpload();

  const [itemName, setItemName] = useState('');
  const [costType, setCostType] = useState<string>('build');
  const [category, setCategory] = useState<string>('materials');
  const [totalCost, setTotalCost] = useState('');
  const [costDate, setCostDate] = useState(todayIso());
  const [store, setStore] = useState('');
  const [mfr, setMfr] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setItemName('');
    setCostType('build');
    setCategory('materials');
    setTotalCost('');
    setCostDate(todayIso());
    setStore('');
    setMfr('');
    setNotes('');
    setReceipt(null);
    setError('');
  }

  function handleClose() {
    if (saving) return;
    reset();
    onClose();
  }

  async function handleSave() {
    setError('');
    if (!itemName.trim() || !totalCost.trim() || !costDate || !store.trim()) {
      setError('All required fields must be filled.');
      return;
    }
    setSaving(true);

    let receiptPayload: Record<string, unknown> = { no_receipt: true };
    if (receipt) {
      try {
        const [uploaded] = await uploadFiles([receipt], {
          context: 'receipt',
          photo_type: 'receipt',
          idField: 'idea_id',
          entityId: idea.id,
          season: idea.season || 'Shared',
        });
        receiptPayload = { no_receipt: false, receipt_data: { url: uploaded?.cloudfront_url } };
      } catch (err) {
        setError('Receipt upload failed: ' + (err as Error).message);
        setSaving(false);
        return;
      }
    }

    try {
      await createIdeaCost(idea.id, {
        item_name: itemName.trim(),
        cost_type: costType,
        category,
        total_cost: totalCost.trim(),
        cost_date: costDate,
        vendor: store.trim(),
        class_type: 'item',
        ...(mfr.trim() && { manufacturer: mfr.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
        ...receiptPayload,
      });
      toast.showSuccess('Cost record saved');
      reset();
      onClose();
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Log Cost</ModalHeader>
        <ModalBody className="gap-4">
          <Input
            isRequired
            label="Item / Description"
            placeholder="e.g. 3/4 inch PVC pipe"
            value={itemName}
            onValueChange={setItemName}
          />
          <div className="flex gap-3">
            <Select
              isRequired
              label="Cost Type"
              selectedKeys={[costType]}
              onChange={(e) => e.target.value && setCostType(e.target.value)}
              disallowEmptySelection
            >
              {COST_TYPES.map((t) => (
                <SelectItem key={t}>{t}</SelectItem>
              ))}
            </Select>
            <Select
              isRequired
              label="Category"
              selectedKeys={[category]}
              onChange={(e) => e.target.value && setCategory(e.target.value)}
              disallowEmptySelection
            >
              {COST_CATEGORIES.map((c) => (
                <SelectItem key={c}>{c}</SelectItem>
              ))}
            </Select>
          </div>
          <div className="flex gap-3">
            <Input
              isRequired
              type="number"
              label="Total Cost ($)"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              value={totalCost}
              onValueChange={setTotalCost}
            />
            <Input
              isRequired
              type="date"
              label="Date"
              value={costDate}
              onValueChange={setCostDate}
            />
          </div>
          <div className="flex gap-3">
            <Input
              isRequired
              label="Store"
              placeholder="e.g. Home Depot"
              value={store}
              onValueChange={setStore}
            />
            <Input
              label="Brand / Manufacturer"
              placeholder="e.g. Spirit Halloween"
              value={mfr}
              onValueChange={setMfr}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-small text-default-600">Receipt (optional)</label>
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setReceipt(e.target.files?.[0] || null)}
              className="text-small text-default-500 file:mr-3 file:rounded-medium file:border-0 file:bg-default-100 file:px-3 file:py-1.5 file:text-small file:text-foreground"
            />
          </div>
          <Input label="Notes" placeholder="Optional" value={notes} onValueChange={setNotes} />
          {error && <p className="text-small text-danger">{error}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button color="primary" onPress={handleSave} isLoading={saving}>
            Save Cost
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
