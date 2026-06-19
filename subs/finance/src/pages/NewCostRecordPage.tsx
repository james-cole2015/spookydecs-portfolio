import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, Tabs, Tab } from '@heroui/react';
import { Sparkles } from 'lucide-react';
import {
  Breadcrumbs,
  PageHeader,
  useToast,
  useConfig,
  useAuth,
  ReceiptExtractorModal,
  type ReceiptExtractorConfirmedItem,
  type ReceiptExtractorCostConfig,
} from '@spookydecs/ui';
import { CostForm, type CostFormInitial } from '../components/CostForm';
import { CostReviewModal } from '../components/CostReviewModal';
import { PackPurchaseForm } from '../components/PackPurchaseForm';
import { createCost, updateImageAfterCostCreation } from '../api/financeApi';
import {
  COST_TYPES,
  CATEGORIES_BY_COST_TYPE,
  SUBCATEGORIES,
  RELATED_ID_CONFIG,
} from '../config/financeConfig';

const financeCostConfig: ReceiptExtractorCostConfig = {
  costTypes: COST_TYPES,
  categoriesByCostType: CATEGORIES_BY_COST_TYPE,
  subcategories: SUBCATEGORIES,
  relatedIdConfig: RELATED_ID_CONFIG,
};

// Fetch the caches the receipt-extractor widget needs (consumer-supplied).
async function loadWidgetDeps(apiEndpoint: string, headers: Record<string, string>) {
  const API_ENDPOINT = apiEndpoint;
  const [itemsRes, recordsRes, ideasRes] = await Promise.allSettled([
    fetch(`${API_ENDPOINT}/items`, { headers }),
    fetch(`${API_ENDPOINT}/admin/maintenance-records`, { headers }),
    fetch(`${API_ENDPOINT}/ideas`, { headers }),
  ]);
  const toArray = async (res: PromiseSettledResult<Response>, key: string): Promise<any[]> => {
    if (res.status !== 'fulfilled' || !res.value.ok) return [];
    const j = await res.value.json();
    const d = j?.data ?? j;
    const arr = d[key] ?? d;
    return Array.isArray(arr) ? arr : [];
  };
  const [items, records, ideas] = await Promise.all([
    toArray(itemsRes, 'items'),
    toArray(recordsRes, 'records'),
    toArray(ideasRes, 'ideas'),
  ]);
  return { API_ENDPOINT, items, records, ideas };
}

export default function NewCostRecordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { API_ENDPOINT } = useConfig();
  const { buildHeaders } = useAuth();
  const [params, setParams] = useSearchParams();

  const itemId = params.get('item_id') ?? undefined;
  const recordId = params.get('record_id') ?? undefined;
  const initialMode = params.get('mode') === 'pack' ? 'pack' : 'single';
  const [mode, setMode] = useState<'single' | 'pack'>(initialMode);

  const [reviewData, setReviewData] = useState<Record<string, any> | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoOpened = useRef(false);

  // Receipt-extractor modal (@spookydecs/ui primitive, #382). Caches are consumer-
  // loaded on open and handed to the modal; the primitive fetches nothing itself.
  const [extractorOpen, setExtractorOpen] = useState(false);
  const [loadingExtractor, setLoadingExtractor] = useState(false);
  const [caches, setCaches] = useState<{ items: any[]; records: any[]; ideas: any[] }>({
    items: [],
    records: [],
    ideas: [],
  });

  const contextData = {
    item_id: itemId,
    record_id: recordId,
    cost_type: params.get('cost_type') ?? undefined,
    category: params.get('category') ?? undefined,
  };

  const formInitial: CostFormInitial = {
    related_item_id: itemId,
    related_record_id: recordId,
    cost_type: params.get('cost_type') ?? undefined,
    category: params.get('category') ?? undefined,
  };

  const onWidgetComplete = async (confirmedItems: ReceiptExtractorConfirmedItem[]) => {
    if (!confirmedItems.length) return;
    const costRecords = confirmedItems.map((item) => ({
      ...item,
      value: item.total_cost,
      cost_date: item.purchase_date,
      currency: 'USD',
    }));
    const imageId = confirmedItems[0].image_id;
    let success = 0;
    let fail = 0;
    const createdIds: string[] = [];
    toast.showInfo(`Creating ${costRecords.length} cost record${costRecords.length > 1 ? 's' : ''}…`);
    for (const record of costRecords) {
      try {
        const result = await createCost(record);
        createdIds.push(result.cost_id);
        success++;
      } catch (err) {
        console.error('Failed to create record:', err);
        fail++;
      }
    }
    if (imageId && createdIds.length > 0) {
      try {
        await updateImageAfterCostCreation(imageId, createdIds);
      } catch (err) {
        console.error('Failed to update image:', err);
      }
    }
    if (fail === 0) {
      toast.showSuccess(`Successfully created ${success} cost record${success > 1 ? 's' : ''}`);
      setTimeout(() => navigate('/'), 1500);
    } else {
      toast.showWarning(`Created ${success} record${success > 1 ? 's' : ''}, ${fail} failed — check console`);
    }
  };

  const openReceiptWidget = async () => {
    setLoadingExtractor(true);
    try {
      const { items, records, ideas } = await loadWidgetDeps(API_ENDPOINT, buildHeaders());
      setCaches({ items, records, ideas });
      setExtractorOpen(true);
    } catch (err) {
      console.error('Failed to open receipt extractor:', err);
      toast.showError('Failed to open receipt extractor');
    } finally {
      setLoadingExtractor(false);
    }
  };

  // Auto-open the AI extractor when ?extract=true (single mode only), once.
  useEffect(() => {
    if (params.get('extract') === 'true' && mode === 'single' && !autoOpened.current) {
      autoOpened.current = true;
      openReceiptWidget();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManualSubmit = (formData: Record<string, any>) => {
    setReviewData(formData);
    setReviewOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!reviewData) return;
    setSaving(true);
    try {
      toast.showInfo('Saving cost record…');
      const result = await createCost(reviewData);
      if (reviewData.image_id && result?.cost_id) {
        try {
          await updateImageAfterCostCreation(reviewData.image_id, result.cost_id);
        } catch (err) {
          console.error('Failed to update image:', err);
        }
      }
      toast.showSuccess('Cost record created successfully');
      setTimeout(() => navigate('/'), 1200);
    } catch (err: any) {
      console.error('Failed to save cost record:', err);
      toast.showError(`Failed to save cost record: ${err.message}`);
      setSaving(false);
      setReviewOpen(false);
    }
  };

  const onModeChange = (key: string | number) => {
    const next = key === 'pack' ? 'pack' : 'single';
    setMode(next);
    const p = new URLSearchParams(params);
    if (next === 'pack') p.set('mode', 'pack');
    else p.delete('mode');
    setParams(p, { replace: true });
  };

  return (
    <div>
      <Breadcrumbs
        crumbs={[
          { label: 'Finance', to: '/' },
          { label: 'Cost Records', to: '/records' },
          { label: 'New Record' },
        ]}
      />
      <PageHeader
        title="Create Cost Record"
        subtitle="Track expenses for maintenance, repairs, and equipment"
        actions={
          mode === 'single' ? (
            <Button
              color="primary"
              startContent={<Sparkles size={16} />}
              onPress={openReceiptWidget}
              isLoading={loadingExtractor}
            >
              Extract with AI
            </Button>
          ) : undefined
        }
      />

      <Tabs
        aria-label="Entry mode"
        selectedKey={mode}
        onSelectionChange={onModeChange}
        className="mb-4"
        color="secondary"
      >
        <Tab key="single" title="Single Item" />
        <Tab key="pack" title="Pack Purchase" />
      </Tabs>

      <Card shadow="sm" className="bg-content1">
        <CardBody className="p-6">
          {mode === 'single' ? (
            <CostForm initial={formInitial} onSubmit={handleManualSubmit} onCancel={() => navigate('/')} />
          ) : (
            <PackPurchaseForm />
          )}
        </CardBody>
      </Card>

      <CostReviewModal
        cost={reviewData}
        isOpen={reviewOpen}
        isSaving={saving}
        onConfirm={handleConfirmSave}
        onClose={() => !saving && setReviewOpen(false)}
      />

      <ReceiptExtractorModal
        isOpen={extractorOpen}
        onClose={() => setExtractorOpen(false)}
        apiEndpoint={API_ENDPOINT}
        extractEndpoint="/finance/costs/ai-extract"
        contextData={contextData}
        costConfig={financeCostConfig}
        caches={caches}
        onComplete={onWidgetComplete}
        onCancel={() => {}}
      />
    </div>
  );
}
