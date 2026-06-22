import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Radio,
  RadioGroup,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Progress,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  type Selection,
} from '@heroui/react';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { PageHeader, LoadingState, ErrorState, EmptyState, Typography, Breadcrumbs, useToast } from '@spookydecs/ui';
import { scheduleAPI, itemsAPI } from '../api/maintenanceApi';
import {
  formatFrequency,
  getTaskTypeIcon,
  getCategoryLabel,
  generateSeasonBuckets,
  type ScheduleTemplate,
  type Item,
} from '../config/maintenanceConfig';

const normalizeClassType = (ct?: string) => (ct || '').toUpperCase().replace(/\s+/g, '_');

function appliedTemplates(item: Item): string[] {
  const m = (item.maintenance as any) || {};
  return [...(m.inspection_data?.applied_templates || []), ...(m.maintenance_data?.applied_templates || [])];
}

interface ApplyResult {
  items_updated: number;
  records_created: number;
  warnings?: string[];
  errors?: string[];
  details: Array<{ item_id: string; status: string; records_created?: number; error?: string; reason?: string }>;
}

export default function TemplateApplicationPage() {
  const { id: preSelectedId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(preSelectedId ? 2 : 1);
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [template, setTemplate] = useState<ScheduleTemplate | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState(false);

  const [selectedKeys, setSelectedKeys] = useState<Selection>(new Set());
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [done, setDone] = useState(false);

  const bucketOptions = useMemo(() => generateSeasonBuckets([]), []);

  // Load templates (and resolve preselected).
  useEffect(() => {
    (async () => {
      try {
        const list = await scheduleAPI.getAll({ enabled: 'true' });
        setTemplates(list);
        if (preSelectedId) {
          const found = list.find((t) => t.schedule_id === preSelectedId) || null;
          if (!found) {
            toast.showError('Template not found');
            navigate('/schedules');
            return;
          }
          setTemplate(found);
        }
      } catch (err) {
        console.error('Failed to load templates:', err);
        setError(true);
      } finally {
        setLoadingTemplates(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load items when entering step 2 with a chosen template.
  useEffect(() => {
    if (step !== 2 || !template) return;
    (async () => {
      try {
        setLoadingItems(true);
        const all = await itemsAPI.getAll();
        const target = normalizeClassType(template.class_type);
        const matching = all.filter(
          (item) =>
            normalizeClassType(item.class_type as string) === target &&
            item.class !== 'Deployment' &&
            item.class !== 'Storage',
        );
        setItems(matching);
        setSelectedKeys(new Set());
      } catch (err) {
        console.error('Failed to load items:', err);
        setError(true);
      } finally {
        setLoadingItems(false);
      }
    })();
  }, [step, template]);

  const eligibleItems = useMemo(
    () => items.filter((item) => !appliedTemplates(item).includes(template?.schedule_id || '')),
    [items, template],
  );
  const alreadyApplied = useMemo(
    () => items.filter((item) => appliedTemplates(item).includes(template?.schedule_id || '')),
    [items, template],
  );

  const classTypeOptions = useMemo(
    () => [...new Set(eligibleItems.map((i) => i.class_type as string).filter(Boolean))].sort(),
    [eligibleItems],
  );

  const visibleItems = useMemo(() => {
    const s = search.toLowerCase();
    return eligibleItems.filter((item) => {
      const idStr = ((item.id || item.item_id) as string)?.toLowerCase() || '';
      const name = ((item.short_name || item.name) as string)?.toLowerCase() || '';
      const matchesSearch = !s || idStr.includes(s) || name.includes(s);
      const matchesClass = classFilter === 'all' || item.class_type === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [eligibleItems, search, classFilter]);

  const selectedIds = useMemo(
    () => (selectedKeys === 'all' ? visibleItems.map((i) => (i.id || i.item_id) as string) : Array.from(selectedKeys as Set<string>)),
    [selectedKeys, visibleItems],
  );

  const handleApply = async () => {
    if (!template) return;
    try {
      setApplying(true);
      const res = await scheduleAPI.applyToItems(template.schedule_id, {
        item_ids: selectedIds,
        start_date: startDate || null,
      });
      setResult((res?.data || res) as ApplyResult);
      setDone(true);
    } catch (err) {
      console.error('Failed to apply template:', err);
      toast.showError((err as Error).message || 'Failed to apply template');
    } finally {
      setApplying(false);
    }
  };

  if (loadingTemplates) return <LoadingState />;
  if (error) return <ErrorState message="Something went wrong loading the wizard." />;

  // Step labels differ when a template is preselected (step 1 is skipped).
  const stepLabels = preSelectedId ? ['Select Items', 'Review', 'Results'] : ['Select Template', 'Select Items', 'Review', 'Results'];
  const stepIndex = done ? stepLabels.length - 1 : preSelectedId ? step - 2 : step - 1;

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs crumbs={[{ label: 'Maintenance', to: '/' }, { label: 'Templates', to: '/schedules' }, { label: 'Apply' }]} />
      <PageHeader title="Apply Template to Items" />
      <Progress
        aria-label="Wizard progress"
        size="sm"
        value={((stepIndex + 1) / stepLabels.length) * 100}
        className="mb-2"
      />
      <div className="mb-6 flex flex-wrap gap-2 text-tiny text-default-500">
        {stepLabels.map((label, i) => (
          <Chip key={label} size="sm" variant={i === stepIndex ? 'solid' : 'flat'} color={i <= stepIndex ? 'primary' : 'default'}>
            {i + 1}. {label}
          </Chip>
        ))}
      </div>

      {/* STEP 1 — Select template */}
      {!done && step === 1 && (
        <Card>
          <CardHeader>
            <Typography type="h5">Select a Template</Typography>
          </CardHeader>
          <CardBody>
            {templates.length === 0 ? (
              <EmptyState title="No Templates Available" message="Create an enabled template first." />
            ) : (
              <RadioGroup value={template?.schedule_id || ''} onValueChange={(val) => setTemplate(templates.find((t) => t.schedule_id === val) || null)}>
                {templates.map((t) => (
                  <Radio key={t.schedule_id} value={t.schedule_id}>
                    <span className="flex items-center gap-2">
                      {t.title}
                      {t.is_default && (
                        <Chip size="sm" color="primary" variant="flat">
                          Default
                        </Chip>
                      )}
                      <span className="text-tiny text-default-500">
                        {t.class_type} · {getTaskTypeIcon((t.record_type || (t as any).task_type) as string)}{' '}
                        {getCategoryLabel((t.record_type || (t as any).task_type) as string)} · {formatFrequency(t.frequency, t.season)}
                      </span>
                    </span>
                  </Radio>
                ))}
              </RadioGroup>
            )}
            <div className="mt-4 flex gap-2">
              <Button variant="flat" onPress={() => navigate('/schedules')}>
                Cancel
              </Button>
              <Button color="primary" isDisabled={!template} onPress={() => setStep(2)}>
                Next Step
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* STEP 2 — Select items */}
      {!done && step === 2 && template && (
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <Typography type="h5">Select Items</Typography>
            <span className="text-tiny text-default-500">
              Template: <strong>{template.title}</strong>{' '}
              <Chip size="sm" variant="flat">
                {template.class_type}
              </Chip>
            </span>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            {loadingItems ? (
              <LoadingState />
            ) : eligibleItems.length === 0 ? (
              <EmptyState
                title="No eligible items"
                message={`All ${template.class_type} items already have this template applied.`}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-3">
                  <Input
                    aria-label="Search items"
                    placeholder="Search items…"
                    className="max-w-xs"
                    value={search}
                    onValueChange={setSearch}
                    isClearable
                  />
                  <Select aria-label="Class type" className="w-44" selectedKeys={[classFilter]} onChange={(e) => setClassFilter(e.target.value || 'all')}>
                    {[{ value: 'all', label: 'All Types' }, ...classTypeOptions.map((c) => ({ value: c, label: c }))].map((o) => (
                      <SelectItem key={o.value}>{o.label}</SelectItem>
                    ))}
                  </Select>
                  <span className="text-tiny text-default-500">{selectedIds.length} selected</span>
                </div>

                <Table
                  aria-label="Selectable items"
                  selectionMode="multiple"
                  selectedKeys={selectedKeys}
                  onSelectionChange={setSelectedKeys}
                >
                  <TableHeader>
                    <TableColumn>Item ID</TableColumn>
                    <TableColumn>Name</TableColumn>
                    <TableColumn>Other Templates</TableColumn>
                  </TableHeader>
                  <TableBody items={visibleItems} emptyContent="No items match the filters">
                    {(item) => {
                      const others = appliedTemplates(item).length;
                      return (
                        <TableRow key={(item.id || item.item_id) as string}>
                          <TableCell>
                            <span className="font-mono text-tiny">{(item.id || item.item_id) as string}</span>
                          </TableCell>
                          <TableCell>{(item.short_name || item.name || 'Unnamed Item') as string}</TableCell>
                          <TableCell>{others > 0 ? `${others} other template(s)` : 'No templates yet'}</TableCell>
                        </TableRow>
                      );
                    }}
                  </TableBody>
                </Table>

                {alreadyApplied.length > 0 && (
                  <p className="text-tiny text-default-400">
                    {alreadyApplied.length} item(s) already have this template (hidden).
                  </p>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button
                variant="flat"
                startContent={<ArrowLeft size={16} />}
                onPress={() => (preSelectedId ? navigate('/schedules') : setStep(1))}
              >
                Back
              </Button>
              <Button color="primary" isDisabled={selectedIds.length === 0} onPress={() => setStep(3)}>
                Next Step
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* STEP 3 — Review & confirm */}
      {!done && step === 3 && template && (
        <Card>
          <CardHeader>
            <Typography type="h5">Review & Confirm</Typography>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div>
              <Typography type="h6">Template</Typography>
              <p>
                <strong>{template.title}</strong> — {getCategoryLabel((template.record_type || (template as any).task_type) as string)} ·{' '}
                {formatFrequency(template.frequency, template.season)}
              </p>
            </div>

            <Select
              label="Start Season (optional)"
              description="Leave blank to start records immediately."
              className="max-w-sm"
              selectedKeys={startDate ? [startDate] : []}
              onChange={(e) => setStartDate(e.target.value)}
            >
              {bucketOptions.map((b) => (
                <SelectItem key={b}>{b}</SelectItem>
              ))}
            </Select>

            <div className="rounded-medium bg-default-100 p-3 text-tiny text-default-600">
              <ul className="list-disc pl-5">
                <li>Template will be added to {selectedIds.length} item(s)</li>
                <li>{selectedIds.length * 2} maintenance records will be created (2 per item)</li>
                <li>Records will follow work window rules</li>
              </ul>
            </div>

            <div>
              <Typography type="h6" className="mb-1">
                Items to Update ({selectedIds.length})
              </Typography>
              <div className="flex flex-wrap gap-1">
                {selectedIds.map((itemId) => (
                  <Chip key={itemId} size="sm" variant="flat">
                    {itemId}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="flat" startContent={<ArrowLeft size={16} />} onPress={() => setStep(2)}>
                Back
              </Button>
              <Button color="primary" isLoading={applying} onPress={handleApply}>
                Apply Template
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Results */}
      {done && result && (
        <Card>
          <CardBody className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle2 size={48} className="text-success" />
            <Typography type="h4">Template Applied Successfully!</Typography>
            <div className="flex gap-6">
              <div>
                <Typography type="h3">{result.items_updated}</Typography>
                <Typography type="body-xs" className="text-default-500">
                  items updated
                </Typography>
              </div>
              <div>
                <Typography type="h3">{result.records_created}</Typography>
                <Typography type="body-xs" className="text-default-500">
                  records created
                </Typography>
              </div>
            </div>

            {!!result.warnings?.length && (
              <div className="w-full max-w-md rounded-medium bg-warning-50 p-3 text-left text-tiny text-warning-700">
                <strong>⚠️ Warnings</strong>
                <ul className="list-disc pl-5">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!result.errors?.length && (
              <div className="w-full max-w-md rounded-medium bg-danger-50 p-3 text-left text-tiny text-danger-700">
                <strong>❌ Errors</strong>
                <ul className="list-disc pl-5">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="flat" onPress={() => navigate(`/schedules/${template?.schedule_id}`)}>
                View Template Detail
              </Button>
              <Button color="primary" onPress={() => navigate('/schedules')}>
                Done
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
