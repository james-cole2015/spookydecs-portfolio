import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Textarea,
  Button,
  Autocomplete,
  AutocompleteItem,
  Chip,
  Card,
  CardBody,
} from '@heroui/react';
import { Paperclip } from 'lucide-react';
import { useToast, usePhotoUpload, rasterizePdfToImage, ConfirmDialog } from '@spookydecs/ui';
import { createCost, getItems, updateImageAfterCostCreation } from '../api/financeApi';
import { formatCurrency } from '../config/financeConfig';

interface PickableItem {
  id: string;
  short_name?: string;
  shortName?: string;
  class?: string;
  type?: string;
}

const nameOf = (i: PickableItem) => i.short_name || i.shortName || i.id;

// Pack purchase mode of the new-cost page (replaces the vanilla PackPurchaseForm):
// multi-item picker, derived per-item cost, optional receipt, create one pack record.
export function PackPurchaseForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const { uploadFiles } = usePhotoUpload();

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    item_name: 'Pack Purchase',
    cost_date: today,
    vendor: '',
    manufacturer: '',
    total_cost: '',
    description: '',
  });
  const [allItems, setAllItems] = useState<PickableItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<PickableItem[]>([]);
  const [pendingReceipt, setPendingReceipt] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    (async () => {
      try {
        const result = await getItems();
        setAllItems(Array.isArray(result) ? result : result.items || []);
      } catch (e) {
        console.error('Failed to load items for pack picker:', e);
        setAllItems([]);
      }
    })();
  }, []);

  const selectableItems = useMemo(() => {
    const chosen = new Set(selectedItems.map((i) => i.id));
    return allItems.filter((i) => !chosen.has(i.id));
  }, [allItems, selectedItems]);

  const total = parseFloat(form.total_cost) || 0;
  const perItem = selectedItems.length > 0 ? total / selectedItems.length : 0;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    let processed = file;
    if (file.type === 'application/pdf') {
      try {
        processed = await rasterizePdfToImage(file);
      } catch (err) {
        console.error('PDF conversion failed:', err);
        toast.showError('Failed to convert PDF to image. Please use JPEG or PNG instead.');
        return;
      }
    }
    setPendingReceipt(processed);
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    if (!form.vendor.trim()) errors.push('Vendor is required');
    if (!form.cost_date) errors.push('Purchase date is required');
    if (!total || total <= 0) errors.push('Total cost must be greater than $0');
    if (selectedItems.length === 0) errors.push('At least one item must be selected');
    return errors;
  };

  const onReviewClick = () => {
    const errors = validate();
    if (errors.length > 0) {
      toast.showError(errors.join(' · '));
      return;
    }
    setConfirmOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let receiptData: Record<string, any> | null = null;
    if (pendingReceipt) {
      try {
        toast.showInfo('Uploading receipt…');
        const photos = await uploadFiles([pendingReceipt], {
          context: 'receipt',
          photo_type: 'receipt',
          season: 'shared',
        });
        const photo = photos[0];
        receiptData = {
          image_id: photo.photo_id,
          s3_key: (photo as any).s3_key,
          cloudfront_url: photo.cloudfront_url,
          file_name: pendingReceipt.name,
          file_type: pendingReceipt.type,
          file_size: pendingReceipt.size,
        };
      } catch (err: any) {
        console.error('Failed to upload receipt:', err);
        toast.showError(`Receipt upload failed: ${err.message}`);
        setSaving(false);
        setConfirmOpen(false);
        return;
      }
    }

    const payload: Record<string, any> = {
      class_type: 'pack',
      cost_type: 'acquisition',
      category: 'other',
      item_name: form.item_name.trim() || 'Pack Purchase',
      cost_date: form.cost_date,
      vendor: form.vendor.trim(),
      total_cost: total,
      pack_item_ids: selectedItems.map((i) => i.id),
      pack_item_names: selectedItems.map(nameOf),
      no_receipt: receiptData === null,
      quantity: selectedItems.length,
      unit_cost: perItem,
      ...(receiptData ? { receipt_data: receiptData, image_id: receiptData.image_id } : {}),
      ...(form.manufacturer.trim() ? { manufacturer: form.manufacturer.trim() } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };

    try {
      toast.showInfo('Saving pack purchase…');
      const newCost = await createCost(payload);
      if (receiptData?.image_id && newCost?.cost_id) {
        try {
          await updateImageAfterCostCreation(receiptData.image_id, newCost.cost_id);
        } catch (err) {
          console.warn('Receipt finalization failed (non-fatal):', err);
        }
      }
      toast.showSuccess('Pack purchase saved successfully');
      setTimeout(() => navigate('/'), 1200);
    } catch (err: any) {
      console.error('Failed to save pack purchase:', err);
      toast.showError(`Failed to save: ${err.message}`);
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-3 text-small font-semibold text-default-600">Pack Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Pack Name"
            labelPlacement="outside"
            placeholder="e.g. Halloween Spotlight Pack"
            value={form.item_name}
            onValueChange={(v) => set({ item_name: v })}
          />
          <Input
            label="Vendor / Store"
            labelPlacement="outside"
            isRequired
            placeholder="e.g. Home Depot"
            value={form.vendor}
            onValueChange={(v) => set({ vendor: v })}
          />
          <Input
            label="Manufacturer / Brand"
            labelPlacement="outside"
            placeholder="e.g. Gemmy"
            value={form.manufacturer}
            onValueChange={(v) => set({ manufacturer: v })}
          />
          <Input
            type="date"
            label="Purchase Date"
            labelPlacement="outside"
            isRequired
            value={form.cost_date}
            onValueChange={(v) => set({ cost_date: v })}
          />
          <Input
            type="number"
            label="Total Cost ($)"
            labelPlacement="outside"
            isRequired
            min={0.01}
            step="0.01"
            placeholder="0.00"
            value={form.total_cost}
            onValueChange={(v) => set({ total_cost: v })}
          />
        </div>
        <Textarea
          className="mt-4"
          label="Description (optional)"
          labelPlacement="outside"
          placeholder="Add any notes about this pack purchase…"
          value={form.description}
          onValueChange={(v) => set({ description: v })}
        />
      </section>

      <section>
        <h3 className="mb-1 text-small font-semibold text-default-600">Receipt</h3>
        <p className="mb-2 text-tiny text-default-500">Optionally attach a receipt image or PDF for this purchase.</p>
        {pendingReceipt ? (
          <Chip onClose={() => setPendingReceipt(null)} variant="flat" startContent={<span className="px-1">📄</span>}>
            {pendingReceipt.name}
          </Chip>
        ) : (
          <Button as="label" variant="flat" startContent={<Paperclip size={16} />}>
            Attach Receipt
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </Button>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-small font-semibold text-default-600">
          Items in Pack <span className="text-danger">*</span>
        </h3>
        <p className="mb-2 text-tiny text-default-500">
          Search for items and add them to this pack. Each item will receive the per-item cost.
        </p>
        <Autocomplete
          aria-label="Search items"
          placeholder="Search by name or ID…"
          defaultItems={selectableItems}
          selectedKey={null}
          onSelectionChange={(key) => {
            if (key == null) return;
            const item = allItems.find((i) => i.id === String(key));
            if (item) setSelectedItems((prev) => [...prev, item]);
          }}
        >
          {(item) => (
            <AutocompleteItem key={item.id} textValue={nameOf(item)}>
              <div className="flex flex-col">
                <span>{nameOf(item)}</span>
                <span className="text-tiny text-default-400">
                  {item.id} · {item.class || item.type || ''}
                </span>
              </div>
            </AutocompleteItem>
          )}
        </Autocomplete>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedItems.length === 0 ? (
            <span className="text-tiny text-default-500">No items selected yet.</span>
          ) : (
            selectedItems.map((item) => (
              <Chip
                key={item.id}
                onClose={() => setSelectedItems((prev) => prev.filter((i) => i.id !== item.id))}
                variant="flat"
              >
                {nameOf(item)}
              </Chip>
            ))
          )}
        </div>
      </section>

      <Card shadow="sm" className="bg-content2">
        <CardBody>
          <h3 className="mb-3 text-small font-semibold text-default-600">Summary</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-tiny uppercase text-default-500">Items Selected</div>
              <div className="text-lg font-semibold text-foreground">{selectedItems.length}</div>
            </div>
            <div>
              <div className="text-tiny uppercase text-default-500">Total Cost</div>
              <div className="text-lg font-semibold text-foreground">{formatCurrency(total)}</div>
            </div>
            <div>
              <div className="text-tiny uppercase text-default-500">Cost Per Item</div>
              <div className="text-lg font-semibold text-foreground">{formatCurrency(perItem)}</div>
            </div>
            <div>
              <div className="text-tiny uppercase text-default-500">Value Per Item</div>
              <div className="text-lg font-semibold text-foreground">{formatCurrency(perItem)}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="flat" onPress={() => navigate('/')}>
          Cancel
        </Button>
        <Button color="primary" onPress={onReviewClick}>
          Review &amp; Save Pack
        </Button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Create pack purchase?"
        body={
          <div className="flex flex-col gap-1">
            <span>Items: {selectedItems.map(nameOf).join(', ')}</span>
            <span>Total: {formatCurrency(total)}</span>
            <span>Cost per item: {formatCurrency(perItem)}</span>
            <span>Vendor: {form.vendor}</span>
          </div>
        }
        confirmLabel="Create Pack"
        isLoading={saving}
        onConfirm={handleSave}
        onClose={() => !saving && setConfirmOpen(false)}
      />
    </div>
  );
}
