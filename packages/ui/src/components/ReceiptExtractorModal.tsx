/**
 * ReceiptExtractorModal — HeroUI presentation for the AI receipt-extraction flow.
 * React port of the CDN `receipt-extractor-widget.js` review/upload modals (#382).
 *
 * Self-contained: render it with `isOpen` + the same config the CDN widget's
 * `open()` took (apiEndpoint, extractEndpoint, contextData, costConfig, caches,
 * onComplete, onCancel) and it drives `useReceiptExtractor` internally. The modal
 * body swaps on the hook's phase: upload → processing → review.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
  Select,
  SelectItem,
  Spinner,
  Textarea,
} from '@heroui/react';
import { ChevronDown, UploadCloud, X } from 'lucide-react';
import {
  useReceiptExtractor,
  type ReceiptExtractorConfig,
  type ReceiptReviewItem,
} from '../hooks/useReceiptExtractor';

export interface ReceiptExtractorModalProps extends ReceiptExtractorConfig {
  isOpen: boolean;
  /** Called when the modal should close (after confirm, cancel, or dismiss). */
  onClose: () => void;
}

const ACCEPT =
  'image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf';

function fmtCurrency(v: unknown): string {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '$0.00';
}

function fmtDate(d?: string): string {
  if (!d) return 'N/A';
  try {
    return new Date(`${d}T00:00:00`).toLocaleDateString();
  } catch {
    return d;
  }
}

export function ReceiptExtractorModal({ isOpen, onClose, ...config }: ReceiptExtractorModalProps) {
  const rx = useReceiptExtractor(config);
  const { phase, reset } = rx;

  // Fresh state each time the modal opens.
  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  const handleDismiss = () => {
    rx.cancel();
    onClose();
  };

  const handleConfirm = () => {
    if (rx.confirm()) onClose();
  };

  const inReview = phase === 'review';

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleDismiss(); }}
      size={inReview ? '4xl' : '2xl'}
      scrollBehavior="inside"
      isDismissable={phase !== 'uploading' && phase !== 'extracting'}
    >
      <ModalContent>
        {inReview ? (
          <ReviewBody rx={rx} onConfirm={handleConfirm} onCancel={handleDismiss} />
        ) : (
          <UploadBody rx={rx} onCancel={handleDismiss} />
        )}
      </ModalContent>
    </Modal>
  );
}

// ─── Upload / processing / error phase ────────────────────────────────────────

function UploadBody({
  rx,
  onCancel,
}: {
  rx: ReturnType<typeof useReceiptExtractor>;
  onCancel: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const busy = rx.phase === 'uploading' || rx.phase === 'extracting';

  const onPick = (files: FileList | null) => {
    if (files && files.length > 0) rx.handleFile(files[0]);
  };

  return (
    <>
      <ModalHeader className="flex-col items-start gap-0">
        <h2 className="text-xl font-semibold">Upload Receipt</h2>
      </ModalHeader>
      <ModalBody className="min-h-[320px] justify-center pb-6">
        {rx.phase === 'error' && rx.error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-8 text-center">
            <p className="text-base font-semibold">{rx.error.title}</p>
            <p className="text-sm text-default-500">{rx.error.message}</p>
            <Button variant="flat" onPress={rx.dismissError}>
              Try Again
            </Button>
          </div>
        ) : busy ? (
          <div className="flex flex-col items-center justify-center gap-6 px-6 py-10 text-center">
            <Spinner size="lg" color="primary" />
            <p className="text-base font-medium">{rx.processingText || 'Processing…'}</p>
            <Progress
              aria-label="Upload progress"
              value={rx.progress}
              className="max-w-xs"
              color="primary"
            />
          </div>
        ) : (
          <label
            htmlFor="rx-file-input"
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed px-8 py-12 text-center transition-colors ${
              dragOver ? 'border-primary bg-primary/10' : 'border-default-300 hover:border-primary'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onPick(e.dataTransfer.files);
            }}
          >
            <UploadCloud size={56} className="text-default-400" />
            <p className="text-lg">
              <span className="font-semibold text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-default-400">PDF or Image files (JPEG, PNG, GIF, WebP)</p>
            <input
              id="rx-file-input"
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
            />
          </label>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="flat" onPress={onCancel} isDisabled={busy}>
          Cancel
        </Button>
      </ModalFooter>
    </>
  );
}

// ─── Review phase ─────────────────────────────────────────────────────────────

function ReviewBody({
  rx,
  onConfirm,
  onCancel,
}: {
  rx: ReturnType<typeof useReceiptExtractor>;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { items, receiptMeta, selectedCount, selectedTotal } = rx;
  const confirmLabel = `Create ${selectedCount} Cost ${selectedCount === 1 ? 'Record' : 'Records'}`;

  return (
    <>
      <ModalHeader className="flex-col items-start gap-0">
        <h2 className="text-xl font-semibold">Review Extracted Items</h2>
        <p className="text-sm text-default-500">
          {items.length === 1 ? '1 item' : `${items.length} items`} detected from receipt
        </p>
      </ModalHeader>
      <ModalBody>
        <div className="mb-2 flex flex-wrap gap-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-3 text-white">
          <SummaryItem label="Vendor" value={receiptMeta.vendor || 'N/A'} />
          <SummaryItem label="Date" value={fmtDate(receiptMeta.purchase_date)} />
          <SummaryItem label="Receipt Total" value={fmtCurrency(receiptMeta.receipt_total)} />
          <SummaryItem
            label="Selected"
            value={`${selectedCount}/${items.length} (${fmtCurrency(selectedTotal)})`}
            highlight
          />
        </div>
        <div className="flex flex-col gap-4">
          {items.map((item, i) => (
            <ItemCard key={i} rx={rx} item={item} index={i} />
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="flat" onPress={onCancel}>
          Go Back
        </Button>
        <Button color="primary" onPress={onConfirm} isDisabled={selectedCount === 0}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </>
  );
}

function SummaryItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-white/80">{label}</span>
      <span className={highlight ? 'text-lg font-semibold text-amber-300' : 'font-semibold'}>{value}</span>
    </div>
  );
}

function ItemCard({
  rx,
  item,
  index,
}: {
  rx: ReturnType<typeof useReceiptExtractor>;
  item: ReceiptReviewItem;
  index: number;
}) {
  const hasErrors = Object.keys(item.errors || {}).length > 0;
  const [expanded, setExpanded] = useState(hasErrors);

  // Keep error cards open after a failed confirm.
  useEffect(() => {
    if (hasErrors) setExpanded(true);
  }, [hasErrors]);

  const costType = (item.cost_type as string) || '';
  const category = (item.category as string) || '';
  const subcats = rx.subcategoriesFor(category);
  const related = rx.relatedConfigFor(costType);
  const relatedRequired = related ? rx.relatedRequiredFor(costType, category) : false;
  const relatedField = related?.field;
  const currentRelatedId = relatedField ? (item[relatedField] as string) || '' : '';
  const currentRelatedDisplay = relatedField
    ? ((item[`${relatedField}_display`] as string) || currentRelatedId)
    : '';

  return (
    <div
      className={`overflow-hidden rounded-lg border-2 transition-colors ${
        hasErrors ? 'border-danger bg-danger-50' : 'border-default-200'
      } ${!item.selected ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex flex-1 items-center gap-3">
          <Checkbox
            isSelected={item.selected}
            onValueChange={(v) => rx.toggleSelected(index, v)}
            aria-label="Include item"
          />
          <div className="flex flex-1 items-center justify-between gap-3">
            <span className="font-semibold">{(item.item_name as string) || 'Unnamed Item'}</span>
            <span className="whitespace-nowrap font-bold text-success">{fmtCurrency(item.total_cost)}</span>
          </div>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onPress={() => setExpanded((e) => !e)}
        >
          <ChevronDown size={18} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 gap-4 border-t border-default-200 p-4 sm:grid-cols-2">
          <Select
            label="Cost Type"
            selectedKeys={costType ? [costType] : []}
            onSelectionChange={(keys) => rx.changeCostType(index, String(Array.from(keys)[0] ?? ''))}
            isInvalid={!!item.errors?.cost_type}
            errorMessage={item.errors?.cost_type}
          >
            {rx.costTypeOptions().map((o) => (
              <SelectItem key={o.value}>{o.label}</SelectItem>
            ))}
          </Select>

          <Select
            label="Category"
            selectedKeys={category ? [category] : []}
            onSelectionChange={(keys) => rx.changeCategory(index, String(Array.from(keys)[0] ?? ''))}
            isInvalid={!!item.errors?.category}
            errorMessage={item.errors?.category}
          >
            {rx.categoriesFor(costType).map((o) => (
              <SelectItem key={o.value}>{o.label}</SelectItem>
            ))}
          </Select>

          {subcats.length > 0 && (
            <Select
              label="Subcategory"
              selectedKeys={item.subcategory ? [item.subcategory as string] : []}
              onSelectionChange={(keys) => rx.changeField(index, 'subcategory', String(Array.from(keys)[0] ?? ''))}
            >
              {subcats.map((s) => (
                <SelectItem key={s}>{s}</SelectItem>
              ))}
            </Select>
          )}

          <Input
            type="number"
            label="Quantity"
            min={1}
            step={1}
            value={String(item.quantity ?? 1)}
            onValueChange={(v) => rx.changeField(index, 'quantity', v)}
          />
          <Input
            type="number"
            label="Unit Cost"
            min={0}
            step={0.01}
            value={String(item.unit_cost ?? 0)}
            onValueChange={(v) => rx.changeField(index, 'unit_cost', v)}
          />
          <Input
            type="number"
            label="Total Cost"
            min={0}
            step={0.01}
            value={String(item.total_cost ?? 0)}
            onValueChange={(v) => rx.changeField(index, 'total_cost', v)}
            isInvalid={!!item.errors?.total_cost}
            errorMessage={item.errors?.total_cost}
          />

          {related && relatedField && (
            <div className="sm:col-span-2">
              <RelatedSelector
                key={`${index}-${costType}-${relatedField}`}
                label={related.label}
                required={relatedRequired}
                initialDisplay={currentRelatedDisplay}
                hasValue={!!currentRelatedId}
                error={item.errors?.[relatedField]}
                getOptions={(q) => rx.relatedOptionsFor(costType, q)}
                onSelect={(id) => rx.selectRelated(index, id)}
                onClear={() => rx.clearRelated(index)}
              />
            </div>
          )}

          {costType === 'acquisition' && (
            <Input
              className="sm:col-span-2"
              label="Manufacturer"
              isRequired
              placeholder="e.g. Home Depot, Spirit Halloween"
              value={(item.manufacturer as string) || ''}
              onValueChange={(v) => rx.changeField(index, 'manufacturer', v)}
              isInvalid={!!item.errors?.manufacturer}
              errorMessage={item.errors?.manufacturer}
            />
          )}

          <Textarea
            className="sm:col-span-2"
            label="Description"
            minRows={2}
            value={(item.description as string) || ''}
            onValueChange={(v) => rx.changeField(index, 'description', v)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Related-entity autocomplete (search → dropdown → select/clear) ───────────

function RelatedSelector({
  label,
  required,
  initialDisplay,
  hasValue,
  error,
  getOptions,
  onSelect,
  onClear,
}: {
  label: string;
  required: boolean;
  initialDisplay: string;
  hasValue: boolean;
  error?: string;
  getOptions: (query: string) => { id: string; primary: string; secondary: string }[];
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState(initialDisplay);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(hasValue);

  const options = useMemo(() => (open ? getOptions(query === initialDisplay && selected ? '' : query) : []), [
    open,
    query,
    selected,
    initialDisplay,
    getOptions,
  ]);

  return (
    <div className="relative">
      <Input
        label={`${label}${required ? '' : ' (Optional)'}`}
        isRequired={required}
        placeholder={`Search ${label.toLowerCase()}s…`}
        value={query}
        autoComplete="off"
        isInvalid={!!error}
        errorMessage={error}
        onValueChange={(v) => {
          setQuery(v);
          setSelected(false);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        endContent={
          selected ? (
            <button
              type="button"
              aria-label="Clear"
              className="text-default-400 hover:text-danger"
              onMouseDown={(e) => {
                e.preventDefault();
                onClear();
                setSelected(false);
                setQuery('');
              }}
            >
              <X size={16} />
            </button>
          ) : null
        }
      />
      {open && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-medium border border-default-200 bg-content1 shadow-medium">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-center text-sm text-default-400">No results found</div>
          ) : (
            options.map((o) => (
              <button
                key={o.id}
                type="button"
                className="flex w-full items-center justify-between gap-2 border-b border-default-100 px-3 py-2 text-left last:border-b-0 hover:bg-default-100"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(o.id);
                  setQuery(o.primary);
                  setSelected(true);
                  setOpen(false);
                }}
              >
                <span className="font-medium">{o.primary}</span>
                {o.secondary && <Chip size="sm" variant="flat" className="font-mono text-xs">{o.secondary}</Chip>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
