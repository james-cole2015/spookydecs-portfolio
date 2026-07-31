/**
 * AcquisitionPurchaseWizard — the W5 keystone (#496). Turns a `Considering`
 * acquisition into inventory item(s) + a finance cost, closing the manual
 * buy → item → cost loop.
 *
 * A fork of BuildCompleteWizard: same class/type cascade + class-specific spec
 * fields + quantity batch loop + 4-step Modal shell. Where the build wizard
 * aggregates cost from logged materials after the fact, a purchase KNOWS its
 * price up front — so this wizard prefills the per-item cost (price/N) and the
 * async consumer writes one finance record at the full total (no scan).
 *
 * Submit sequence mirrors the build flow: sequential createItem ×N (awaited so
 * the items handler's ConsistentRead atomic id generator increments cleanly),
 * each stamped with acquisition_data.related_acquisition_id, then ONE
 * PUT /acquisitions/{id} with status=Purchased + the event fields. The handler
 * publishes Acquisition.Purchased on that transition; the live #495 consumer
 * converts it into the durable finance cost. No rollback on mid-loop failure —
 * we report exactly which items were created (build-wizard parity).
 */
import { useMemo, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Checkbox,
  Link,
} from '@heroui/react';
import { Wand2 } from 'lucide-react';
import { usePhotoUpload } from '@spookydecs/ui';
import { createItem } from '../api/ideasApi';
import { updateAcquisition } from '../api/acquisitionsApi';
import {
  CLASS_TYPES,
  CLASS_TO_CATEGORY,
  ITEMS_BASE_URL,
  type Acquisition,
} from '../config/acquisitionsConfig';
import { formatDate } from '../lib/format';

const todayIso = () => new Date().toISOString().slice(0, 10);

interface SpecField {
  key: string;
  label: string;
  placeholder?: string;
}

// Class/type-specific spec fields — verbatim from BuildCompleteWizard (same item taxonomy).
function specFields(cls: string, type: string): SpecField[] {
  if (cls === 'Decoration') {
    const f: SpecField[] = [
      { key: 'height_length', label: 'Height/Length (ft)', placeholder: 'e.g. 3.5' },
      { key: 'tethers', label: 'Tethers', placeholder: '0' },
      { key: 'stakes', label: 'Stakes', placeholder: '0' },
    ];
    if (type === 'Inflatable' || type === 'Animatronic') f.push({ key: 'adapter', label: 'Adapter' });
    return f;
  }
  if (cls === 'Light') {
    const f: SpecField[] = [
      { key: 'bulb_type', label: 'Bulb Type', placeholder: 'e.g. Built-In' },
      { key: 'color', label: 'Color', placeholder: 'e.g. Orange' },
      { key: 'amps', label: 'Amps' },
      { key: 'watts', label: 'Watts' },
    ];
    if (type === 'String Light') f.push({ key: 'length', label: 'Length (ft)' });
    return f;
  }
  if (cls === 'Accessory') {
    return [
      { key: 'male_ends', label: 'Male Ends', placeholder: '1' },
      { key: 'female_ends', label: 'Female Ends', placeholder: '1' },
      { key: 'length', label: 'Length (ft)' },
    ];
  }
  return [];
}

// Cents-accurate even split: base = floor(total/n), remainder absorbed by the last item.
// Keeps sum(perItem) === total exactly, so the N item costs reconcile to the finance total.
function splitEvenly(total: number, n: number): number[] {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / n);
  const parts = Array<number>(n).fill(base);
  parts[n - 1] += cents - base * n;
  return parts.map((c) => c / 100);
}

export function AcquisitionPurchaseWizard({
  acquisition,
  isOpen,
  onClose,
}: {
  acquisition: Acquisition;
  isOpen: boolean;
  onClose: () => void;
}) {
  const MAX_UNITS = 20;
  const { uploadFiles } = usePhotoUpload();

  // Prefill the item taxonomy from the acquisition's buy-path seam. An un-enriched
  // acquisition has target_attributes: {} (user fills the cascade manually); a
  // W8-enriched one arrives prefilled. The wizard reads the seam either way.
  const ta = (acquisition.target_attributes as Record<string, unknown> | undefined) || {};
  const taStr = (k: string): string => {
    const v = ta[k];
    return v == null ? '' : String(v);
  };
  // Numeric fields (price) may arrive as a display string ("$149.99") on older
  // records enriched before the worker's _coerce_price fix — sanitize to a bare
  // number so the wizard's numeric Input and parsePrice() bind cleanly.
  const taNum = (k: string): string => {
    const v = ta[k];
    if (v == null || v === '') return '';
    const m = String(v).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return m ? m[0] : '';
  };

  const [step, setStep] = useState(1);
  const [units, setUnits] = useState('1');
  const [shortName, setShortName] = useState(acquisition.title);
  const [cls, setCls] = useState(taStr('class'));
  const [classType, setClassType] = useState(taStr('class_type'));
  const [spec, setSpec] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const f of specFields(taStr('class'), taStr('class_type'))) {
      if (ta[f.key] != null) seed[f.key] = String(ta[f.key]);
    }
    return seed;
  });
  const [hasPowerInlet, setHasPowerInlet] = useState(true);
  const [generalNotes, setGeneralNotes] = useState('');

  // Purchase details. Price prefers the record's own price, then Renfield's enriched
  // target_attributes.price (the common quick-add case — the record has no top-level
  // price yet). Both paths sanitize a possible "$" display string.
  const [price, setPrice] = useState(
    acquisition.price != null ? String(acquisition.price) : taNum('price'),
  );
  const [retailer, setRetailer] = useState(acquisition.retailer || '');
  const [manufacturer, setManufacturer] = useState(taStr('manufacturer'));
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [receipt, setReceipt] = useState<File | null>(null);
  const [isGift, setIsGift] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdItemId, setCreatedItemId] = useState('');
  const [createdItemIds, setCreatedItemIds] = useState<string[]>([]);

  const fields = useMemo(() => specFields(cls, classType), [cls, classType]);

  // "What Renfield found" summary for step 1. Reactive to the current field values
  // (not just the initial prefill) so it doubles as a live completeness meter — the
  // "still needs" list shrinks as the user fills gaps. Only shown when the record was
  // enriched (complete/partial); an un-enriched manual purchase gets no banner.
  const enrichStatus = acquisition.enrichment?.status;
  const isEnriched = enrichStatus === 'complete' || enrichStatus === 'partial';
  const fieldChecks = useMemo<Array<[string, boolean]>>(() => {
    const checks: Array<[string, boolean]> = [
      ['Item name', !!shortName.trim()],
      ['Class', !!cls],
      ['Type', !!classType],
      ['Price', !!price && Number(price) > 0],
      ['Manufacturer', !!manufacturer.trim()],
    ];
    for (const f of fields) checks.push([f.label, !!spec[f.key]?.trim()]);
    return checks;
  }, [shortName, cls, classType, price, manufacturer, spec, fields]);
  const foundCount = fieldChecks.filter(([, v]) => v).length;
  const missingLabels = fieldChecks.filter(([, v]) => !v).map(([l]) => l);

  function parseUnits(): number | null {
    const n = Number(units);
    if (!Number.isInteger(n) || n < 1 || n > MAX_UNITS) return null;
    return n;
  }

  function parsePrice(): number | null {
    const p = Number(price);
    if (!Number.isFinite(p) || p < 0) return null;
    return p;
  }

  function validateStep1(): boolean {
    setError('');
    if (!shortName.trim()) return setError('Item name is required.'), false;
    if (parseUnits() === null)
      return setError(`Quantity must be a whole number from 1 to ${MAX_UNITS}.`), false;
    if (!cls) return setError('Class is required.'), false;
    if (!classType) return setError('Type is required.'), false;
    return true;
  }

  function validateStep2(): boolean {
    setError('');
    if (parsePrice() === null) return setError('Price must be a non-negative number.'), false;
    if (!purchaseDate) return setError('Purchase date is required.'), false;
    return true;
  }

  // Item body mapping — mirrors BuildCompleteWizard.buildItemBody, minus build_data
  // (a purchase isn't a build) and plus the purchase provenance / vendor fields the
  // items builder.py reads (cost → vendor_metadata.cost, vendor_store, manufacturer).
  function buildItemBody(name: string, perCost: number): Record<string, unknown> {
    const itemBody: Record<string, unknown> = {
      short_name: name,
      class: cls,
      class_type: classType,
      season: acquisition.season,
      status: 'Ready', // §6A canonical lifecycle (#280)
      general_notes: generalNotes.trim(),
      date_acquired: String(new Date().getFullYear()),
      cost: String(perCost),
      vendor_store: retailer.trim(),
      manufacturer: manufacturer.trim(),
      acquisition_data: { related_acquisition_id: acquisition.acquisition_id },
    };
    if (cls === 'Decoration') {
      itemBody.height_length = spec.height_length || '';
      itemBody.tethers = spec.tethers || '0';
      itemBody.stakes = spec.stakes || '0';
      if ('adapter' in spec) itemBody.adapter = spec.adapter || '';
    }
    if (cls === 'Light') {
      itemBody.bulb_type = spec.bulb_type || '';
      itemBody.color = spec.color || '';
      itemBody.amps = spec.amps || '';
      itemBody.watts = spec.watts || '';
      itemBody.has_power_inlet = hasPowerInlet;
      if ('length' in spec) itemBody.length = spec.length || '';
    }
    if (cls === 'Accessory') {
      itemBody.male_ends = spec.male_ends || '1';
      itemBody.female_ends = spec.female_ends || '1';
      if ('length' in spec) itemBody.length = spec.length || '';
    }
    return itemBody;
  }

  async function submit() {
    setError('');
    const n = parseUnits();
    const total = parsePrice();
    if (n === null || total === null) {
      setError('Quantity and price must be valid before submitting.');
      return;
    }
    setSubmitting(true);

    // 1) Upload the receipt first (or record the no-receipt/gift escape hatch), so a
    //    receipt-upload failure aborts before any item is created (mirrors CostLogModal).
    let receiptPayload: Record<string, unknown> = { no_receipt: true, is_gift: isGift };
    if (receipt && !isGift) {
      try {
        const [uploaded] = await uploadFiles([receipt], {
          context: 'receipt',
          photo_type: 'receipt',
          idField: 'acquisition_id',
          entityId: acquisition.acquisition_id,
          season: acquisition.season || 'Shared',
        });
        receiptPayload = {
          no_receipt: false,
          is_gift: false,
          receipt_data: { url: uploaded?.cloudfront_url },
        };
      } catch (err) {
        setError('Receipt upload failed: ' + (err as Error).message);
        setSubmitting(false);
        return;
      }
    }

    // 2) Create N items sequentially (awaited), each back-linked to the acquisition,
    //    with the price split evenly across them. Track created ids so a mid-loop
    //    failure reports exactly which items exist (no rollback).
    const created: string[] = [];
    const name = shortName.trim();
    const per = splitEvenly(total, n);
    try {
      for (let i = 0; i < n; i++) {
        const res = await createItem(buildItemBody(name, per[i]));
        const itemId = res?.confirmation?.id || res?.preview?.id || res?.id;
        if (!itemId) throw new Error(`Item ${i + 1} of ${n} created but no ID returned`);
        created.push(itemId);
        setCreatedItemIds([...created]);
      }

      // 3) One PUT to flip the acquisition to Purchased + carry the event fields the
      //    handler publishes as Acquisition.Purchased. title/season satisfy the
      //    handler's validate_payload on PUT.
      await updateAcquisition({
        acquisition_id: acquisition.acquisition_id,
        title: acquisition.title,
        season: acquisition.season,
        status: 'Purchased',
        item_id: created[0],
        item_ids: created,
        total_cost: String(total),
        quantity: n,
        vendor: retailer.trim(),
        manufacturer: manufacturer.trim(),
        category: CLASS_TO_CATEGORY[cls] || 'decoration',
        purchase_date: purchaseDate,
        ...receiptPayload,
      });

      console.log(`[496] Purchase complete: acquisition=${acquisition.acquisition_id} items=`, created);
      setCreatedItemId(created[0]);
      setStep(4);
    } catch (err) {
      const msg = (err as Error).message;
      console.error(
        `[496] Purchase failed for acquisition=${acquisition.acquisition_id} after creating ${created.length} of ${n} item(s):`,
        created,
        err,
      );
      setCreatedItemIds(created);
      if (created.length > 0) {
        setError(
          `Created ${created.length} of ${n} item(s) (${created.join(', ')}) before failing: ` +
            `${msg}. The acquisition was NOT marked Purchased and these items are not yet ` +
            `linked — link or delete them manually.`,
        );
      } else {
        setError('Error: ' + msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const n = parseUnits();
  const total = parsePrice();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => step !== 4 && onClose()}
      size="lg"
      scrollBehavior="inside"
      isDismissable={step !== 4}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Purchase Acquisition
          {step < 4 && (
            <div className="flex items-center gap-2 text-tiny text-default-400">
              {[1, 2, 3].map((s) => (
                <span
                  key={s}
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    s === step
                      ? 'bg-primary text-white'
                      : s < step
                      ? 'bg-primary/30 text-primary'
                      : 'bg-default-100'
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </ModalHeader>
        <ModalBody className="gap-4">
          {step === 1 && (
            <>
              {isEnriched && (
                <div className="rounded-medium bg-secondary/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-small font-medium text-secondary-600">
                    <Wand2 size={15} />
                    Renfield prefilled {foundCount} of {fieldChecks.length} fields
                  </div>
                  {missingLabels.length > 0 ? (
                    <p className="mt-1 text-tiny text-default-500">
                      Still needs: {missingLabels.join(', ')} — fill in below.
                    </p>
                  ) : (
                    <p className="mt-1 text-tiny text-default-500">
                      Everything’s filled in — review and continue.
                    </p>
                  )}
                </div>
              )}
              <h3 className="text-medium font-semibold">Item Record</h3>
              <div className="flex gap-3">
                <Input
                  isRequired
                  className="flex-1"
                  label="Item Name"
                  value={shortName}
                  onValueChange={setShortName}
                />
                <Input
                  isRequired
                  type="number"
                  min={1}
                  max={MAX_UNITS}
                  step={1}
                  className="w-32"
                  label="Quantity"
                  description={`1–${MAX_UNITS}`}
                  value={units}
                  onValueChange={setUnits}
                />
              </div>
              {n !== null && n > 1 && (
                <p className="rounded-medium bg-default-100 px-3 py-2 text-tiny text-default-500">
                  Creates {n} separate item records (each named “{shortName.trim() || 'Item'}”,
                  distinguished by id), with the purchase price split evenly across them.
                </p>
              )}
              <div className="flex gap-3">
                <Select
                  isRequired
                  label="Class"
                  selectedKeys={cls ? [cls] : []}
                  onChange={(e) => {
                    setCls(e.target.value);
                    setClassType('');
                    setSpec({});
                  }}
                >
                  {Object.keys(CLASS_TYPES).map((c) => (
                    <SelectItem key={c}>{c}</SelectItem>
                  ))}
                </Select>
                <Select
                  isRequired
                  label="Type"
                  isDisabled={!cls}
                  selectedKeys={classType ? [classType] : []}
                  onChange={(e) => {
                    setClassType(e.target.value);
                    setSpec({});
                  }}
                >
                  {(CLASS_TYPES[cls] || []).map((t) => (
                    <SelectItem key={t}>{t}</SelectItem>
                  ))}
                </Select>
              </div>

              {fields.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <Input
                      key={f.key}
                      label={f.label}
                      placeholder={f.placeholder}
                      value={spec[f.key] || ''}
                      onValueChange={(v) => setSpec((s) => ({ ...s, [f.key]: v }))}
                    />
                  ))}
                </div>
              )}
              {cls === 'Light' && (
                <Checkbox isSelected={hasPowerInlet} onValueChange={setHasPowerInlet}>
                  Has Power Inlet
                </Checkbox>
              )}

              <Textarea label="Notes" minRows={2} value={generalNotes} onValueChange={setGeneralNotes} />
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-medium font-semibold">Purchase Details</h3>
              <div className="flex gap-3">
                <Input
                  isRequired
                  type="number"
                  min="0"
                  step="0.01"
                  label="Price ($)"
                  placeholder="0.00"
                  description={n !== null && n > 1 ? 'Total across all units' : undefined}
                  value={price}
                  onValueChange={setPrice}
                />
                <Input
                  isRequired
                  type="date"
                  label="Purchase Date"
                  value={purchaseDate}
                  onValueChange={setPurchaseDate}
                />
              </div>
              <div className="flex gap-3">
                <Input
                  label="Retailer"
                  placeholder="e.g. Spirit Halloween"
                  value={retailer}
                  onValueChange={setRetailer}
                />
                <Input
                  label="Manufacturer"
                  placeholder="e.g. Gemmy"
                  value={manufacturer}
                  onValueChange={setManufacturer}
                />
              </div>
              <Checkbox isSelected={isGift} onValueChange={setIsGift}>
                Gift / no receipt
              </Checkbox>
              {!isGift && (
                <div className="flex flex-col gap-1">
                  <label className="text-small text-default-600">Receipt (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setReceipt(e.target.files?.[0] || null)}
                    className="text-small text-default-500 file:mr-3 file:rounded-medium file:border-0 file:bg-default-100 file:px-3 file:py-1.5 file:text-small file:text-foreground"
                  />
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-medium font-semibold">Confirm &amp; Submit</h3>
              <div className="flex flex-col divide-y divide-default-100 text-small">
                <ReviewRow label="Item Name" value={shortName} />
                <ReviewRow label="Quantity" value={n && n > 1 ? `${n} items` : '1 item'} />
                <ReviewRow label="Class / Type" value={`${cls} / ${classType}`} />
                <ReviewRow label="Season" value={acquisition.season} />
                <ReviewRow label="Price" value={total != null ? `$${total.toFixed(2)}` : '—'} />
                {n != null && n > 1 && total != null && (
                  <ReviewRow label="Per item" value={`$${(splitEvenly(total, n)[0]).toFixed(2)} each`} />
                )}
                <ReviewRow label="Retailer" value={retailer.trim() || '—'} />
                <ReviewRow label="Purchase Date" value={purchaseDate ? formatDate(purchaseDate) : '—'} />
                <ReviewRow
                  label="Receipt"
                  value={isGift ? 'Gift / no receipt' : receipt ? receipt.name : 'None attached'}
                />
              </div>
            </>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20 text-3xl text-success">
                ✓
              </div>
              <h3 className="text-large font-semibold">Purchase Complete!</h3>
              <p className="text-small text-default-500">
                {createdItemIds.length > 1 ? (
                  <>
                    <strong className="text-foreground">{createdItemIds.length} items</strong> created
                    from this acquisition.
                  </>
                ) : (
                  <>
                    Item <strong className="text-foreground">{createdItemId}</strong> created.
                  </>
                )}
              </p>
              <p className="text-tiny text-default-400">
                The finance cost record is being written asynchronously.
              </p>
            </div>
          )}

          {error && <p className="text-small text-danger">{error}</p>}
        </ModalBody>
        <ModalFooter>
          {step === 1 && (
            <>
              <Button variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button color="primary" onPress={() => validateStep1() && setStep(2)}>
                Next →
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="light" onPress={() => setStep(1)}>
                ← Back
              </Button>
              <Button color="primary" onPress={() => validateStep2() && setStep(3)}>
                Review →
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button variant="light" onPress={() => setStep(2)} isDisabled={submitting}>
                ← Back
              </Button>
              <Button color="primary" onPress={submit} isLoading={submitting}>
                Complete Purchase
              </Button>
            </>
          )}
          {step === 4 && (
            <>
              <Button
                as={Link}
                href={`${ITEMS_BASE_URL}/items/${createdItemId}`}
                isExternal
                variant="flat"
              >
                View Item →
              </Button>
              <Button color="primary" onPress={onClose}>
                Done
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-default-500">{label}</span>
      <strong className="text-foreground">{value}</strong>
    </div>
  );
}
