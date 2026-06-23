/**
 * useReceiptExtractor — shared React primitive for AI receipt upload + multi-item
 * cost review. Sub-agnostic port of the CDN `receipt-extractor-widget.js` (#382).
 *
 * Owns the whole flow as an internal phase machine + orchestration:
 *   pick file → (PDF → rasterize) → presign → S3 PUT → AI extract → review → confirm.
 * `<ReceiptExtractorModal>` is the HeroUI presentation that drives this hook; a sub
 * can also build its own UI on the returned state.
 *
 * Pipeline note: receipt upload is NOT the photo-upload pipeline (`usePhotoUpload`).
 * It presigns with `context:'receipt'` + `x-amz-tagging: confirmed=false`, **skips**
 * `/admin/images/confirm` (the AI-extract Lambda registers the image), and appends
 * the extract step. Keep it self-contained here.
 *
 * Caller injects everything sub-specific — `costConfig`, `caches`, `extractEndpoint`,
 * `contextData` — so the primitive stays usable by finance now and maintenance/ideas
 * later with only a different config.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { rasterizePdfToImage } from '../lib/rasterizePdf';

// ─── Public contract (mirrors the CDN widget's open(config)) ──────────────────

/** A select option — either a bare string or a `{ value, label }` pair. */
export type ReceiptExtractorOption = string | { value: string; label: string };

/** Per-cost-type related-entity wiring (which cache to search and how to display it). */
export interface ReceiptExtractorRelatedConfig {
  /** The confirmed-item field this populates, e.g. `related_item_id`. */
  field: 'related_item_id' | 'related_record_id' | 'related_idea_id' | string;
  /** Human label, e.g. "Related Item". */
  label: string;
  /** Whether the field is required — a bool or a predicate of the item's category. */
  required: boolean | ((category: string) => boolean);
  /** Entity fields to match the search query against. Defaults to `['id']`. */
  searchFields?: string[];
  /** Optional `entity.class` allow-list (e.g. items filtered to decoration/light). */
  classFilter?: string[];
  /** Source endpoint — unused by the primitive (caller pre-loads caches); allowed. */
  endpoint?: string;
}

export interface ReceiptExtractorCostConfig {
  costTypes: ReceiptExtractorOption[];
  categoriesByCostType: Record<string, ReceiptExtractorOption[]>;
  subcategories: Record<string, string[]>;
  relatedIdConfig: Record<string, ReceiptExtractorRelatedConfig | null>;
}

/** Pre-loaded entity caches the consumer supplies; the primitive fetches nothing. */
export interface ReceiptExtractorCaches {
  items?: Record<string, unknown>[];
  records?: Record<string, unknown>[];
  ideas?: Record<string, unknown>[];
}

export interface ReceiptExtractorContextData {
  item_id?: string;
  record_id?: string;
  cost_type?: string;
  category?: string;
}

/** The per-item payload handed to `onComplete` (no finance-specific fields). */
export interface ReceiptExtractorConfirmedItem {
  item_name: string;
  description: string;
  cost_type: string;
  category: string;
  subcategory: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  manufacturer: string;
  vendor: string;
  purchase_date: string;
  related_item_id: string;
  related_record_id: string;
  related_idea_id: string;
  extraction_id: string;
  image_id: string;
}

export interface ReceiptExtractorConfig {
  /** Base API URL, e.g. `https://api.spookydecs.com` (or `/devapi` locally). */
  apiEndpoint: string;
  /** AI-extract path, e.g. `/finance/costs/ai-extract`. */
  extractEndpoint: string;
  /** Seed values forwarded to the extract call and used to pre-link items. */
  contextData?: ReceiptExtractorContextData;
  costConfig: ReceiptExtractorCostConfig;
  caches?: ReceiptExtractorCaches;
  /** Called with the selected, validated items once the user confirms. */
  onComplete?: (items: ReceiptExtractorConfirmedItem[]) => void;
  /** Called when the user dismisses the flow. */
  onCancel?: () => void;
}

// ─── Internal state ───────────────────────────────────────────────────────────

export type ReceiptExtractorPhase =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'review'
  | 'error';

/** A review-phase item: the extracted fields plus UI state (selection, errors, displays). */
export interface ReceiptReviewItem extends Record<string, unknown> {
  item_name?: string;
  description?: string;
  cost_type?: string;
  category?: string;
  subcategory?: string;
  quantity?: number | string;
  unit_cost?: number | string;
  total_cost?: number | string;
  manufacturer?: string;
  related_item_id?: string;
  related_record_id?: string;
  related_idea_id?: string;
  selected: boolean;
  errors: Record<string, string>;
}

interface ReceiptMeta {
  vendor?: string;
  purchase_date?: string;
  receipt_total?: number;
}

const VALID_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

/** Accepts string[] or {value,label}[] — normalizes to {value,label}[]. */
function normalizeOptions(
  arr: ReceiptExtractorOption[] | undefined,
): { value: string; label: string }[] {
  return (arr || []).map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
}

export interface UseReceiptExtractor {
  phase: ReceiptExtractorPhase;
  /** 0–100 progress during upload/extract. */
  progress: number;
  /** Status line shown during upload/extract. */
  processingText: string;
  /** Populated when phase === 'error'. */
  error: { title: string; message: string } | null;
  items: ReceiptReviewItem[];
  receiptMeta: ReceiptMeta;
  selectedCount: number;
  selectedTotal: number;
  /** Reset to the idle/upload phase (call when the modal opens). */
  reset: () => void;
  /** Validate + (if OK) ingest a picked file through the upload→extract pipeline. */
  handleFile: (file: File) => Promise<void>;
  /** Dismiss back to the upload phase after a recoverable error. */
  dismissError: () => void;
  // Review-phase mutations
  toggleSelected: (index: number, selected: boolean) => void;
  changeCostType: (index: number, costType: string) => void;
  changeCategory: (index: number, category: string) => void;
  changeField: (index: number, field: string, value: string) => void;
  selectRelated: (index: number, entityId: string) => void;
  clearRelated: (index: number) => void;
  // Review-phase derived helpers (presentation-agnostic)
  categoriesFor: (costType: string) => { value: string; label: string }[];
  costTypeOptions: () => { value: string; label: string }[];
  subcategoriesFor: (category: string) => string[];
  relatedConfigFor: (costType: string) => ReceiptExtractorRelatedConfig | null;
  relatedRequiredFor: (costType: string, category: string) => boolean;
  /** Full, uncapped option list for a cost type — HeroUI <Autocomplete> filters client-side. */
  relatedOptionsAllFor: (costType: string) => { id: string; primary: string; secondary: string }[];
  /** Validate all selected items; on success fire onComplete and return true. */
  confirm: () => boolean;
  /** Invoke the caller's onCancel. */
  cancel: () => void;
}

export function useReceiptExtractor(config: ReceiptExtractorConfig): UseReceiptExtractor {
  const { buildHeaders } = useAuth();
  const { showError } = useToast();
  const [phase, setPhase] = useState<ReceiptExtractorPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [processingText, setProcessingText] = useState('');
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [items, setItems] = useState<ReceiptReviewItem[]>([]);
  const [receiptMeta, setReceiptMeta] = useState<ReceiptMeta>({});

  // Extraction provenance, attached to every confirmed item.
  const extractionRef = useRef<{ extraction_id: string; image_id: string }>({
    extraction_id: '',
    image_id: '',
  });

  // Keep the latest config available to stable callbacks without re-creating them.
  const configRef = useRef(config);
  configRef.current = config;

  const reset = useCallback(() => {
    setPhase('idle');
    setProgress(0);
    setProcessingText('');
    setError(null);
    setItems([]);
    setReceiptMeta({});
    extractionRef.current = { extraction_id: '', image_id: '' };
  }, []);

  // ─── cache / related-entity helpers ─────────────────────────────────────────

  const cacheForCostType = useCallback((costType: string): Record<string, unknown>[] => {
    const { caches = {}, costConfig } = configRef.current;
    const related = costConfig.relatedIdConfig?.[costType];
    if (!related) return [];
    let cache: Record<string, unknown>[];
    if (related.field === 'related_item_id') cache = caches.items || [];
    else if (related.field === 'related_record_id') cache = caches.records || [];
    else if (related.field === 'related_idea_id') cache = caches.ideas || [];
    else cache = [];
    if (related.classFilter?.length) {
      cache = cache.filter((e) => related.classFilter!.includes(e.class as string));
    }
    return cache;
  }, []);

  const entityDisplay = useCallback(
    (entity: Record<string, unknown>, costType: string): { primary: string; secondary: string; id: string } => {
      const related = configRef.current.costConfig.relatedIdConfig?.[costType];
      const s = (v: unknown) => (v == null ? '' : String(v));
      if (!related) return { primary: s(entity.id), secondary: '', id: s(entity.id) };
      if (related.field === 'related_item_id') {
        return { primary: s(entity.short_name || entity.id), secondary: s(entity.id), id: s(entity.id) };
      }
      if (related.field === 'related_record_id') {
        return {
          primary: s(entity.record_id),
          secondary: s(entity.short_description || entity.item_id || ''),
          id: s(entity.record_id),
        };
      }
      if (related.field === 'related_idea_id') {
        return {
          primary: s(entity.title || entity.idea_name || entity.name || entity.id),
          secondary: s(entity.id),
          id: s(entity.id),
        };
      }
      return { primary: s(entity.id), secondary: '', id: s(entity.id) };
    },
    [],
  );

  // ─── upload → extract pipeline ──────────────────────────────────────────────

  const uploadAndProcess = useCallback(
    async (file: File): Promise<{ extraction_id: string; image_id: string; receipt_metadata?: ReceiptMeta; items?: Record<string, unknown>[] }> => {
      const { apiEndpoint, extractEndpoint, contextData = {} } = configRef.current;
      const headers = buildHeaders();

      // Step 1 — presign (receipt context, confirmed=false; NOT the photo pipeline).
      setProcessingText('Preparing upload...');
      setProgress(40);
      const presignRes = await fetch(`${apiEndpoint}/admin/images/presign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          context: 'receipt',
          photo_type: 'receipt',
          season: 'shared',
          files: [{ filename: file.name, content_type: file.type, file_size: file.size }],
        }),
      });
      if (!presignRes.ok) throw new Error(`Presign failed: ${presignRes.status}`);
      const presignJson = await presignRes.json();
      const presignData = presignJson?.success && presignJson?.data ? presignJson.data : presignJson;
      const upload = presignData.uploads[0];

      // Step 2 — S3 PUT. x-amz-tagging required: the presign URL is signed with it.
      setProcessingText('Uploading to cloud...');
      setProgress(60);
      const s3Res = await fetch(upload.presigned_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'x-amz-tagging': 'confirmed=false' },
        body: file,
      });
      if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);

      // Step 3 — AI extraction (Lambda registers the image itself; no /confirm).
      setPhase('extracting');
      setProcessingText('AI Data Extraction In Progress...');
      setProgress(80);
      const extractRes = await fetch(`${apiEndpoint}${extractEndpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          s3_key: upload.s3_key,
          extraction_id: upload.extraction_id,
          file_name: file.name,
          file_type: file.type,
          item_id: contextData.item_id || null,
          record_id: contextData.record_id || null,
          cost_type: contextData.cost_type || null,
          category: contextData.category || null,
        }),
      });
      if (!extractRes.ok) {
        const body = await extractRes.text();
        const msg = body.toLowerCase().includes('overloaded')
          ? 'overloaded'
          : `AI extraction failed: ${extractRes.status}`;
        throw new Error(msg);
      }
      const extractJson = await extractRes.json();
      return extractJson?.success && extractJson?.data ? extractJson.data : extractJson;
    },
    [buildHeaders],
  );

  /** Map raw extracted items into review items, pre-linking the context record. */
  const mapItems = useCallback((raw: Record<string, unknown>[]): ReceiptReviewItem[] => {
    const { contextData = {}, caches = {} } = configRef.current;
    const contextRecordId = contextData.record_id;
    return raw.map((item) => {
      const mapped: ReceiptReviewItem = { ...item, selected: true, errors: {} };
      const costType = mapped.cost_type as string | undefined;

      if (
        contextRecordId &&
        costType &&
        ['repair', 'maintenance'].includes(costType) &&
        !mapped.related_record_id
      ) {
        const record = (caches.records || []).find((r) => r.record_id === contextRecordId);
        mapped.related_record_id = contextRecordId;
        mapped.related_record_id_display = record
          ? String(record.short_description || record.record_id)
          : contextRecordId;
        if (record?.item_id) mapped.related_item_id = String(record.item_id);
        else if (contextData.item_id) mapped.related_item_id = contextData.item_id;
      }

      if (mapped.related_record_id && !mapped.related_record_id_display) {
        const record = (caches.records || []).find((r) => r.record_id === mapped.related_record_id);
        mapped.related_record_id_display = record
          ? String(record.short_description || record.record_id)
          : mapped.related_record_id;
      }

      return mapped;
    });
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!VALID_FILE_TYPES.includes(file.type)) {
        showError('Invalid file type. Please upload a PDF or image file.');
        return;
      }
      setPhase('uploading');
      setError(null);
      setProgress(0);
      try {
        let processed = file;
        if (file.type === 'application/pdf') {
          setProcessingText('Converting PDF to image...');
          processed = await rasterizePdfToImage(file);
        }
        setProcessingText('Uploading receipt...');
        setProgress(30);

        const result = await uploadAndProcess(processed);

        setProgress(100);
        setProcessingText('Complete!');
        extractionRef.current = {
          extraction_id: result.extraction_id,
          image_id: result.image_id,
        };
        setReceiptMeta(result.receipt_metadata || {});
        setItems(mapItems(result.items || []));
        setPhase('review');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const overloaded =
          message.toLowerCase().includes('overloaded') ||
          message.toLowerCase().includes('temporarily unavailable');
        if (overloaded) {
          setError({
            title: 'Receipt AI is temporarily unavailable.',
            message: 'Please try again in a few minutes, or close this and enter the cost details manually.',
          });
        } else {
          setError({ title: 'Failed to process receipt', message });
        }
        setPhase('error');
      }
    },
    [uploadAndProcess, mapItems, showError],
  );

  const dismissError = useCallback(() => {
    setError(null);
    setPhase('idle');
  }, []);

  // ─── review-phase mutations ─────────────────────────────────────────────────

  const mutateItem = useCallback((index: number, fn: (item: ReceiptReviewItem) => void) => {
    setItems((prev) => {
      const next = prev.map((it, i) => (i === index ? { ...it } : it));
      fn(next[index]);
      return next;
    });
  }, []);

  const toggleSelected = useCallback(
    (index: number, selected: boolean) => mutateItem(index, (it) => { it.selected = selected; }),
    [mutateItem],
  );

  const changeCostType = useCallback(
    (index: number, costType: string) => {
      const { costConfig } = configRef.current;
      mutateItem(index, (it) => {
        const oldConfig = costConfig.relatedIdConfig?.[it.cost_type as string];
        const newConfig = costConfig.relatedIdConfig?.[costType];
        if (oldConfig && oldConfig.field !== newConfig?.field) {
          it[oldConfig.field] = '';
          it[`${oldConfig.field}_display`] = '';
        }
        it.cost_type = costType;
        const validCats = normalizeOptions(costConfig.categoriesByCostType[costType] || []);
        if (!validCats.find((c) => c.value === it.category)) {
          it.category = validCats[0]?.value || '';
        }
      });
    },
    [mutateItem],
  );

  const changeCategory = useCallback(
    (index: number, category: string) => {
      const { costConfig } = configRef.current;
      mutateItem(index, (it) => {
        it.category = category;
        if (!costConfig.subcategories[category]) it.subcategory = '';
      });
    },
    [mutateItem],
  );

  const changeField = useCallback(
    (index: number, field: string, value: string) => mutateItem(index, (it) => { it[field] = value; }),
    [mutateItem],
  );

  const selectRelated = useCallback(
    (index: number, entityId: string) => {
      const costType = items[index]?.cost_type as string;
      const related = configRef.current.costConfig.relatedIdConfig?.[costType];
      if (!related) return;
      const entity = cacheForCostType(costType).find(
        (e) => entityDisplay(e, costType).id === entityId,
      );
      if (!entity) return;
      const { primary } = entityDisplay(entity, costType);
      mutateItem(index, (it) => {
        it[related.field] = entityId;
        it[`${related.field}_display`] = primary;
        if (related.field === 'related_record_id' && entity.item_id) {
          it.related_item_id = String(entity.item_id);
        }
      });
    },
    [items, cacheForCostType, entityDisplay, mutateItem],
  );

  const clearRelated = useCallback(
    (index: number) => {
      const costType = items[index]?.cost_type as string;
      const related = configRef.current.costConfig.relatedIdConfig?.[costType];
      if (!related) return;
      mutateItem(index, (it) => {
        it[related.field] = '';
        it[`${related.field}_display`] = '';
        if (related.field === 'related_record_id') it.related_item_id = '';
      });
    },
    [items, mutateItem],
  );

  // ─── review-phase derived helpers ───────────────────────────────────────────

  const costTypeOptions = useCallback(
    () => normalizeOptions(configRef.current.costConfig.costTypes),
    [],
  );
  const categoriesFor = useCallback(
    (costType: string) => normalizeOptions(configRef.current.costConfig.categoriesByCostType[costType] || []),
    [],
  );
  const subcategoriesFor = useCallback(
    (category: string) => (category && configRef.current.costConfig.subcategories[category]) || [],
    [],
  );
  const relatedConfigFor = useCallback(
    (costType: string) => configRef.current.costConfig.relatedIdConfig?.[costType] || null,
    [],
  );
  const relatedRequiredFor = useCallback((costType: string, category: string): boolean => {
    const related = configRef.current.costConfig.relatedIdConfig?.[costType];
    if (!related) return false;
    return typeof related.required === 'function' ? related.required(category) : related.required;
  }, []);

  const relatedOptionsAllFor = useCallback(
    (costType: string) => {
      const related = configRef.current.costConfig.relatedIdConfig?.[costType];
      if (!related) return [];
      return cacheForCostType(costType).map((e) => entityDisplay(e, costType));
    },
    [cacheForCostType, entityDisplay],
  );

  // ─── confirm / cancel ───────────────────────────────────────────────────────

  const validate = useCallback((list: ReceiptReviewItem[]): { valid: boolean; next: ReceiptReviewItem[] } => {
    const { costConfig } = configRef.current;
    let valid = true;
    const next = list.map((item) => {
      if (!item.selected) return { ...item, errors: {} };
      const errors: Record<string, string> = {};
      if (!item.cost_type) errors.cost_type = 'Required';
      if (!item.category) errors.category = 'Required';
      if (!item.total_cost || parseFloat(String(item.total_cost)) <= 0) {
        errors.total_cost = 'Must be greater than 0';
      }
      if (item.cost_type === 'acquisition' && !String(item.manufacturer || '').trim()) {
        errors.manufacturer = 'Required for acquisitions';
      }
      const related = costConfig.relatedIdConfig?.[item.cost_type as string];
      if (related) {
        const req =
          typeof related.required === 'function'
            ? related.required(item.category as string)
            : related.required;
        if (req && !item[related.field]) {
          errors[related.field] = `${related.label} is required`;
        }
      }
      if (Object.keys(errors).length > 0) valid = false;
      return { ...item, errors };
    });
    return { valid, next };
  }, []);

  const confirm = useCallback((): boolean => {
    const { valid, next } = validate(items);
    if (!valid) {
      setItems(next);
      return false;
    }
    const { extraction_id, image_id } = extractionRef.current;
    const meta = receiptMeta;
    const confirmed: ReceiptExtractorConfirmedItem[] = next
      .filter((i) => i.selected)
      .map((item) => ({
        item_name: String(item.item_name ?? ''),
        description: String(item.description ?? ''),
        cost_type: String(item.cost_type ?? ''),
        category: String(item.category ?? ''),
        subcategory: String(item.subcategory ?? ''),
        quantity: parseInt(String(item.quantity)) || 1,
        unit_cost: parseFloat(String(item.unit_cost)) || 0,
        total_cost: parseFloat(String(item.total_cost)),
        manufacturer: String(item.manufacturer ?? ''),
        vendor: meta.vendor || '',
        purchase_date: meta.purchase_date || '',
        related_item_id: String(item.related_item_id ?? ''),
        related_record_id: String(item.related_record_id ?? ''),
        related_idea_id: String(item.related_idea_id ?? ''),
        extraction_id,
        image_id,
      }));
    configRef.current.onComplete?.(confirmed);
    return true;
  }, [items, receiptMeta, validate]);

  const cancel = useCallback(() => {
    configRef.current.onCancel?.();
  }, []);

  const selectedCount = useMemo(() => items.filter((i) => i.selected).length, [items]);
  const selectedTotal = useMemo(
    () => items.filter((i) => i.selected).reduce((s, i) => s + (parseFloat(String(i.total_cost)) || 0), 0),
    [items],
  );

  return {
    phase,
    progress,
    processingText,
    error,
    items,
    receiptMeta,
    selectedCount,
    selectedTotal,
    reset,
    handleFile,
    dismissError,
    toggleSelected,
    changeCostType,
    changeCategory,
    changeField,
    selectRelated,
    clearRelated,
    categoriesFor,
    costTypeOptions,
    subcategoriesFor,
    relatedConfigFor,
    relatedRequiredFor,
    relatedOptionsAllFor,
    confirm,
    cancel,
  };
}
