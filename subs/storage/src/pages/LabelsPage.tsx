import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Input } from '@heroui/react';
import { Printer, Plus, X, GripVertical, FilePlus2 } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Breadcrumbs, PageHeader, LoadingState, ErrorState, EmptyState, Typography, SeasonChip } from '@spookydecs/ui';
import { storageAPI } from '../api/storageApi';
import type { StorageUnit } from '../config/storageConfig';
import { LabelTemplate, LABEL_H_IN, LABEL_W_IN } from '../components/LabelTemplate';
import { AVERY_5889 } from '../lib/averySheet';
import { readQueue, writeQueue } from '../lib/labelQueue';
import type { LabelItem } from '../lib/labelContents';

const POOL_PREFIX = 'pool:';
const ITEM_PREFIX = 'item:';
const SLOT_PREFIX = 'slot:';
const POOL_DROP = 'pool-drop';
const PREVIEW_SCALE = 0.7;
const PER_PAGE = AVERY_5889.perPage;
const SLOT_NAMES = ['Top', 'Bottom'];

interface Offsets {
  x: number;
  y: number;
  gap: number;
  inset: number; // safe inset from the card edge, so content stays inside the perforation
}
// Defaults come from Avery's template. These are *adjustments* people tune per printer,
// so the inputs show the absolute position but start at the template values.
// inset 0.125in: a torn card measured ~5.95 x 3.9in from a photo of a real print (#707), i.e. the perforation
// sits ~0.03-0.05in inside Avery's 6x4 outline; the rest covers printer drift. Re-measure with a ruler to tighten.
const DEFAULT_OFFSETS: Offsets = { x: AVERY_5889.left, y: AVERY_5889.top, gap: AVERY_5889.gap, inset: 0.125 };
const OFFSETS_KEY = 'storage.labelOffsets.v4';

function loadOffsets(): Offsets {
  try {
    const raw = localStorage.getItem(OFFSETS_KEY);
    if (raw) return { ...DEFAULT_OFFSETS, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable — use defaults */
  }
  return DEFAULT_OFFSETS;
}

const slotTop = (base: number, i: number, gap: number) => base + i * (LABEL_H_IN + gap);

/** Slots are the model: index 2n = top card of sheet n, 2n+1 = bottom. null = blank card. */
function normalize(slots: (string | null)[]): (string | null)[] {
  const out = [...slots];
  while (out.length < PER_PAGE || out.length % PER_PAGE !== 0) out.push(null);
  return out;
}

function PoolRow({ unit, onAdd, disabled }: { unit: StorageUnit; onAdd: () => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: POOL_PREFIX + unit.id });
  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 rounded-lg border border-default-200 p-2 ${isDragging ? 'opacity-40' : ''} ${disabled ? 'opacity-60' : ''}`}
      data-testid={`pool-${unit.id}`}
    >
      <button type="button" className="cursor-grab text-default-400" aria-label={`Drag ${unit.short_name}`} {...attributes} {...listeners}>
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <Typography type="body-sm" as="div" className="truncate text-foreground">{unit.short_name}</Typography>
        <Typography type="body-xs" as="div" className="truncate text-default-500">{unit.id}{disabled ? ' · on sheet' : ''}</Typography>
      </div>
      <SeasonChip value={String(unit.season ?? '')} label={String(unit.season ?? '—')} />
      <Button isIconOnly size="sm" variant="flat" isDisabled={disabled} aria-label={`Add ${unit.short_name}`} onPress={onAdd}>
        <Plus size={16} />
      </Button>
    </div>
  );
}

/** One card position on a sheet: a drop target; when filled, also draggable to another slot. */
function SheetSlot({
  index,
  unit,
  contents,
  inset,
  offsets,
  onRemove,
}: {
  index: number;
  unit: StorageUnit | null;
  contents: LabelItem[] | null;
  inset: number;
  offsets: Offsets;
  onRemove: () => void;
}) {
  const ci = index % PER_PAGE;
  const drop = useDroppable({ id: SLOT_PREFIX + index });
  const drag = useDraggable({ id: ITEM_PREFIX + index, disabled: !unit });
  return (
    <div
      ref={(node) => {
        drop.setNodeRef(node);
        drag.setNodeRef(node);
      }}
      className={`absolute ${drag.isDragging ? 'opacity-40' : ''} ${unit ? '' : `border-2 border-dashed ${drop.isOver ? 'border-primary bg-primary-50' : 'border-default-300'}`} ${unit && drop.isOver ? 'outline outline-4 outline-primary' : ''}`}
      style={{
        left: `${offsets.x}in`,
        top: `${slotTop(offsets.y, ci, offsets.gap)}in`,
        width: `${LABEL_W_IN}in`,
        height: `${LABEL_H_IN}in`,
      }}
      data-testid={`slot-${index}`}
    >
      {unit ? (
        <>
          <LabelTemplate unit={unit} contents={contents} inset={inset} />
          <div className="absolute right-[0.1in] top-[0.1in] flex gap-[0.08in]">
            <button
              type="button"
              className="flex h-[0.4in] w-[0.4in] cursor-grab items-center justify-center rounded bg-neutral-900/80 text-white"
              aria-label={`Move ${unit.short_name}`}
              {...drag.attributes}
              {...drag.listeners}
            >
              <GripVertical className="h-[0.28in] w-[0.28in]" />
            </button>
            <button
              type="button"
              className="flex h-[0.4in] w-[0.4in] items-center justify-center rounded bg-neutral-900/80 text-white"
              aria-label={`Remove ${unit.short_name}`}
              data-testid={`remove-${unit.id}`}
              onClick={onRemove}
            >
              <X className="h-[0.28in] w-[0.28in]" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex h-full items-center justify-center text-[16pt] text-neutral-500">
          Blank card · drop a label here
        </div>
      )}
    </div>
  );
}

/** Real-size print pages: only pages that have at least one label, blank slots left empty. */
function PrintPages({
  slots,
  byId,
  offsets,
  contentsById,
}: {
  slots: (string | null)[];
  byId: Map<string, StorageUnit>;
  offsets: Offsets;
  contentsById: Record<string, LabelItem[]>;
}) {
  const pages: (StorageUnit | null)[][] = [];
  for (let i = 0; i < slots.length; i += PER_PAGE) {
    const page = slots.slice(i, i + PER_PAGE).map((id) => (id ? byId.get(id) ?? null : null));
    if (page.some(Boolean)) pages.push(page);
  }
  return (
    <>
      {pages.map((page, pi) => (
        <div
          key={pi}
          className="print-page"
          style={{
            breakAfter: pi === pages.length - 1 ? 'auto' : 'page',
            position: 'relative',
            width: `${AVERY_5889.pageW}in`,
            height: `${AVERY_5889.pageH}in`,
            overflow: 'hidden',
          }}
        >
          {page.map(
            (u, ci) =>
              u && (
                <div key={u.id} className="absolute" style={{ left: `${offsets.x}in`, top: `${slotTop(offsets.y, ci, offsets.gap)}in` }}>
                  <LabelTemplate unit={u} contents={contentsById[u.id] ?? []} inset={offsets.inset} />
                </div>
              ),
          )}
        </div>
      ))}
    </>
  );
}

function PoolDrop({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_DROP });
  return (
    <div ref={setNodeRef} className={`flex flex-col gap-2 rounded-lg ${isOver ? 'bg-danger-50 ring-2 ring-danger' : ''}`}>
      {children}
    </div>
  );
}

export default function LabelsPage() {
  const [searchParams] = useSearchParams();
  const [units, setUnits] = useState<StorageUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<(string | null)[]>(normalize([]));
  const [contentsById, setContentsById] = useState<Record<string, LabelItem[]>>({});
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [offsets, setOffsets] = useState<Offsets>(loadOffsets);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const filledIds = useMemo(() => slots.filter((s): s is string => Boolean(s)), [slots]);

  async function loadUnits() {
    setLoading(true);
    setError(null);
    try {
      const all = await storageAPI.getAll();
      setUnits(all);
      // Queue (from detail pages) plus a deep link from elsewhere: /storage/labels?ids=A,B
      const preset = (searchParams.get('ids') ?? '').split(',').filter(Boolean);
      const ids = [...new Set([...readQueue(), ...preset])].filter((id) => all.some((u) => u.id === id));
      setSlots(normalize(ids));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load storage units');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUnits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The queue mirrors what is on the sheet (positions are session-only; blanks are not saved).
  useEffect(() => {
    if (!loading) writeQueue(filledIds);
  }, [filledIds, loading]);

  // Contents come from the unit detail endpoint (contents_details); fetch once per unit on the sheet.
  useEffect(() => {
    const missing = filledIds.filter((id) => !(id in contentsById));
    if (missing.length === 0) return;
    let live = true;
    missing.forEach(async (id) => {
      try {
        const unit = await storageAPI.getById(id);
        const details = (unit?.contents_details as LabelItem[] | undefined) ?? [];
        if (live) setContentsById((prev) => ({ ...prev, [id]: details }));
      } catch {
        if (live) setContentsById((prev) => ({ ...prev, [id]: [] }));
      }
    });
    return () => {
      live = false;
    };
  }, [filledIds, contentsById]);

  function updateOffset(key: keyof Offsets, value: string) {
    const next = { ...offsets, [key]: Number(value) || 0 };
    setOffsets(next);
    try {
      localStorage.setItem(OFFSETS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  const byId = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const pool = useMemo(() => {
    const q = search.trim().toLowerCase();
    return units.filter((u) => !q || `${u.short_name} ${u.id} ${u.season}`.toLowerCase().includes(q));
  }, [units, search]);

  // Sheets that will actually print = those holding at least one label.
  const sheetCount = Math.ceil(slots.length / PER_PAGE);
  const printSheets = Array.from({ length: sheetCount }, (_, p) => slots.slice(p * PER_PAGE, p * PER_PAGE + PER_PAGE)).filter((pg) =>
    pg.some(Boolean),
  ).length;
  const blankSlots = printSheets * PER_PAGE - filledIds.length;

  const place = (id: string, at?: number) =>
    setSlots((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev];
      const target = at ?? next.indexOf(null);
      if (target >= 0 && target < next.length) next[target] = id;
      else next.push(id);
      return normalize(next);
    });

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const from = String(active.id);
    const to = String(over.id);

    if (from.startsWith(POOL_PREFIX)) {
      const id = from.slice(POOL_PREFIX.length);
      if (!to.startsWith(SLOT_PREFIX)) return;
      const j = Number(to.slice(SLOT_PREFIX.length));
      setSlots((prev) => {
        const next = prev.map((s) => (s === id ? null : s)); // moving an already-placed label
        next[j] = id; // anything that was in the slot returns to the list
        return normalize(next);
      });
      return;
    }

    if (from.startsWith(ITEM_PREFIX)) {
      const i = Number(from.slice(ITEM_PREFIX.length));
      if (to === POOL_DROP) {
        setSlots((prev) => prev.map((s, k) => (k === i ? null : s)));
      } else if (to.startsWith(SLOT_PREFIX)) {
        const j = Number(to.slice(SLOT_PREFIX.length));
        if (i === j) return;
        setSlots((prev) => {
          const next = [...prev];
          [next[i], next[j]] = [next[j], next[i]]; // swap, so a blank target just moves the label
          return next;
        });
      }
    }
  }

  const activeUnit = (() => {
    if (!activeId) return null;
    if (activeId.startsWith(POOL_PREFIX)) return byId.get(activeId.slice(POOL_PREFIX.length)) ?? null;
    if (activeId.startsWith(ITEM_PREFIX)) {
      const id = slots[Number(activeId.slice(ITEM_PREFIX.length))];
      return id ? byId.get(id) ?? null : null;
    }
    return null;
  })();

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Storage', to: '/' }, { label: 'Totes', to: '/storage' }, { label: 'Print labels' }]} />
      <PageHeader
        title="Print Labels"
        icon={<Printer size={26} />}
        actions={
          <Button color="primary" variant="shadow" startContent={<Printer size={18} />} isDisabled={filledIds.length === 0} onPress={() => window.print()} data-testid="print-labels">
            Print {filledIds.length > 0 ? `(${filledIds.length})` : ''}
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading storage units…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadUnits} />
      ) : units.length === 0 ? (
        <EmptyState title="No storage units" message="Create a unit first." />
      ) : (
        <>
          <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[20rem_1fr]">
              <div className="flex flex-col gap-2">
                <Input size="sm" placeholder="Search units" value={search} onValueChange={setSearch} aria-label="Search units" />
                <Typography type="body-xs" className="text-default-500">Drag a unit onto a card slot, or press +. Drop a placed label here to take it off the sheet.</Typography>
                <PoolDrop>
                  <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
                    {pool.map((u) => (
                      <PoolRow key={u.id} unit={u} disabled={filledIds.includes(u.id)} onAdd={() => place(u.id)} />
                    ))}
                  </div>
                </PoolDrop>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Typography type="body-sm" className="text-default-500">
                    {filledIds.length} label{filledIds.length === 1 ? '' : 's'} · {printSheets} sheet{printSheets === 1 ? '' : 's'} to print
                  </Typography>
                  <Button size="sm" variant="flat" startContent={<FilePlus2 size={16} />} onPress={() => setSlots((p) => normalize([...p, null, null]))} data-testid="add-sheet">
                    Add sheet
                  </Button>
                  {filledIds.length > 0 && (
                    <Button size="sm" variant="light" color="danger" className="ml-auto" onPress={() => setSlots(normalize([]))} data-testid="clear-sheet">
                      Clear
                    </Button>
                  )}
                </div>
                {filledIds.length > 0 && blankSlots > 0 && (
                  <Typography type="body-xs" className="text-warning-600" data-testid="blank-note">
                    {blankSlots === 1 ? '1 card slot stays' : `${blankSlots} card slots stay`} blank across {printSheets} sheet{printSheets === 1 ? '' : 's'}.
                  </Typography>
                )}

                <div className="flex flex-wrap gap-6 rounded-xl bg-default-100 p-4" data-testid="label-sheet">
                  {Array.from({ length: sheetCount }, (_, p) => (
                    <div key={p}>
                      <Typography type="body-xs" className="mb-1 text-default-500">Sheet {p + 1} · top edge is at the top</Typography>
                      <div style={{ width: `${AVERY_5889.pageW * PREVIEW_SCALE}in`, height: `${AVERY_5889.pageH * PREVIEW_SCALE}in` }}>
                        <div
                          className="relative bg-white shadow-lg"
                          style={{
                            width: `${AVERY_5889.pageW}in`,
                            height: `${AVERY_5889.pageH}in`,
                            transform: `scale(${PREVIEW_SCALE})`,
                            transformOrigin: 'top left',
                          }}
                          data-testid={`preview-page-${p}`}
                        >
                          {Array.from({ length: PER_PAGE }, (_, ci) => (
                            <div key={`g${ci}`}>
                              <div
                                className="absolute border border-dashed border-primary"
                                style={{
                                  left: `${AVERY_5889.left}in`,
                                  top: `${slotTop(AVERY_5889.top, ci, AVERY_5889.gap)}in`,
                                  width: `${LABEL_W_IN}in`,
                                  height: `${LABEL_H_IN}in`,
                                }}
                              >
                                <div className="absolute border border-dotted border-danger" style={{ inset: `${offsets.inset}in` }} />
                              </div>
                              <div
                                className="absolute text-[12pt] text-neutral-500"
                                style={{ left: `${AVERY_5889.left}in`, top: `${slotTop(AVERY_5889.top, ci, AVERY_5889.gap) - 0.3}in` }}
                              >
                                {SLOT_NAMES[ci]} card
                              </div>
                            </div>
                          ))}
                          {Array.from({ length: PER_PAGE }, (_, ci) => {
                            const index = p * PER_PAGE + ci;
                            const id = slots[index];
                            const unit = id ? byId.get(id) ?? null : null;
                            return (
                              <SheetSlot
                                key={index}
                                index={index}
                                unit={unit}
                                contents={id ? contentsById[id] ?? null : null}
                                inset={offsets.inset}
                                offsets={offsets}
                                onRemove={() => setSlots((prev) => prev.map((s, k) => (k === index ? null : s)))}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Typography type="body-xs" className="text-default-500">
                  Dashed blue = Avery 5889 card outline. Dotted red = safe area (content stays inside it, clear of the perforation). To reuse a half sheet, put your labels in the cards that are still attached and leave the others blank.
                </Typography>

                <details className="rounded-lg border border-default-200 p-3">
                  <summary className="cursor-pointer text-sm text-foreground">Print alignment (inches)</summary>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {(['x', 'y', 'gap', 'inset'] as const).map((k) => (
                      <Input
                        key={k}
                        size="sm"
                        type="number"
                        step="0.05"
                        className="w-28"
                        label={k === 'x' ? 'Left' : k === 'y' ? 'Top' : k === 'gap' ? 'Gap' : 'Safe inset'}
                        value={String(offsets[k])}
                        onValueChange={(v) => updateOffset(k, v)}
                      />
                    ))}
                  </div>
                  <Typography type="body-xs" className="mt-2 text-default-500">
                    Defaults are Avery's 5889 template (1.25 in left and top, 0.5 in gap). Print at 100% scale with margins set to none; adjust only if the card edges drift on your printer.
                  </Typography>
                </details>
              </div>
            </div>
            <DragOverlay>
              {activeUnit ? (
                <div className="rounded-lg border border-default-300 bg-content1 p-2 text-sm shadow-lg">{activeUnit.short_name}</div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Print-only: real-size pages, blank slots left empty. Everything else is hidden by index.css @media print. */}
          <div className="print-area hidden print:block" aria-hidden>
            <PrintPages slots={slots} byId={byId} offsets={offsets} contentsById={contentsById} />
          </div>
        </>
      )}
    </div>
  );
}
