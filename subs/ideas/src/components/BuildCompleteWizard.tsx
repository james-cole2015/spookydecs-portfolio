/**
 * BuildCompleteWizard — the 3-step "Complete Build" flow from the vanilla
 * build-detail.js. Step 1 confirms the completion date, step 2 builds the item
 * record (class/class_type cascade + class-specific fields), step 3 reviews and
 * submits: createItem → updateIdea(status=Built, build_complete, item_id). The
 * item create fires the finance/items sync event downstream.
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
import { createItem, updateIdea, getIdeaCosts } from '../api/ideasApi';
import { CLASS_TYPES, ITEMS_BASE_URL, type Idea } from '../config/ideasConfig';
import { formatDate } from '../lib/format';

const todayIso = () => new Date().toISOString().slice(0, 10);

interface SpecField {
  key: string;
  label: string;
  placeholder?: string;
}

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

export function BuildCompleteWizard({
  idea,
  isOpen,
  onClose,
}: {
  idea: Idea;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [completeDate, setCompleteDate] = useState(idea.build_complete || todayIso());
  const [shortName, setShortName] = useState(idea.title);
  const [cls, setCls] = useState('');
  const [classType, setClassType] = useState('');
  const [spec, setSpec] = useState<Record<string, string>>({});
  const [hasPowerInlet, setHasPowerInlet] = useState(true);
  const [generalNotes, setGeneralNotes] = useState('');
  const [costSummary, setCostSummary] = useState<string>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdItemId, setCreatedItemId] = useState('');

  const fields = useMemo(() => specFields(cls, classType), [cls, classType]);

  async function goToStep2() {
    setStep(2);
    setCostSummary('…');
    try {
      const costs = await getIdeaCosts(idea.id);
      const total = costs.reduce((s, c) => s + (parseFloat(String(c.total_cost)) || 0), 0);
      setCostSummary(`$${total.toFixed(2)} across ${costs.length} record${costs.length !== 1 ? 's' : ''}`);
    } catch {
      setCostSummary('Could not load costs.');
    }
  }

  function validateStep2(): boolean {
    setError('');
    if (!shortName.trim()) return setError('Item name is required.'), false;
    if (!cls) return setError('Class is required.'), false;
    if (!classType) return setError('Type is required.'), false;
    return true;
  }

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      const itemBody: Record<string, unknown> = {
        short_name: shortName.trim(),
        class: cls,
        class_type: classType,
        season: idea.season,
        status: 'Active',
        general_notes: generalNotes.trim(),
        date_acquired: String(new Date().getFullYear()),
        build_data: { idea_build: true, related_idea_id: idea.id },
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

      const itemResult = await createItem(itemBody);
      const itemId = itemResult?.confirmation?.id || itemResult?.preview?.id || itemResult?.id;
      if (!itemId) throw new Error('Item created but no ID returned');

      await updateIdea({
        id: idea.id,
        season: idea.season,
        title: idea.title,
        status: 'Built',
        build_complete: completeDate || todayIso(),
        item_id: itemId,
        related_item_id: itemId,
      });

      setCreatedItemId(itemId);
      setStep(4); // success
    } catch (err) {
      setError('Error: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

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
          Complete Build
          {step < 4 && (
            <div className="flex items-center gap-2 text-tiny text-default-400">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    n === step
                      ? 'bg-primary text-white'
                      : n < step
                      ? 'bg-primary/30 text-primary'
                      : 'bg-default-100'
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </ModalHeader>
        <ModalBody className="gap-4">
          {step === 1 && (
            <>
              <h3 className="text-medium font-semibold">Confirm Completion</h3>
              <Input
                type="date"
                label="Build Complete Date"
                value={completeDate}
                onValueChange={setCompleteDate}
              />
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-medium font-semibold">Create Item Record</h3>
              {costSummary && (
                <p className="rounded-medium bg-default-100 px-3 py-2 text-small text-default-500">
                  Logged costs: {costSummary}
                </p>
              )}
              <Input isRequired label="Item Name" value={shortName} onValueChange={setShortName} />
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

          {step === 3 && (
            <>
              <h3 className="text-medium font-semibold">Confirm &amp; Submit</h3>
              <div className="flex flex-col divide-y divide-default-100 text-small">
                <ReviewRow label="Item Name" value={shortName} />
                <ReviewRow label="Class / Type" value={`${cls} / ${classType}`} />
                <ReviewRow label="Season" value={idea.season} />
                <ReviewRow label="Completion Date" value={completeDate ? formatDate(completeDate) : '—'} />
              </div>
            </>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/20 text-3xl text-success">
                ✓
              </div>
              <h3 className="text-large font-semibold">Build Complete!</h3>
              <p className="text-small text-default-500">
                Item <strong className="text-foreground">{createdItemId}</strong> created.
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
              <Button color="primary" onPress={goToStep2}>
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
                Complete Build
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
                Back to Ideas
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
